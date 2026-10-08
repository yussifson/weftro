const fs = require('fs');
const file = 'src/pages/clipad/IntegrationsHub.jsx';
let c = fs.readFileSync(file, 'utf8');

// 1. Remove the extra closing </div> in API notice
c = c.replace(
`          </div>
          </div>
        </div>

      {/*`,
`          </div>
        </div>

      {/*`
);

// 2. Properly close the activeTab ternary and inject ConnectSettings
// Notice how it currently says:
//         ) : null}
//
//         {/* API credentials notice */}
//         <div className="bg-amber-500/5 ...">...</div>
//       {/* A??,A??, Scope Selector Modal
c = c.replace(
  /\{\/\* API credentials notice \*\/\}([\s\S]*?)<\/div>\s*\{\/\* A/m,
  "{/* API credentials notice */}$1</div>\n            </>\n          ) : activeTab === 'connect' && isConnectEnabled ? (\n            <ConnectSettings />\n          ) : null}\n      {/* A"
);

fs.writeFileSync(file, c);
console.log('Fixed syntax error in IntegrationsHub.jsx');
