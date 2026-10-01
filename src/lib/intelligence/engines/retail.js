// src/lib/intelligence/engines/retail.js
// Retail Intelligence Engine — stock, sales, returns, loyalty
import { generateInsight, groupByWeek, groupByDay } from '@/lib/intelligence/engine';
import { powerSync } from '@/api/PowerSyncConnector';

const VERTICAL = 'retail';

// ────────────────────────────────────────────────────────
// Stockout Prediction
// Flags products with dangerously low inventory (stock_qty < 10)
// and categorises urgency by stock level thresholds.
// ────────────────────────────────────────────────────────
async function stockoutPrediction(companyId) {
  const insights = [];

  const res = await powerSync.execute(
    `SELECT product_name, sku, category, price, cost, stock_qty, status
     FROM univ_productcatalogs
     WHERE company_id = ? AND status = 'active'
     ORDER BY stock_qty ASC`,
    [companyId]
  );
  const products = res.rows._array;

  if (products.length === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'summary',
      insight_key: 'retail_stock_no_data',
      title: 'Inventory Intelligence Building',
      body: 'No active products found in the catalog. Stockout prediction will begin once product data is available.',
      severity: 'info',
    }];
  }

  const criticalStock = products.filter(p => Number(p.stock_qty) <= 0);
  const lowStock = products.filter(p => Number(p.stock_qty) > 0 && Number(p.stock_qty) < 10);
  const atRisk = [...criticalStock, ...lowStock];

  if (atRisk.length === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'positive',
      insight_key: 'retail_stock_healthy',
      title: 'Inventory Levels Healthy',
      body: `All ${products.length} active products have stock levels of 10 or above. No restocking action needed.`,
      severity: 'positive',
      confidence: 0.85,
    }];
  }

  // Group low-stock by category
  const byCategory = {};
  for (const p of atRisk) {
    if (!byCategory[p.category]) byCategory[p.category] = [];
    byCategory[p.category].push({
      name: p.product_name,
      sku: p.sku,
      stock: Number(p.stock_qty),
      price: Number(p.price),
    });
  }

  const aiBody = await generateInsight(
    `Analyze these low-stock products and recommend restocking priorities. Consider the revenue impact based on price.`,
    {
      totalProducts: products.length,
      outOfStock: criticalStock.length,
      lowStock: lowStock.length,
      byCategory,
    }
  );

  insights.push({
    vertical: VERTICAL,
    insight_type: 'prediction',
    insight_key: 'retail_stockout_risk',
    title: criticalStock.length > 0
      ? `${criticalStock.length} Product${criticalStock.length > 1 ? 's' : ''} Out of Stock, ${lowStock.length} Running Low`
      : `${lowStock.length} Product${lowStock.length > 1 ? 's' : ''} Running Low on Stock`,
    body: aiBody,
    severity: criticalStock.length > 0 ? 'critical' : 'warning',
    confidence: 0.9,
    data_snapshot: {
      totalProducts: products.length,
      outOfStock: criticalStock.length,
      lowStock: lowStock.length,
      topAtRisk: atRisk.slice(0, 10).map(p => ({
        name: p.product_name,
        sku: p.sku,
        category: p.category,
        stock: Number(p.stock_qty),
      })),
    },
    action_label: 'Manage Inventory',
    action_url: '/retail/products?filter=low-stock',
  });

  return insights;
}

