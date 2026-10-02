const fs = require('fs');
let ia = fs.readFileSync('src/pages/clipad/IntegrationAnalytics.jsx', 'utf8');

ia = ia.replace(/bg="bg-emerald-50 dark:bg-emerald-500\/10"/g, 'bg="bg-[#006065]/10 dark:bg-[#006065]/30"');
ia = ia.replace(/color="text-emerald-500"/g, 'color="text-[#006065] dark:text-[#fad503]"');

ia = ia.replace(/bg="bg-amber-50 dark:bg-amber-500\/10"/g, 'bg="bg-[#006065]/10 dark:bg-[#006065]/30"');
ia = ia.replace(/color="text-amber-500"/g, 'color="text-[#006065] dark:text-[#fad503]"');

ia = ia.replace(/bg="bg-purple-50 dark:bg-purple-500\/10"/g, 'bg="bg-[#006065]/10 dark:bg-[#006065]/30"');
ia = ia.replace(/color="text-purple-500"/g, 'color="text-[#006065] dark:text-[#fad503]"');

ia = ia.replace(/bg="bg-\[#006065\]\/5 dark:bg-\[#006065\]\/20"/g, 'bg="bg-[#006065]/10 dark:bg-[#006065]/30"'); // the indigo one that was replaced earlier

fs.writeFileSync('src/pages/clipad/IntegrationAnalytics.jsx', ia);
