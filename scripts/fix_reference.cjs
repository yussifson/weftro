const fs = require('fs');
let content = fs.readFileSync('src/pages/clipad/IntegrationsHub.jsx', 'utf8');

if (!content.includes('import { isV3FeatureEnabled, V3_FLAGS }')) {
  content = content.replace("import GovernanceSettings from '@/components/clipad/features/GovernanceSettings';", "import GovernanceSettings from '@/components/clipad/features/GovernanceSettings';\nimport { isV3FeatureEnabled, V3_FLAGS } from '@/lib/clipadV3Flags';");
}

if (!content.includes('const isConnectEnabled =')) {
  content = content.replace("const isAdmin = ['super_admin', 'admin'].includes(userRole);", "const isAdmin = ['super_admin', 'admin'].includes(userRole);\n  const isConnectEnabled = isAdmin && isV3FeatureEnabled(V3_FLAGS.CONNECT_ENABLED, user);");
}

fs.writeFileSync('src/pages/clipad/IntegrationsHub.jsx', content, 'utf8');
console.log('Injected isConnectEnabled');
