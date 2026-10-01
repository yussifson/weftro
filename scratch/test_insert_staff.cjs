const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [k, v] = line.split('=');
  if(k && v) acc[k.trim()] = v.trim();
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function testInsert() {
  const form = {
    company_id: 'test-company-id',
    user_email: 'test@lex.com',
    full_name: 'Test Admin',
    role: "company_admin",
    status: "active",
    currency: "GHS"
  };
  const { data, error } = await supabase.from('staff_records').insert(form).select();
  console.log('Insert Result:', error || data);
}
testInsert();
