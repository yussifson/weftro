// src/lib/intelligence/engines/real-estate.js
// Real Estate Intelligence Engine — property valuation, market trends, agent performance, lease analysis
import { generateInsight } from '@/lib/intelligence/engine';
import { powerSync } from '@/api/PowerSyncConnector';

const VERTICAL = 'real-estate';

async function safeExec(sql, params = []) {
  try {
    const res = await powerSync.execute(sql, params);
    return res.rows?._array || (res.rows ? Array.from(res.rows) : []);
  } catch (err) {
    console.warn('[RE Intelligence safeExec] Query warning:', err.message);
    return [];
  }
}

// ────────────────────────────────────────────────────────
// Property Valuation Prediction
// ────────────────────────────────────────────────────────
async function propertyValuationPrediction(companyId) {
  const insights = [];

  const properties = await safeExec(
    `SELECT id, address, city, property_type, bedrooms, bathrooms, 
            square_feet, price, year_built, status
     FROM univ_re_properties
     WHERE company_id = ? AND status = 'active'
     ORDER BY created_at DESC
     LIMIT 100`,
    [companyId]
  );

  if (properties.length === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'summary',
      insight_key: 're_valuation_no_data',
      title: 'Property Intelligence Building',
      body: 'No active properties found in the catalog. Valuation analysis will begin once property data is available.',
      severity: 'info',
    }];
  }

  // Calculate average price per square foot by property type
  const pricePerSqFt = {};
  for (const p of properties) {
    if (!pricePerSqFt[p.property_type]) pricePerSqFt[p.property_type] = [];
    if (p.square_feet > 0) {
      pricePerSqFt[p.property_type].push(Number(p.price) / Number(p.square_feet));
    }
  }

  // Find overpriced and underpriced properties
  const anomalies = [];
  for (const p of properties) {
    if (p.square_feet > 0 && pricePerSqFt[p.property_type]) {
      const avgRate = pricePerSqFt[p.property_type].reduce((a, b) => a + b, 0) / pricePerSqFt[p.property_type].length;
      const currentRate = Number(p.price) / Number(p.square_feet);
      const deviation = ((currentRate - avgRate) / avgRate) * 100;
      
      if (Math.abs(deviation) > 15) {
        anomalies.push({
          address: p.address,
          type: deviation > 0 ? 'overpriced' : 'underpriced',
          deviation: Math.abs(deviation).toFixed(1),
          price: p.price,
          pricePerSqFt: currentRate.toFixed(2),
        });
      }
    }
  }

  if (anomalies.length === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'positive',
      insight_key: 're_pricing_healthy',
      title: 'Market Pricing Aligned',
      body: `All ${properties.length} properties are competitively priced within market ranges. No valuation adjustments recommended.`,
      severity: 'positive',
      confidence: 0.85,
    }];
  }

  const overpriced = anomalies.filter(a => a.type === 'overpriced');
  const underpriced = anomalies.filter(a => a.type === 'underpriced');

  const aiBody = await generateInsight(
    `Analyze these property valuation anomalies and provide recommendations for pricing adjustments.`,
    {
      totalProperties: properties.length,
      overpricedCount: overpriced.length,
      underpricedCount: underpriced.length,
      topAnomalies: anomalies.slice(0, 5),
    }
  );

  insights.push({
    vertical: VERTICAL,
    insight_type: 'prediction',
    insight_key: 're_valuation_anomalies',
    title: `${anomalies.length} Properties with Pricing Anomalies Detected`,
    body: aiBody,
    severity: anomalies.length > 10 ? 'warning' : 'info',
    confidence: 0.82,
    data_snapshot: {
      totalProperties: properties.length,
      overpricedCount: overpriced.length,
      underpricedCount: underpriced.length,
      topAnomalies: anomalies.slice(0, 5),
    },
    action_label: 'Review Properties',
    action_url: '/real-estate/properties?filter=pricing-review',
  });

  return insights;
}

