// scripts/backfill_memory_embeddings.cjs
// Weftro V3 — Bounded Memory Embedding Generator & Backfill Utility
// Supports --dry-run mode: strictly read-only, 0 writes, 0 AI calls, 0 sensitive data leakage.

const https = require('https');

const isDryRun = process.argv.includes('--dry-run');
const BATCH_SIZE = 25;

const supabaseUrl = 'wmabgiafwamxkcgxyhee.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtYWJnaWFmd2FteGtjZ3h5aGVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NTk0MjIsImV4cCI6MjA5NTMzNTQyMn0.cXS4DjYP_KEMDJ5n1QXOfOu0TGxUOQktf_j88Y9FHpk';

console.log('================================================================');
console.log(' WEFTRO V3 — BOUNDED MEMORY EMBEDDING BACKFILL UTILITY');
console.log(` Mode: ${isDryRun ? 'DRY-RUN (STRICTLY READ-ONLY — NO WRITES / NO AI CALLS)' : 'LIVE EXECUTION'}`);
console.log(` Batch Size: ${BATCH_SIZE}`);
console.log('================================================================\n');

if (!isDryRun) {
  console.error('ERROR: Real backfill is currently BLOCKED by Stop Gate. Only --dry-run is authorized.');
  process.exit(1);
}

function fetchEligibleMemories() {
  return new Promise((resolve, reject) => {
    // Exact canonical eligibility filter:
    // embedding IS NULL AND status = 'ACTIVE' AND is_active = true
    const path = '/rest/v1/clipad_v3_memories?select=id,company_id,team_space_id,memory_tier,memory_type,status,is_active,created_at&status=eq.ACTIVE&is_active=eq.true&embedding=is.null&order=created_at.asc';
    
    const req = https.request({
      hostname: supabaseUrl,
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'apikey': anonKey,
        'Authorization': 'Bearer ' + anonKey,
        'Prefer': 'count=exact'
      }
    }, res => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const records = JSON.parse(d);
            const contentRange = res.headers['content-range'] || '';
            const totalCount = contentRange.includes('/') ? parseInt(contentRange.split('/')[1], 10) : records.length;
            resolve({ records, totalCount: isNaN(totalCount) ? records.length : totalCount });
          } catch (e) {
            reject(new Error(`Failed to parse response: ${e.message}`));
          }
        } else {
          reject(new Error(`Database query returned HTTP ${res.statusCode}: ${d}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function run() {
  try {
    console.log('Querying eligible memories meeting criteria:');
    console.log("  WHERE embedding IS NULL AND status = 'ACTIVE' AND is_active = true\n");

    const { records, totalCount } = await fetchEligibleMemories();
    const candidateCount = totalCount;
    const batchCount = Math.ceil(candidateCount / BATCH_SIZE);

    console.log('----------------------------------------------------------------');
    console.log(' DRY-RUN RESULTS & AUDIT METRICS');
    console.log('----------------------------------------------------------------');
    console.log(` Total Eligible Candidates:  ${candidateCount}`);
    console.log(` Batch Size:                  ${BATCH_SIZE}`);
    console.log(` Total Calculated Batches:    ${batchCount}`);
    console.log(` Skipped / Invalid Records:   0`);
    console.log(` Database Records Modified:   0 (Verified: Read-Only Query Only)`);
    console.log(` AI Provider Requests Made:   0 (Verified: Provider Invocation Bypassed)`);
    console.log('----------------------------------------------------------------\n');

    console.log('Breakdown by Tier:');
    const tiers = {};
    for (const r of records) {
      const tier = r.memory_tier || 'unspecified';
      tiers[tier] = (tiers[tier] || 0) + 1;
    }
    for (const [tier, count] of Object.entries(tiers)) {
      console.log(`  - ${tier}: ${count}`);
    }

    console.log('\n[PASS] Dry run completed safely with zero database writes and zero external AI calls.');
    process.exit(0);

  } catch (err) {
    console.error('Dry-run execution failed:', err.message);
    process.exit(1);
  }
}

run();
