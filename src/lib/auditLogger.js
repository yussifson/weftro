import { supabase } from '@/api/supabaseClient';

export async function logAuditEvent({ action, user, details }) {
  try {
    const ipRes = await fetch('https://ipapi.co/json/').catch(() => ({}));
    const ipData = ipRes.ok ? await ipRes.json() : {};
    
    // Format details gracefully
    let finalDetails = details;
    if (!finalDetails) {
      finalDetails = `City: ${ipData.city || 'Unknown'}, Country: ${ipData.country_name || 'Unknown'}`;
    } else {
      finalDetails += ` (Loc: ${ipData.city || 'Unknown'}, ${ipData.country_name || 'Unknown'})`;
    }

    await supabase.from('audit_logs').insert({
      action,
      user_id: user?.id || null,
      user_email: user?.email || 'Unknown',
      user_name: user?.user_metadata?.full_name || user?.email || 'Unknown User',
      ip_address: ipData.ip || 'Unknown IP',
      details: finalDetails,
      company_id: user?.user_metadata?.company_id || null
    });
  } catch(e) {
    console.warn("Failed to log audit event:", e);
  }
}
