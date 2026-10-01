import { supabase } from '../src/api/supabaseClient.js';

async function test() {
  const { data, error } = await supabase.from('companies').select('*').limit(1);
  console.log('Error:', error);
  if (data && data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
  }
}

test();
