import { powerSync } from '@/api/PowerSyncConnector';
import { generateText } from '@/lib/cloudflareAI';

export async function assembleWorkspaceFromDescription(workspaceId, userDescription) {
  // Step 1: Fetch all available modules from the registry
  const res = await powerSync.execute(`SELECT module_key, display_name, description, category, config_schema FROM component_registry WHERE is_active = 1`);
  const allModules = res.rows._array;

  if (!allModules || allModules.length === 0) {
    throw new Error('Component registry is empty. Seed the registry before running OrbitBuild.');
  }

  // Step 2: Ask the AI to classify the description and select modules
  const moduleList = allModules.map(m =>
    `${m.module_key}: ${m.display_name} — ${m.description} [category: ${m.category}]`
  ).join('\n');

  const aiPrompt = `A user wants to build a workspace for: "${userDescription}"

    Available modules to select from (ONLY choose from this list — do not invent modules):
    ${moduleList}

    Return ONLY a JSON object in this exact format (no markdown tags, no markdown block quotes, just pure JSON string):
    {
      "industry_key": "a short snake_case identifier for this industry",
      "display_name": "Human readable industry name",
      "description": "One sentence describing what this workspace is for",
      "selected_module_keys": ["module_key_1", "module_key_2", "..." ],
      "module_configs": {"module_key": {"config_field": "value"}},
      "module_reasons": {"module_key": "why this module was selected"},
      "confidence": 85,
      "reasoning": "One sentence explaining why these modules were chosen"
    }

    Rules:
    - Only select modules from the list above. Never invent new module keys.
    - Select between 4 and 12 modules. No more, no less.
    - Order modules by importance — most essential first.
    - Always include task_manager, team_messaging, and dashboard_analytics.`;

  const aiResponse = await generateText([{ role: 'system', content: aiPrompt }]);

  let parsed = null;
  try {
    const jsonStr = aiResponse.substring(aiResponse.indexOf('{'), aiResponse.lastIndexOf('}') + 1);
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error('OrbitBuild could not parse the AI response.');
  }

  // Step 4: Validate
  const validKeys = new Set(allModules.map(m => m.module_key));
  let validSelectedKeys = (parsed.selected_module_keys || []).filter(k => validKeys.has(k));

  const universalModules = ['task_manager', 'team_messaging', 'dashboard_analytics'];
  for (const um of universalModules) {
    if (!validSelectedKeys.includes(um) && validKeys.has(um)) {
      validSelectedKeys.push(um);
    }
  }

  const selectedModules = validSelectedKeys.map((key, index) => {
    const module = allModules.find(m => m.module_key === key);
    const userConfig = parsed.module_configs?.[key] || {};
    let schema = {};
    try { schema = JSON.parse(module.config_schema || '{}'); } catch(e){}
    const defaultConfig = Object.fromEntries(
      Object.entries(schema.fields || {}).map(([field, schemaDef]) => [field, schemaDef.default])
    );

    return {
      module_key: key,
      display_name: module.display_name,
      config: { ...defaultConfig, ...userConfig },
      position: index,
      reason: parsed.module_reasons?.[key] || 'Selected as relevant for this workspace type',
    };
  });

  if (workspaceId) {
    // Clear existing modules
    await powerSync.execute(`DELETE FROM workspace_modules WHERE workspace_id = ?`, [workspaceId]);

    // Insert new modules
    for (const m of selectedModules) {
      await powerSync.execute(
        `INSERT INTO workspace_modules (id, workspace_id, company_id, module_key, display_name, config, position, is_active, created_at)
         VALUES (uuid(), ?, ?, ?, ?, ?, ?, 1, datetime('now'))`,
        [workspaceId, workspaceId, m.module_key, m.display_name, JSON.stringify(m.config), m.position]
      );
    }
  }

  return {
    industry_key: parsed.industry_key,
    display_name: parsed.display_name,
    description: parsed.description,
    selected_modules: selectedModules,
    confidence: parsed.confidence,
    reasoning: parsed.reasoning,
  };
}
