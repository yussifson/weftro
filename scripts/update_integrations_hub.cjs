const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'src', 'pages', 'clipad', 'IntegrationsHub.jsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add import
content = content.replace(
  "import { INTEGRATIONS, CATEGORIES } from '@/config/integrationsList';",
  "import { INTEGRATIONS, CATEGORIES } from '@/config/integrationsList';\nimport CaptureInbox from '@/components/clipad/features/CaptureInbox';"
);

// 2. Add activeTab state
content = content.replace(
  "const [activeView, setActiveView] = useState('hub');",
  "const [activeView, setActiveView] = useState('hub');\n  const [activeTab, setActiveTab] = useState('connections');"
);

// 3. Add tabs below stats row
const tabsHtml = `
            </div>
            
            <div className="flex gap-4 mt-8 border-b border-white/10">
              <button 
                onClick={() => setActiveTab('connections')}
                className={\`pb-3 px-1 text-sm font-bold border-b-2 transition-colors \${activeTab === 'connections' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}\`}
              >
                Connections & Sources
              </button>
              <button 
                onClick={() => setActiveTab('inbox')}
                className={\`pb-3 px-1 text-sm font-bold border-b-2 transition-colors \${activeTab === 'inbox' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}\`}
              >
                Capture Inbox
              </button>
            </div>
          </div>
`;
content = content.replace(/<\/div>\s*<\/div>\s*<\/div>\s*<div className="max-w-5xl mx-auto px-4 md:px-6 mt-8 space-y-8">/, tabsHtml + `\n      </div>\n      <div className="max-w-5xl mx-auto px-4 md:px-6 mt-8 space-y-8">`);

// 4. Wrap connections content in activeTab check
content = content.replace(
  '{/* Modern Tab Filters */}',
  `{activeTab === 'inbox' ? (\n          <CaptureInbox />\n        ) : (\n          <>\n            {/* Modern Tab Filters */}`
);

// 5. Close the fragment at the bottom
content = content.replace(
  '          </div>\n        </div>\n      </div>\n\n      {/* Modals */}',
  '          </div>\n        </div>\n          </>\n        )}\n      </div>\n\n      {/* Modals */}'
);


fs.writeFileSync(file, content, 'utf8');
console.log('Updated IntegrationsHub.jsx');
