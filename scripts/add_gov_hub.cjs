const fs = require('fs');
const file = 'src/pages/clipad/IntegrationsHub.jsx';
let c = fs.readFileSync(file, 'utf8');

if (!c.includes('GovernanceSettings')) {
  c = c.replace(
    "import ConnectSettings from '@/components/clipad/features/ConnectSettings';",
    "import ConnectSettings from '@/components/clipad/features/ConnectSettings';\nimport GovernanceSettings from '@/components/clipad/features/GovernanceSettings';"
  );
}

// Add the tab button
const govTab = `
                  <button 
                    onClick={() => setActiveTab('governance')}
                    className={\`pb-3 px-1 text-sm font-bold border-b-2 transition-colors \${activeTab === 'governance' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}\`}
                  >
                    Governance
                  </button>
              </div>`;
c = c.replace(/              <\/div>\r?\n            <\/div>/, govTab + "\n            </div>");

// Add the rendering logic to the ternary
const govRender = `) : activeTab === 'governance' ? (
            <GovernanceSettings />
          `;
c = c.replace(/\) : activeTab === 'connect' && isConnectEnabled \? \(/, govRender + ") : activeTab === 'connect' && isConnectEnabled ? (");

fs.writeFileSync(file, c);
console.log('Governance tab added to IntegrationsHub');
