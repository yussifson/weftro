import { powerSync } from '@/api/PowerSyncConnector';
import { invokeCloudflareAi } from '@/lib/cloudflareAI';

export async function answerNLQuery(workspaceId, question, vertical) {
  const { intent, entity, metric, period } = await classifyIntent(question);

  if (intent === 'unknown') {
    return {
      answer: "I don't have enough context to answer that from your data. Try asking about specific records, counts, totals, or trends.",
      data: null,
      visualization: 'none',
      confidence: 0,
    };
  }

  const periodFilter = getPeriodFilter(period);
  let data = null;
  let rawNumbers = {};

  if (intent === 'count_filtered' || intent === 'recent_activity') {
    const tableName = entityToTable(entity, vertical);
    if (tableName) {
      let query = `SELECT count(*) as count FROM ${tableName} WHERE company_id = ?`;
      const params = [workspaceId];
      if (periodFilter) {
        query += ` AND created_at >= ?`;
        params.push(periodFilter);
      }
      try {
        const res = await powerSync.execute(query, params);
        rawNumbers = { count: res.rows._array[0].count, entity, period };
      } catch (err) {}
    }
  }

  if (intent === 'top_performers') {
    const tableName = entityToTable(entity, vertical);
    if (tableName) {
      try {
        const orderBy = metric && metric !== '' ? metric : 'created_at';
        // Assume all tables have a created_at or we fallback
        const res = await powerSync.execute(
          `SELECT * FROM ${tableName} WHERE company_id = ? ORDER BY ${orderBy} DESC LIMIT 5`,
          [workspaceId]
        );
        data = res.rows._array;
        rawNumbers = { topItems: data?.length, metric };
      } catch(err) {}
    }
  }

  if (intent === 'at_risk_items') {
    try {
      const res = await powerSync.execute(
        `SELECT title, body, entity_id, entity_type FROM workspace_insights WHERE company_id = ? AND insight_type = 'risk' AND is_dismissed = 0 LIMIT 10`,
        [workspaceId]
      );
      data = res.rows._array;
      rawNumbers = { count: data?.length || 0 };
    } catch(err) {}
  }

  if (intent === 'overdue_items') {
    const tableName = entityToTable(entity, vertical);
    if (tableName) {
      try {
        // Assume tables might have due_date or status. If not, this might fail gracefully.
        const res = await powerSync.execute(
          `SELECT * FROM ${tableName} WHERE company_id = ? AND status IN ('open', 'pending', 'unpaid') LIMIT 10`,
          [workspaceId]
        );
        data = res.rows._array;
        rawNumbers = { count: data.length, entity };
      } catch(err) {}
    }
  }

  // Generate natural language answer
  const answer = await invokeCloudflareAi(
    `The user asked: "${question}"
     Based on the following real data from their ${vertical || 'business'} system, give a direct, specific answer in 1-3 sentences.
     If the data is empty or missing, say so honestly. Never invent numbers.
     
     Data Context:
     ${JSON.stringify({ intent, entity, metric, period, rawNumbers, sampleData: data?.slice(0, 3) })}`,
    ""
  );

  const answerText = typeof answer === 'string' ? answer : (answer?.response || answer?.text || JSON.stringify(answer));

  return {
    answer: answerText,
    data,
    visualization: intent === 'top_performers' ? 'table'
      : intent === 'count_filtered' ? 'number'
      : intent === 'at_risk_items' ? 'list'
      : 'none',
    confidence: 75,
  };
}

async function classifyIntent(question) {
  const prompt = `Classify this question into a structured intent. Return ONLY a JSON object.
    
    Question: "${question}"
    
    Return format:
    {
      "intent": one of [top_performers, bottom_performers, period_comparison, count_filtered, sum_filtered, trend_over_time, at_risk_items, overdue_items, recent_activity, unknown],
      "entity": the main data entity (e.g. "cases", "patients", "employees", "orders", "students", "invoices"),
      "metric": what to measure (e.g. "amount", "count", "performance"),
      "period": time period if mentioned (e.g. "this month", "last 6 months", "this year", ""),
      "filters": []
    }`;
    
  const response = await invokeCloudflareAi(prompt, "");
  const text = typeof response === 'string' ? response : (response?.response || response?.text || JSON.stringify(response));

  try {
    const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
    return JSON.parse(jsonStr);
  } catch {
    return { intent: 'unknown', entity: '', metric: '', period: '', filters: [] };
  }
}

function getPeriodFilter(period) {
  if (!period) return null;
  const now = Date.now();
  if (period.includes('this month')) return new Date(new Date().setDate(1)).toISOString();
  if (period.includes('last month')) return new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString();
  if (period.includes('this year')) return new Date(new Date().setMonth(0, 1)).toISOString();
  if (period.includes('6 months')) return new Date(now - 180 * 24 * 60 * 60 * 1000).toISOString();
  if (period.includes('last 7 days') || period.includes('this week')) return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  if (period.includes('today')) return new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  return null;
}

function entityToTable(entity, vertical) {
  const e = (entity || '').toLowerCase();
  const map = {
    cases: 'cases', patients: 'patients', students: 'students',
    employees: 'employees', orders: 'retail_orders', bookings: 'hotel_bookings',
    invoices: 'univ_invoices', claims: 'insurance_claims', policies: 'insurance_policies',
    members: 'congregation_members', deliveries: 'logistics_deliveries',
    products: 'products', rooms: 'rooms',
  };
  return map[e] || null;
}
