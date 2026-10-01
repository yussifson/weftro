// Direct test of all 3 Cloudflare accounts with kimi-k3
// IMPORTANT: Fill in the real tokens/accountIds below before running
// node scratch/test_kimi_accounts.mjs

const accounts = [
  {
    name: "Account 1",
    token: "cfut_DjZLCGykcMI0D0wtJIHxOME8NpAIwe68bLYMsyWOd091300e",
    accountId: "bf5126510c1f8f2759cc81c4e7d795ef",
  },
  // Fill in Account 2 & 3 tokens here:
  {
    name: "Account 2",
    token: "PASTE_TOKEN_2_HERE",
    accountId: "PASTE_ACCOUNT_ID_2_HERE",
  },
  {
    name: "Account 3",
    token: "PASTE_TOKEN_3_HERE",
    accountId: "PASTE_ACCOUNT_ID_3_HERE",
  },
];

const model = "moonshotai/kimi-k3";

async function testAccount(account) {
  if (account.token.includes("PASTE")) {
    console.log(`\n⏭️  Skipping ${account.name} — token not filled in`);
    return;
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${account.accountId}/ai/v1/chat/completions`;
  console.log(`\n🔍 Testing ${account.name} (accountId: ${account.accountId.substring(0,10)}...)`);

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${account.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "user", content: "Say hi." }], max_tokens: 20 }),
  });
  const text = await res.text();
  console.log(`   HTTP Status: ${res.status}`);
  try {
    const json = JSON.parse(text);
    if (json.choices) {
      console.log(`   ✅ SUCCESS — Response: "${json.choices[0]?.message?.content}"`);
    } else {
      const errMsg = json.errors?.map(e => `[${e.code}] ${e.message}`).join(', ') || text.substring(0, 300);
      console.log(`   ❌ FAIL — ${errMsg}`);
    }
  } catch {
    console.log(`   Raw: ${text.substring(0, 300)}`);
  }
}

(async () => {
  console.log(`\n=== Cloudflare AI Account Test: model=${model} ===`);
  for (const acc of accounts) await testAccount(acc);
  console.log("\n=== Done ===\n");
})();
