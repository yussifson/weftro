import { assembleWorkspaceFromDescription } from '@/lib/orbitbuild/assembly-engine';
import { powerSync } from '@/api/PowerSyncConnector';

export async function generateOrbitBuildWorkspace(prompt, companyId) {
  try {
    // 1. Run assembly engine to build from the registry
    const assemblyResult = await assembleWorkspaceFromDescription(companyId, prompt);

    // 2. Map the output to the expected format for OrbitBuildData (legacy compatibility)
    // The legacy OrbitDashboard expects orbitBuildData to have industry_name and pages.
    // Instead of raw react schemas, we now map them to components based on module_keys.
    
    // We map component_registry keys directly to their UI component representations,
    // or just let the UI map module_key -> UniversalComponent.
    // For legacy compatibility, we just store the module list as "pages" with component_id = module_key.
    
    const pages = assemblyResult.selected_modules.map(mod => {
      // Map universal modules to their exact legacy IDs if needed, else use module_key
      let compId = mod.module_key;
      if (compId === 'dashboard_analytics') compId = 'dashboard';
      if (compId === 'task_manager') compId = 'crm'; // just as an example
      
      return {
        id: crypto.randomUUID(),
        page_name: mod.display_name,
        component_id: compId,
        icon: 'Box',
        config: mod.config
      };
    });

    const orbitBuildData = {
      industry_name: assemblyResult.display_name,
      description: assemblyResult.description,
      pages: pages
    };

    // Save to industry_records for backwards compatibility with Sidebar and existing OrbitDashboard
    const _payload = {
      id: crypto.randomUUID(),
      company_id: companyId,
      industry: "orbit_build",
      record_type: "workspace_config",
      data: orbitBuildData,
      status: "active",
      title: "OrbitBuild Architecture"
    };

    const _keys = Object.keys(_payload);
    const _vals = Object.values(_payload).map(v => typeof v === 'object' ? JSON.stringify(v) : v);

    const existing = await powerSync.getOptional('SELECT id FROM industry_records WHERE company_id = ? AND record_type = ?', [companyId, 'orbit_build_config']);

    if (existing) {
      await powerSync.execute(
        `UPDATE industry_records SET ${_keys.map(k=>k+' = ?').join(', ')} WHERE id = ?`,
        [..._vals, existing.id]
      );
    } else {
      await powerSync.execute(
        `INSERT INTO industry_records (${_keys.join(', ')}) VALUES (${_keys.map(()=>'?').join(', ')})`,
        _vals
      );
    }

    return orbitBuildData;
  } catch (err) {
    console.error("OrbitBuild assembly error:", err);
    throw err;
  }
}
