const fs = require('fs');
const file = 'src/pages/clipad/IntegrationsHub.jsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
`          </div>
          </div>
        </div>`,
`          </div>
        </div>`
);

const index = c.indexOf('{/*');
// We need to find the specific one for Scope Selector
const scopeIndex = c.indexOf('Scope Selector Modal');
if (scopeIndex > -1) {
  // Backtrack to the start of that comment
  const commentStart = c.lastIndexOf('{/*', scopeIndex);
  
  // Inject the closing right before the comment
  const before = c.substring(0, commentStart);
  const after = c.substring(commentStart);
  
  c = before + "\n            </>\n          ) : activeTab === 'connect' && isConnectEnabled ? (\n            <ConnectSettings />\n          ) : null}\n" + after;
}

fs.writeFileSync(file, c);
console.log('Fixed syntax using indexOf');
