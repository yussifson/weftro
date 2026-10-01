/** Build YTD monthly revenue from paid invoices (real data only). */
export function buildMonthlyRevenueChart(invoices, amountKey = "total_amount") {
  const year = new Date().getFullYear();
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return monthLabels.map((name, monthIndex) => {
    const revenue = invoices
      .filter((inv) => {
        if (inv.status !== "paid") return false;
        const d = new Date(inv.paid_date || inv.created_date || inv.updated_date);
        return !Number.isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === monthIndex;
      })
      .reduce((sum, inv) => sum + (Number(inv[amountKey]) || 0), 0);

    return { name, Revenue: Math.round(revenue) };
  });
}

/** Group records by a field for bar charts (no placeholder counts). */
export function buildDistributionChart(items, field, labelFormatter) {
  const counts = items.reduce((acc, item) => {
    const key = item[field] || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const entries = Object.entries(counts).map(([key, count]) => ({
    name: labelFormatter ? labelFormatter(key) : key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
    count}));

  if (entries.length === 0) {
    return [{ name: "No data yet", count: 0 }];
  }

  return entries.sort((a, b) => b.count - a.count).slice(0, 8);
}
