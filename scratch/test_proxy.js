async function check() {
  const accountId = "bf5126510c1f8f2759cc81c4e7d795ef";
  const token = "cfut_DjZLCGykcMI0D0wtJIHxOME8NpAIwe68bLYMsyWOd091300e";
  
  const url = `http://localhost:3000/api/ai/${accountId}/@cf/moonshotai/kimi-k2.5`;
  console.log("Fetching", url);
  
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ messages: [{ role: "user", content: "hello" }] })
    });
    
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text);
  } catch (err) {
    console.error("Error:", err);
  }
}
check();