// ────────────────────────────────────────────────────────
// Buyer Readiness Scoring
// ────────────────────────────────────────────────────────
async function buyerReadinessScoring(companyId) {
  const insights = [];

  const buyers = await safeExec(
    `SELECT c.id, c.name, c.email, c.type, c.budget, 
            COUNT(v.id) as viewing_count, MAX(v.viewing_date) as last_viewing
     FROM univ_re_clients c
     LEFT JOIN univ_re_viewings v ON c.id = v.client_id
     WHERE c.company_id = ? AND c.type = 'buyer'
     GROUP BY c.id
     ORDER BY viewing_count DESC`,
    [companyId]
  );

  if (buyers.length === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'summary',
      insight_key: 're_buyers_no_data',
      title: 'Buyer Intelligence Building',
      body: 'No buyer records found. Buyer engagement analysis will begin once client data is available.',
      severity: 'info',
    }];
  }

  // Score buyers based on viewing activity and budget
  const scoredBuyers = buyers.map(b => {
    let score = 0;
    if (b.viewing_count >= 5) score += 30;
    else if (b.viewing_count >= 3) score += 20;
    else if (b.viewing_count >= 1) score += 10;
    
    if (b.budget && b.budget > 0) score += 20;
    if (b.last_viewing && new Date(b.last_viewing) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) score += 30;
    
    return { ...b, readiness_score: score };
  }).sort((a, b) => b.readiness_score - a.readiness_score);

  const highIntent = scoredBuyers.filter(b => b.readiness_score >= 60);
  const mediumIntent = scoredBuyers.filter(b => b.readiness_score >= 40 && b.readiness_score < 60);

  if (highIntent.length === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'info',
      insight_key: 're_buyer_readiness_low',
      title: 'Increase Buyer Engagement',
      body: `No high-intent buyers identified yet. Consider implementing targeted outreach campaigns.`,
      severity: 'info',
      confidence: 0.75,
    }];
  }

  const aiBody = await generateInsight(
    `Identify the most promising buyers for follow-up and recommend next steps to move them toward closing.`,
    {
      highIntentCount: highIntent.length,
      mediumIntentCount: mediumIntent.length,
      topBuyers: highIntent.slice(0, 5).map(b => ({ name: b.name, viewings: b.viewing_count, budget: b.budget })),
    }
  );

  insights.push({
    vertical: VERTICAL,
    insight_type: 'prediction',
    insight_key: 're_buyer_readiness',
    title: `${highIntent.length} High-Intent Buyers Ready for Follow-up`,
    body: aiBody,
    severity: 'positive',
    confidence: 0.88,
    data_snapshot: {
      highIntentCount: highIntent.length,
      mediumIntentCount: mediumIntent.length,
      topBuyers: highIntent.slice(0, 10),
    },
    action_label: 'View Buyers',
    action_url: '/real-estate/clients?filter=high-intent',
  });

  return insights;
}

