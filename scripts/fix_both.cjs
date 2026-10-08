const fs = require('fs');
let content = fs.readFileSync('src/pages/clipad/IntegrationsHub.jsx', 'utf8');

// 1. Remove bogus </>\n)}
const bogusTarget = `            </div>
            </>
          )}
      {/* Actions */}`;
const bogusReplacement = `            </div>
      {/* Actions */}`;
if (content.includes(bogusTarget)) {
  content = content.replace(bogusTarget, bogusReplacement);
  console.log('Removed bogus tags');
} else {
  console.log('Bogus tags not found');
}

// 2. Insert missing </div> after the main ternary
const ternaryTarget = `        </div>

            </>
          )}
{/*`;
const ternaryReplacement = `        </div>

            </>
          )}
      </div>
{/*`;
if (content.includes(ternaryTarget)) {
  content = content.replace(ternaryTarget, ternaryReplacement);
  console.log('Inserted missing </div>');
} else {
  console.log('Ternary target not found');
}

fs.writeFileSync('src/pages/clipad/IntegrationsHub.jsx', content, 'utf8');