// ────────────────────────────────────────────────────────
// Sales Velocity Analysis
// Examines last 30 days of orders to identify top sellers,
// weekly trends, and declining product momentum.
// ────────────────────────────────────────────────────────
async function salesVelocityAnalysis(companyId) {
  const insights = [];
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(now.getDate() - 60);

  // Current period orders (last 30 days)
  const currentRes = await powerSync.execute(
    `SELECT order_number, customer_name, total_amount, status, order_date
     FROM univ_orders
     WHERE company_id = ? AND order_date >= ?
     ORDER BY order_date DESC`,
    [companyId, thirtyDaysAgo.toISOString().split('T')[0]]
  );
  const currentOrders = currentRes.rows._array;

  if (currentOrders.length === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'summary',
      insight_key: 'retail_sales_no_data',
      title: 'Sales Intelligence Building',
      body: 'No orders found in the last 30 days. Sales velocity analysis will begin once order data flows in.',
      severity: 'info',
    }];
  }

  // Previous period orders (30–60 days ago) for comparison
  const prevRes = await powerSync.execute(
    `SELECT order_number, total_amount, status, order_date
     FROM univ_orders
     WHERE company_id = ? AND order_date >= ? AND order_date < ?`,
    [companyId, sixtyDaysAgo.toISOString().split('T')[0], thirtyDaysAgo.toISOString().split('T')[0]]
  );
  const prevOrders = prevRes.rows._array;

  // Compute totals
  const currentTotal = currentOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
  const prevTotal = prevOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0);

  const revenueChange = prevTotal > 0
    ? ((currentTotal - prevTotal) / prevTotal) * 100
    : 0;

  // Weekly trend
  const weeklyTrend = groupByWeek(currentOrders, 'order_date', 'total_amount');

  // Top customers by spend
  const customerSpend = {};
  for (const o of currentOrders) {
    if (!customerSpend[o.customer_name]) customerSpend[o.customer_name] = { total: 0, orders: 0 };
    customerSpend[o.customer_name].total += Number(o.total_amount || 0);
    customerSpend[o.customer_name].orders++;
  }
  const topCustomers = Object.entries(customerSpend)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Daily order trend
  const dailyTrend = groupByDay(currentOrders, 'order_date');

  const aiBody = await generateInsight(
    `Analyze 30-day sales velocity: revenue trends, order volume, and top customers. Highlight momentum shifts.`,
    {
      currentPeriodRevenue: Math.round(currentTotal * 100) / 100,
      previousPeriodRevenue: Math.round(prevTotal * 100) / 100,
      revenueChangePercent: Math.round(revenueChange * 10) / 10,
      currentOrderCount: currentOrders.length,
      previousOrderCount: prevOrders.length,
      weeklyTrend,
      topCustomers,
    }
  );

  const severity = revenueChange < -20 ? 'critical'
    : revenueChange < -5 ? 'warning'
    : revenueChange > 10 ? 'positive'
    : 'info';

  insights.push({
    vertical: VERTICAL,
    insight_type: 'summary',
    insight_key: 'retail_sales_velocity',
    title: `Sales ${revenueChange >= 0 ? 'Up' : 'Down'} ${Math.abs(Math.round(revenueChange))}% — ${currentOrders.length} Orders in 30 Days`,
    body: aiBody,
    severity,
    confidence: 0.8,
    data_snapshot: {
      currentRevenue: Math.round(currentTotal * 100) / 100,
      previousRevenue: Math.round(prevTotal * 100) / 100,
      changePercent: Math.round(revenueChange * 10) / 10,
      orderCount: currentOrders.length,
      weeklyTrend,
      topCustomers,
    },
    action_label: 'View Sales Dashboard',
    action_url: '/retail/orders',
  });

  return insights;
}

// ────────────────────────────────────────────────────────
// Return/Refund Pattern Detection
// Flags when overall return rate exceeds 5% or individual
// products/customers show recurring return behaviour.
// ────────────────────────────────────────────────────────
async function returnRefundPattern(companyId) {
  const insights = [];

  // Total orders for rate calculation
  const orderCountRes = await powerSync.execute(
    `SELECT COUNT(*) as total FROM univ_orders WHERE company_id = ?`,
    [companyId]
  );
  const totalOrders = orderCountRes.rows._array[0]?.total || 0;

  const returnRes = await powerSync.execute(
    `SELECT order_number, customer_name, return_reason, refund_amount, status
     FROM univ_returnrefunds
     WHERE company_id = ?`,
    [companyId]
  );
  const returns = returnRes.rows._array;

  if (returns.length === 0) {
    if (totalOrders > 0) {
      return [{
        vertical: VERTICAL,
        insight_type: 'positive',
        insight_key: 'retail_returns_clean',
        title: 'Zero Returns Recorded',
        body: `Out of ${totalOrders} total orders, no returns or refunds have been filed. Excellent product-market fit.`,
        severity: 'positive',
        confidence: 0.9,
      }];
    }
    return [];
  }

  const returnRate = totalOrders > 0
    ? (returns.length / totalOrders) * 100
    : 0;

  const totalRefunded = returns.reduce((s, r) => s + Number(r.refund_amount || 0), 0);

  // Group by reason
  const byReason = {};
  for (const r of returns) {
    const reason = r.return_reason || 'Unknown';
    if (!byReason[reason]) byReason[reason] = { count: 0, refunded: 0 };
    byReason[reason].count++;
    byReason[reason].refunded += Number(r.refund_amount || 0);
  }

  // Repeat returners
  const byCustomer = {};
  for (const r of returns) {
    if (!byCustomer[r.customer_name]) byCustomer[r.customer_name] = 0;
    byCustomer[r.customer_name]++;
  }
  const repeatReturners = Object.entries(byCustomer)
    .filter(([_, count]) => count >= 2)
    .map(([name, count]) => ({ name, returnCount: count }))
    .sort((a, b) => b.returnCount - a.returnCount);

  if (returnRate <= 5 && repeatReturners.length === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'positive',
      insight_key: 'retail_returns_normal',
      title: 'Return Rate Within Normal Range',
      body: `Return rate is ${Math.round(returnRate * 10) / 10}% (${returns.length} of ${totalOrders} orders). Total refunded: $${totalRefunded.toFixed(2)}.`,
      severity: 'positive',
      confidence: 0.8,
    }];
  }

  const aiBody = await generateInsight(
    `Analyze return/refund patterns. Focus on root causes, repeat returners, and revenue impact.`,
    {
      returnRate: Math.round(returnRate * 10) / 10,
      totalReturns: returns.length,
      totalOrders,
      totalRefunded: Math.round(totalRefunded * 100) / 100,
      reasonBreakdown: byReason,
      repeatReturners: repeatReturners.slice(0, 5),
    }
  );

  insights.push({
    vertical: VERTICAL,
    insight_type: 'anomaly',
    insight_key: 'retail_return_pattern',
    title: `Return Rate at ${Math.round(returnRate * 10) / 10}% — $${totalRefunded.toFixed(2)} Refunded`,
    body: aiBody,
    severity: returnRate > 10 ? 'critical' : 'warning',
    confidence: 0.8,
    data_snapshot: {
      returnRate: Math.round(returnRate * 10) / 10,
      totalReturns: returns.length,
      totalRefunded: Math.round(totalRefunded * 100) / 100,
      reasonBreakdown: byReason,
      repeatReturners: repeatReturners.slice(0, 5),
    },
    action_label: 'View Returns',
    action_url: '/retail/returns',
  });

  return insights;
}

