const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

const files = [
  'index.html',
  'public/clipad-logo.svg',
  'public/clipad-logo-green.svg',
  'src/components/clipad/CliPadCommandPalette.jsx',
  'src/components/clipad/ClipadOrbitAssistant.jsx',
  'src/components/clipad/ClipadSidebar.jsx',
  'src/components/clipad/CliPadTeamSettings.jsx',
  'src/components/clipad/ExportTaskModal.jsx',
  'src/components/clipad/PaymentReceiptModal.jsx',
  'src/components/clipad/SupportAIChat.jsx',
  'src/components/layout/ClipadAdminLayout.jsx',
  'src/components/layout/GlobalAIAssistant.jsx',
  'src/components/seo/SEO.jsx',
  'src/components/video/VideoRoom.jsx',
  'src/lib/AuthContext.jsx',
  'src/pages/clipad/admin/CompanyManagement.jsx',
  'src/pages/clipad/admin/CustomRequests.jsx',
  'src/pages/clipad/admin/PricingTags.jsx',
  'src/pages/clipad/CliPadBilling.jsx',
  'src/pages/clipad/CliPadCustomPricing.jsx',
  'src/pages/clipad/CliPadLogin.jsx',
  'src/pages/clipad/CliPadSignUp.jsx',
  'src/pages/clipad/DecisionLedger.jsx',
  'src/pages/clipad/IntegrationsHub.jsx',
  'src/pages/clipad/RecordVideo.jsx',
  'src/pages/MeetLandingPage.jsx',
  'src/pages/PricingPage.jsx',
  'src/pages/SecurityPage.jsx',
  'src/services/OmniNotificationService.js'
];

let totalReplaced = 0;
for (const rel of files) {
  const fullPath = path.join(rootDir, rel);
  if (!fs.existsSync(fullPath)) {
    console.log('Skipping missing:', rel);
    continue;
  }
  let content = fs.readFileSync(fullPath, 'utf8');
  const matches = (content.match(/KERINT/g) || []).length;
  if (matches > 0) {
    content = content.replace(/kerint\.ai/g, 'weftro.com');
    content = content.replace(/KERINT/g, 'Weftro');
    content = content.replace(/Kerint/g, 'Weftro');
    content = content.replace(/host\.includes\('kerint'\)/g, "host.includes('weftro') || host.includes('kerint')");
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Updated ${rel}: ${matches} replacements`);
    totalReplaced += matches;
  }
}
console.log('Total brand replacements applied:', totalReplaced);
