const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src/pages/clipad/SearchHub.jsx');
let code = fs.readFileSync(file, 'utf8');

// Replace all the rainbow colors in RESULT_TYPE_MAP
code = code.replace(/color: 'text-[a-z]+-[0-9]+ dark:text-[a-z]+-[0-9]+', bg: 'bg-[a-z]+-[0-9]+\/10 border border-[a-z]+-[0-9]+\/20'/g, 
  "color: 'text-[#006065] dark:text-[#fad503]', bg: 'bg-[#006065]/10 dark:bg-[#006065]/30 border border-[#006065]/20'"
);

fs.writeFileSync(file, code);
console.log('Search results rainbow colors neutralized.');