// ────────────────────────────────────────────────────────
// Customer Loyalty Risk
// Flags customers with no orders in 60+ days who previously
// had meaningful purchase history.
// ────────────────────────────────────────────────────────
async function customerLoyaltyRisk(companyId) {
  const insights = [];
  const now = new Date();
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(now.getDate() - 60);

  const custRes = await powerSync.execute(
    `SELECT customer_name, email, phone, total_orders, total_spent, last_order_date
     FROM univ_customers
     WHERE company_id = ?`,
    [companyId]
  );
  const customers = custRes.rows._array;

  if (customers.length === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'summary',
      insight_key: 'retail_loyalty_no_data',
      title: 'Customer Intelligence Building',
      body: 'No customer records found. Loyalty risk analysis will begin once customer data is available.',
      severity: 'info',
    }];
  }

  const lapsedCustomers = customers.filter(c => {
    if (!c.last_order_date) return Number(c.total_orders || 0) > 0;
    const lastOrder = new Date(c.last_order_date);
    return lastOrder < sixtyDaysAgo && Number(c.total_orders || 0) > 0;
  });

  const activeCustomers = customers.length - lapsedCustomers.length;

  if (lapsedCustomers.length === 0) {
    return [{
      vertical: VERTICAL,
      insight_type: 'positive',
      insight_key: 'retail_loyalty_healthy',
      title: 'Strong Customer Retention',
      body: `All ${customers.length} customers with purchase history have ordered within the last 60 days. No churn risk detected.`,
      severity: 'positive',
      confidence: 0.75,
    }];
  }

  // Sort by revenue risk (highest spenders who lapsed)
  lapsedCustomers.sort((a, b) => Number(b.total_spent || 0) - Number(a.total_spent || 0));

  const totalLapsedRevenue = lapsedCustomers.reduce((s, c) => s + Number(c.total_spent || 0), 0);
  const churnRate = customers.length > 0
    ? (lapsedCustomers.length / customers.length) * 100
    : 0;

  const topLapsed = lapsedCustomers.slice(0, 5).map(c => ({
    name: c.customer_name,
    totalSpent: Number(c.total_spent || 0),
    totalOrders: Number(c.total_orders || 0),
    lastOrderDate: c.last_order_date,
  }));

  const aiBody = await generateInsight(
    `Analyze lapsed customers and recommend re-engagement strategies. Prioritize by revenue impact.`,
    {
      totalCustomers: customers.length,
      lapsedCount: lapsedCustomers.length,
      churnRate: Math.round(churnRate * 10) / 10,
      totalLapsedRevenue: Math.round(totalLapsedRevenue * 100) / 100,
      topLapsed,
    }
  );

  insights.push({
    vertical: VERTICAL,
    insight_type: 'risk',
    insight_key: 'retail_loyalty_risk',
    title: `${lapsedCustomers.length} Customer${lapsedCustomers.length > 1 ? 's' : ''} Inactive 60+ Days — $${totalLapsedRevenue.toFixed(2)} at Risk`,
    body: aiBody,
    severity: churnRate > 30 ? 'critical' : 'warning',
    confidence: 0.7,
    data_snapshot: {
      totalCustomers: customers.length,
      lapsedCount: lapsedCustomers.length,
      churnRate: Math.round(churnRate * 10) / 10,
      totalLapsedRevenue: Math.round(totalLapsedRevenue * 100) / 100,
      topLapsed,
    },
    action_label: 'View Inactive Customers',
    action_url: '/retail/customers?filter=inactive',
  });

  return insights;
}

// ────────────────────────────────────────────────────────
// Main Export
// ────────────────────────────────────────────────────────
export default async function retailEngine(companyId) {
  const results = await Promise.allSettled([
    stockoutPrediction(companyId),
    salesVelocityAnalysis(companyId),
    returnRefundPattern(companyId),
    customerLoyaltyRisk(companyId),
  ]);

  const insights = [];
  for (const result of results) {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      insights.push(...result.value);
    }
  }

  return insights;
}
