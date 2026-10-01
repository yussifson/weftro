async function check() {
  const accountId = "bf5126510c1f8f2759cc81c4e7d795ef";
  const token = "cfut_DjZLCGykcMI0D0wtJIHxOME8NpAIwe68bLYMsyWOd091300e";
  
  const url = `http://localhost:3000/api/ai/${accountId}/@cf/moonshotai/kimi-k2.5`;
  
  const prompt = `You are OrbitBuild, an elite Workspace Assembly Engine for Slate.
Your purpose is to understand a business or industry described by the user and assemble a complete workspace.
You MUST NOT generate database schemas. You MUST ONLY select from the predefined library of Universal Components.

CRITICAL INSTRUCTIONS:
1. Analyze the industry and identify the required business capabilities.
2. Select the most appropriate Universal Components to fulfill those capabilities.
3. Assemble a list of pages for the workspace. For a standard industry, generate between 6 and 12 pages.
4. Provide a domain-specific \`page_name\` (e.g., "Pet Records", "Invoicing", "Student Attendance") but map it to exactly one \`component_id\` from the allowed list.
5. THE FIRST PAGE MUST ALWAYS BE A DASHBOARD. Set \`page_name\` to "Dashboard" and \`component_id\` to "dashboard".

14. COMPONENT MAPPING:
For each page, select a conceptually matching \`component_id\` that reflects the UI needed (e.g., "inventory", "patient_records", "pos", "crm"). Use descriptive string IDs.

CRITICAL: Do not use spaces in \`component_id\`. Use snake_case.

JSON OUTPUT FORMAT:
You must output EXACTLY a valid JSON object. DO NOT output any markdown tags like \`\`\`json. DO NOT output any conversational text.
ONLY the JSON object.`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: "Build a lighting industry workspace" }
        ],
        max_tokens: 2500
      })
    });
    
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text);
  } catch (err) {
    console.error("Error:", err);
  }
}
check();
