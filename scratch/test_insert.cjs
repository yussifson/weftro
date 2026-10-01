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
    name: 'Test Firm 4',
    email: 'test@lex.com',
    currency: 'GHS',
    subscription_plan: 'starter',
    status: 'active'
  };
  const { data, error } = await supabase.from('companies').insert(form).select();
  console.log('Insert Result:', error || data);
}
testInsert();
