const fs = require('fs');
const path = require('path');

const replacements = [
  { file: 'src/components/clipad/CliPadTeamSettings.jsx', find: /CliPad/g, replace: 'KERINT' },
  { file: 'src/components/clipad/ClipadOrbitAssistant.jsx', find: /CliPad's/g, replace: "KERINT's" },
  { file: 'src/components/clipad/ExportTaskModal.jsx', find: /CliPad/g, replace: 'KERINT' },
  { file: 'src/components/clipad/PaymentReceiptModal.jsx', find: /CliPad/g, replace: 'KERINT' },
  { file: 'src/components/clipad/SupportAIChat.jsx', find: /CliPad's/g, replace: "KERINT's" },
  { file: 'src/components/clipad/SupportAIChat.jsx', find: /CliPad/g, replace: 'KERINT' },
  { file: 'src/components/video/VideoRoom.jsx', find: /CliPad Intelligence/g, replace: 'KERINT Intelligence' },
  { file: 'src/components/video/VideoRoom.jsx', find: /on CliPad/g, replace: 'on KERINT' },
  { file: 'src/pages/clipad/admin/CompanyManagement.jsx', find: /CliPad Plan/g, replace: 'KERINT Plan' },
  { file: 'src/pages/clipad/admin/CustomRequests.jsx', find: /CliPad%20/g, replace: 'KERINT%20' },
  { file: 'src/pages/clipad\admin/CustomRequests.jsx', find: /custom CliPad plan/g, replace: 'custom KERINT plan' },
  { file: 'src/pages/clipad/admin/PricingTags.jsx', find: /CliPad/g, replace: 'KERINT' },
  { file: 'src/pages/clipad/CliPadBilling.jsx', find: /CliPad/g, replace: 'KERINT' },
  { file: 'src/pages/clipad/CliPadLogin.jsx', find: /CliPad/g, replace: 'KERINT' },
  { file: 'src/pages/clipad/CliPadSignUp.jsx', find: /CliPad/g, replace: 'KERINT' },
  { file: 'src/pages/clipad/IntegrationsHub.jsx', find: /CliPad Integration Setup Guide/g, replace: 'KERINT Integration Setup Guide' },
  { file: 'src/pages/clipad/RecordVideo.jsx', find: /saved to CliPad/g, replace: 'saved to KERINT' },
  { file: 'src/components/clipad/CliPadCommandPalette.jsx', find: /CliPad search failed/g, replace: 'KERINT search failed' },
];

replacements.forEach(r => {
  const fp = path.resolve(r.file);
  if (fs.existsSync(fp)) {
    let content = fs.readFileSync(fp, 'utf8');
    // For specific files, replace all 'CliPad' if that's what the regex is
    if (r.find.source === 'CliPad') {
       // Only replace instances that are likely text, not imports or components
       // But in SupportAIChat, it's just text. 
       content = content.replace(r.find, r.replace);
    } else {
       content = content.replace(r.find, r.replace);
    }
    
    // We don't want to accidentally rename component exports like `export default function CliPadLogin`
    // Let's revert the component and file name references to be safe.
    content = content.replace(/KERINTLogin/g, 'CliPadLogin');
    content = content.replace(/KERINTSignUp/g, 'CliPadSignUp');
    content = content.replace(/KERINTBilling/g, 'CliPadBilling');
    content = content.replace(/KERINTTeamSettings/g, 'CliPadTeamSettings');
    content = content.replace(/KERINTCommandPalette/g, 'CliPadCommandPalette');
    
    fs.writeFileSync(fp, content);
    console.log('Processed', fp);
  }
});
