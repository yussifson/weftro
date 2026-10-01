import pkg from 'pg';
const { Client } = pkg;

async function test() {
  const client = new Client({
    connectionString: 'postgresql://postgres:1948%40yajkUweb3.o@db.wmabgiafwamxkcgxyhee.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("SUCCESSFULLY CONNECTED to the new Supabase Database!");

    // Query companies to see what companies exist
    const compRes = await client.query("SELECT * FROM public.companies;");
    console.log("COMPANIES IN DATABASE:", compRes.rows);

    // Query profiles to see what users exist and their company_ids
    const profRes = await client.query("SELECT * FROM public.profiles;");
    console.log("PROFILES IN DATABASE:", profRes.rows);

  } catch (err) {
    console.error("Connection failed:", err.message);
  } finally {
    await client.end();
  }
}

test();
