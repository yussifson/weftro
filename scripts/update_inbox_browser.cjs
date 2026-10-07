const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'src', 'components', 'clipad', 'features', 'CaptureInbox.jsx');
let content = fs.readFileSync(file, 'utf8');

// Import BrowserCaptureSettings
if (!content.includes('BrowserCaptureSettings')) {
  content = content.replace(
    "import { isV3FeatureEnabled, V3_FLAGS } from '@/lib/clipadV3Flags';",
    "import { isV3FeatureEnabled, V3_FLAGS } from '@/lib/clipadV3Flags';\nimport BrowserCaptureSettings from './BrowserCaptureSettings';"
  );
}

// Add Extension flag check
if (!content.includes('browserCaptureEnabled')) {
  content = content.replace(
    "const contextSessionsEnabled = isV3FeatureEnabled(V3_FLAGS.CONTEXT_SESSIONS_ENABLED, user);",
    "const contextSessionsEnabled = isV3FeatureEnabled(V3_FLAGS.CONTEXT_SESSIONS_ENABLED, user);\n  const browserCaptureEnabled = isV3FeatureEnabled(V3_FLAGS.BROWSER_CAPTURE_ENABLED, user);"
  );
}

// Add tab button
const extensionTabHtml = `
              {browserCaptureEnabled && (
                <button 
                  onClick={() => setActiveTab('extension')}
                  className={\`px-3 py-1 text-xs font-bold rounded-md transition-colors \${activeTab === 'extension' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}\`}
                >
                  Extension
                </button>
              )}
            </div>
`;
content = content.replace(
  /<\/button>\s*<\/div>\s*\)}/m,
  "</button>\n" + extensionTabHtml + "\n          )}"
);

// Add tab content
const tabContentHtml = `
      {activeTab === 'extension' && browserCaptureEnabled && (
        <BrowserCaptureSettings />
      )}
`;

content = content.replace(
  /<\/div>\s*<\/div>\s*\)}/g,
  "</div>\n              ))}\n            </div>\n          )}\n        </div>\n      )}\n" + tabContentHtml
);

// Fix potential replacement issues by ensuring the rendering is well-formed.
// It's safer to just inject it right before the final `</div>\n  );\n}`.
const finalDivIndex = content.lastIndexOf('</div>');
content = content.substring(0, finalDivIndex) + tabContentHtml + '\n    </div>\n  );\n}';

fs.writeFileSync(file, content, 'utf8');
console.log('Updated CaptureInbox.jsx for Browser Extension settings');
