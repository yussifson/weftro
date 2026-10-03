const fs = require('fs');
let m = fs.readFileSync('src/pages/clipad/MeetingsList.jsx', 'utf8');

const target = `                </div>
              </div>
            ))}`;

const replacement = `                </div>
              </div>
              </div>
            ))}`;

m = m.replace(target, replacement);

fs.writeFileSync('src/pages/clipad/MeetingsList.jsx', m);