// ────────────────────────────────────────────────────────
// Agent Performance Analytics
// Uses univ_re_transactions & univ_re_commissions & team members
// ────────────────────────────────────────────────────────
async function agentPerformanceAnalytics(companyId) {
  const insights = [];

  const agents = await safeExec(
    `SELECT t.agent_id, t.agent_name,
            COUNT(DISTINCT t.id) as transaction_count,
            COALESCE(SUM(t.sale_price), 0) as total_sales,
            COALESCE(SUM(cm.commission_amount), 0) as total_commissions
     FROM univ_re_transactions t
     LEFT JOIN univ_re_commissions cm ON t.id = cm.transaction_id
     WHERE t.company_id = ? AND (t.agent_id IS NOT NULL OR t.agent_name IS NOT NULL)
     GROUP BY t.agent_id, t.agent_name
     ORDER BY total_sales DESC`,
    [companyId]
  );

  if (agents.length === 0) {
    const team = await safeExec(
      `SELECT name, role FROM univ_re_team_members WHERE company_id = ?`,
      [companyId]
    );

    return [{
      vertical: VERTICAL,
      insight_type: 'summary',
      insight_key: 're_agent_no_data',
      title: 'Agent Performance Tracking',
      body: team.length > 0 
        ? `${team.length} agents registered on the team roster. Performance analytics will populate as transactions and viewings are closed.`
        : 'No agent transaction records found yet. Performance analytics will populate as agents engage with clients.',
      severity: 'info',
    }];
  }

  const topPerformers = agents.sort((a, b) => (Number(b.total_sales) || 0) - (Number(a.total_sales) || 0)).slice(0, 5);
  const avgSalesPerAgent = agents.reduce((sum, a) => sum + (Number(a.total_sales) || 0), 0) / agents.length;
  const underperformers = agents.filter(a => (Number(a.total_sales) || 0) < avgSalesPerAgent * 0.5);

  const aiBody = await generateInsight(
    `Analyze agent performance and recommend strategies for improvement. Identify best practices from top performers.`,
    {
      agentCount: agents.length,
      topPerformers: topPerformers.map(a => ({ name: a.agent_name || a.agent_id, sales: a.total_sales, commissions: a.total_commissions })),
      underperformerCount: underperformers.length,
    }
  );

  insights.push({
    vertical: VERTICAL,
    insight_type: 'analysis',
    insight_key: 're_agent_performance',
    title: `Agent Performance Report: ${topPerformers[0]?.agent_name || 'Team Leader'} Leading`,
    body: aiBody,
    severity: underperformers.length > 0 ? 'warning' : 'info',
    confidence: 0.85,
    data_snapshot: {
      agentCount: agents.length,
      topPerformers,
      avgSalesPerAgent: avgSalesPerAgent.toFixed(2),
      underperformerCount: underperformers.length,
    },
    action_label: 'View Agents',
    action_url: '/real-estate/analytics?view=agent-performance',
  });

  return insights;
}

// ────────────────────────────────────────────────────────
// Lease Renewal Risk
// ────────────────────────────────────────────────────────
async function leaseRenewalRisk(companyId) {
  const insights = [];

  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  const expiringLeases = await safeExec(
    `SELECT id, property_address, tenant_name, end_date, monthly_rent, status
     FROM univ_re_leases
     WHERE company_id = ? AND end_date >= ? AND end_date <= ? AND status = 'active'
     ORDER BY end_date ASC`,
    [companyId, today, thirtyDaysFromNow]
  );

  if (expiringLeases.length === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'positive',
      insight_key: 're_lease_renewal_clear',
      title: 'No Leases Expiring Soon',
      body: 'No leases are expiring within the next 30 days. Renewal planning is fully on track.',
      severity: 'positive',
      confidence: 0.95,
    }];
  }

  const renewalRevenue = expiringLeases.reduce((sum, l) => sum + (Number(l.monthly_rent) || 0) * 12, 0);

  const aiBody = await generateInsight(
    `Prioritize lease renewal outreach for these expiring leases to ensure continuity and revenue retention.`,
    {
      expiringCount: expiringLeases.length,
      annualRenewalRevenue: renewalRevenue,
      upcomingLeases: expiringLeases.slice(0, 5).map(l => ({ property: l.property_address, tenant: l.tenant_name, endDate: l.end_date })),
    }
  );

  insights.push({
    vertical: VERTICAL,
    insight_type: 'prediction',
    insight_key: 're_lease_renewal_risk',
    title: `${expiringLeases.length} Lease${expiringLeases.length > 1 ? 's' : ''} Expiring in 30 Days`,
    body: aiBody,
    severity: 'warning',
    confidence: 0.92,
    data_snapshot: {
      expiringCount: expiringLeases.length,
      annualRenewalRevenue: renewalRevenue.toFixed(2),
      topAtRisk: expiringLeases.slice(0, 10),
    },
    action_label: 'Manage Leases',
    action_url: '/real-estate/leases?filter=expiring-soon',
  });

  return insights;
}

