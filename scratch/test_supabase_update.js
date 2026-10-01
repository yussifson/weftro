import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

const envConfig = dotenv.parse(fs.readFileSync('.env'));
const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function testUpdate() {
  // First, get an active company id
  const { data: companies } = await supabase.from('companies').select('id').limit(1);
  if (!companies || companies.length === 0) {
    console.log("No companies found.");
    return;
  }
  const id = companies[0].id;
  console.log("Testing update on company:", id);

  const payload = {
    currency: "USD",
    logo_url: "https://example.com/logo.png",
    language: "en",
    timezone: "UTC"
  };

  const { data, error } = await supabase.from('companies').update(payload).eq('id', id);
  console.log("Result:", { data, error });
}

testUpdate();
