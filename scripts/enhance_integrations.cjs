const fs = require('fs');
const path = 'src/pages/clipad/IntegrationsHub.jsx';
let content = fs.readFileSync(path, 'utf8');

// Replace hardcoded legacy colors with modern Shadcn variables
content = content.replace(/border-\[#006065\]/g, 'border-primary/50');
content = content.replace(/ring-\[#006065\]\/10/g, 'ring-primary/20');
content = content.replace(/bg-\[#006065\]/g, 'bg-primary');
content = content.replace(/text-\[#006065\]/g, 'text-primary');

content = content.replace(/dark:bg-\[#131A2C\]\/10/g, 'dark:bg-primary/10');
content = content.replace(/dark:text-\[#fad503\]/g, 'dark:text-primary-foreground text-white');
content = content.replace(/dark:bg-\[#fad503\]/g, 'dark:bg-primary-foreground bg-white');

// Enhance the tabs layout
const oldTabs = `<div className="flex gap-4 mt-8 border-b border-white/10">
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

                {isConnectEnabled && (
                  <button 
                    onClick={() => setActiveTab('connect')}
                    className={\`pb-3 px-1 text-sm font-bold border-b-2 transition-colors \${activeTab === 'connect' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}\`}
                  >
                    Developer API
                  </button>
                )}
                {isRoleAwareEnabled && (
                  <button 
                    onClick={() => setActiveTab('governance')}
                    className={\`pb-3 px-1 text-sm font-bold border-b-2 transition-colors \${activeTab === 'governance' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}\`}
                  >
                    Governance
                  </button>
                )}
            </div>`;

const newTabs = `<div className="flex p-1 bg-secondary/50 rounded-xl max-w-fit mt-8 shadow-sm border border-border/50">
              <button 
                onClick={() => setActiveTab('connections')}
                className={\`px-4 py-2 text-sm font-semibold rounded-lg transition-all \${activeTab === 'connections' ? 'bg-background text-foreground shadow-sm ring-1 ring-border/50' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'}\`}
              >
                Connections & Sources
              </button>
              <button 
                onClick={() => setActiveTab('inbox')}
                className={\`px-4 py-2 text-sm font-semibold rounded-lg transition-all \${activeTab === 'inbox' ? 'bg-background text-foreground shadow-sm ring-1 ring-border/50' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'}\`}
              >
                Capture Inbox
                </button>

                {isConnectEnabled && (
                  <button 
                    onClick={() => setActiveTab('connect')}
                    className={\`px-4 py-2 text-sm font-semibold rounded-lg transition-all \${activeTab === 'connect' ? 'bg-background text-foreground shadow-sm ring-1 ring-border/50' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'}\`}
                  >
                    Developer API
                  </button>
                )}
                {isRoleAwareEnabled && (
                  <button 
                    onClick={() => setActiveTab('governance')}
                    className={\`px-4 py-2 text-sm font-semibold rounded-lg transition-all \${activeTab === 'governance' ? 'bg-background text-foreground shadow-sm ring-1 ring-border/50' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'}\`}
                  >
                    Governance
                  </button>
                )}
            </div>`;

content = content.replace(oldTabs, newTabs);

fs.writeFileSync(path, content);
console.log('IntegrationsHub UI enhanced!');