// ────────────────────────────────────────────────────────
// Maintenance Priority Analysis
// ────────────────────────────────────────────────────────
async function maintenancePriorityAnalysis(companyId) {
  const insights = [];

  const maintenanceRequests = await safeExec(
    `SELECT id, property_address, issue_description, priority, status, cost, created_at
     FROM univ_re_maintenance_requests
     WHERE company_id = ? AND status IN ('open', 'in_progress')
     ORDER BY priority DESC, created_at ASC`,
    [companyId]
  );

  if (maintenanceRequests.length === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'positive',
      insight_key: 're_maintenance_clear',
      title: 'All Maintenance Current',
      body: 'No open maintenance requests. Properties are well-maintained.',
      severity: 'positive',
      confidence: 0.95,
    }];
  }

  const criticalIssues = maintenanceRequests.filter(m => m.priority === 'critical');
  const totalCost = maintenanceRequests.reduce((sum, m) => sum + (Number(m.cost) || 0), 0);

  const aiBody = await generateInsight(
    `Develop a maintenance prioritization strategy considering urgency, cost, and property impact.`,
    {
      totalRequests: maintenanceRequests.length,
      criticalCount: criticalIssues.length,
      estimatedCost: totalCost,
      topIssues: maintenanceRequests.slice(0, 5).map(m => ({ property: m.property_address, issue: m.issue_description, priority: m.priority })),
    }
  );

  insights.push({
    vertical: VERTICAL,
    insight_type: 'prediction',
    insight_key: 're_maintenance_priority',
    title: `${maintenanceRequests.length} Maintenance Request${maintenanceRequests.length > 1 ? 's' : ''} Pending${criticalIssues.length > 0 ? ` (${criticalIssues.length} Critical)` : ''}`,
    body: aiBody,
    severity: criticalIssues.length > 0 ? 'critical' : 'warning',
    confidence: 0.9,
    data_snapshot: {
      totalRequests: maintenanceRequests.length,
      criticalCount: criticalIssues.length,
      estimatedCost: totalCost.toFixed(2),
      topAtRisk: maintenanceRequests.slice(0, 10),
    },
    action_label: 'Manage Maintenance',
    action_url: '/real-estate/maintenance?filter=priority',
  });

  return insights;
}

// Export engine functions
export const realEstateEngine = {
  propertyValuationPrediction,
  buyerReadinessScoring,
  agentPerformanceAnalytics,
  leaseRenewalRisk,
  maintenancePriorityAnalysis,
};

export async function runRealEstateIntelligence(companyId) {
  const allInsights = [];
  
  try {
    const val = await propertyValuationPrediction(companyId);
    if (Array.isArray(val)) allInsights.push(...val);
  } catch (e) {
    console.error('[RE Intelligence] Valuation prediction failed:', e);
  }

  try {
    const buy = await buyerReadinessScoring(companyId);
    if (Array.isArray(buy)) allInsights.push(...buy);
  } catch (e) {
    console.error('[RE Intelligence] Buyer readiness scoring failed:', e);
  }

  try {
    const agt = await agentPerformanceAnalytics(companyId);
    if (Array.isArray(agt)) allInsights.push(...agt);
  } catch (e) {
    console.error('[RE Intelligence] Agent performance failed:', e);
  }

  try {
    const lse = await leaseRenewalRisk(companyId);
    if (Array.isArray(lse)) allInsights.push(...lse);
  } catch (e) {
    console.error('[RE Intelligence] Lease renewal risk failed:', e);
  }

  try {
    const mnt = await maintenancePriorityAnalysis(companyId);
    if (Array.isArray(mnt)) allInsights.push(...mnt);
  } catch (e) {
    console.error('[RE Intelligence] Maintenance priority failed:', e);
  }

  return allInsights;
}

export default runRealEstateIntelligence;
