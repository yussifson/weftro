const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'src', 'pages', 'clipad', 'IntegrationsHub.jsx');
let content = fs.readFileSync(file, 'utf8');

// Import ConnectSettings
if (!content.includes('ConnectSettings')) {
  content = content.replace(
    "import CaptureInbox from '@/components/clipad/features/CaptureInbox';",
    "import CaptureInbox from '@/components/clipad/features/CaptureInbox';\nimport ConnectSettings from '@/components/clipad/features/ConnectSettings';"
  );
}

// Add isConnectEnabled check
if (!content.includes('isConnectEnabled')) {
  content = content.replace(
    "const captureV3Enabled = isV3FeatureEnabled(V3_FLAGS.CAPTURE_V3_ENABLED, user);",
    "const captureV3Enabled = isV3FeatureEnabled(V3_FLAGS.CAPTURE_V3_ENABLED, user);\n  const isConnectEnabled = isV3FeatureEnabled(V3_FLAGS.CONNECT_ENABLED, user);"
  );
}

// Add Developer API Tab
const tabHtml = `
                {isConnectEnabled && (
                  <button 
                    onClick={() => setActiveTab('connect')}
                    className={\`pb-3 px-1 text-sm font-bold border-b-2 transition-colors \${activeTab === 'connect' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}\`}
                  >
                    Developer API
                  </button>
                )}
`;

content = content.replace(
  /Capture Inbox\n\s*<\/button>\n/m,
  "Capture Inbox\n                </button>\n" + tabHtml
);

// Add ConnectSettings to activeTab switch logic
const connectRenderHtml = `
            {activeTab === 'connect' && (
              <ConnectSettings />
            )}
`;

content = content.replace(
  /\{activeTab === 'inbox' && \(\n\s*<CaptureInbox \/>\n\s*\)\}/m,
  "{activeTab === 'inbox' && (\n              <CaptureInbox />\n            )}\n" + connectRenderHtml
);

fs.writeFileSync(file, content, 'utf8');
console.log('Updated IntegrationsHub.jsx with Connect Settings tab');
