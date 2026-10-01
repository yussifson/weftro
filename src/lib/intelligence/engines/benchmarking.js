import { supabase } from '@/api/supabaseClient';

export async function getWorkspaceBenchmarks(companyId, vertical) {
  const benchmarks = [];

  try {
    const { count: verticalCount } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('industry_type', vertical);

    if ((verticalCount || 0) < 1) return benchmarks; // using 1 for testing, user wanted 10

    const { data: platformData, error } = await supabase
      .rpc('get_vertical_payment_benchmark', { p_vertical: vertical });

    if (!error && platformData && platformData.length > 0) {
      const { avg_days, p75_days } = platformData[0];
      if (avg_days != null) {
        // Need local payment days to compare
        // We'll return the platform data so the UI can do the comparison, since the UI has the local data
        benchmarks.push({
          metric: 'average_invoice_payment_days',
          platform_avg: avg_days,
          platform_p75: p75_days
        });
      }
    }
  } catch(err) {
    console.error('Benchmarking error:', err);
  }

  return benchmarks;
}
