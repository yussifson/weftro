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
    company_id: '8c4a51c8-7270-4de9-a076-e9d501b6b9b1',
    name: 'Test Client',
    email: 'test@client.com',
    type: 'individual'
  };
  const { data, error } = await supabase.from('clients').insert(form).select();
  console.log('Insert Result:', error || data);
}
testInsert();
