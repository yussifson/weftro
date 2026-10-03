const fs = require('fs');
let c = fs.readFileSync('src/pages/clipad/RecordVideo.jsx', 'utf8');

// Fix the extra </div> — the action row replacement left 3 closing divs but only 2 were needed
// The pattern is: </div>\n            </div>\n            </div>\r\n\r\n            {lockType
// We need to remove one of those closing divs
c = c.replace(
  /(<\/div>\n            <\/div>)\n            <\/div>\r?\n\r?\n            \{lockType/,
  '$1\r\n\r\n            {lockType'
);

fs.writeFileSync('src/pages/clipad/RecordVideo.jsx', c);
console.log('Fixed extra </div>');
