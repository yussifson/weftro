const fs = require('fs');
let content = fs.readFileSync('src/pages/clipad/CliPadBilling.jsx', 'utf8');

// Replace Downgrade button logic
content = content.replace(
  /if \(targetPlan === 'free'\) return 'Downgrade to Free';\s*return `Downgrade to \$\{targetPlan\.charAt\(0\)\.toUpperCase\(\) \+ targetPlan\.slice\(1\)\}`;/g,
  "return 'Downgrade';"
);

// Replace Upgrade button logic
content = content.replace(
  /if \(targetPlan === 'free'\) return 'Upgrade to Free';\s*return `Upgrade to \$\{targetPlan\.charAt\(0\)\.toUpperCase\(\) \+ targetPlan\.slice\(1\)\}`;/g,
  "return 'Upgrade';"
);

// Fix Custom plan button
content = content.replace(
  /'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md'/g,
  "'bg-[#006065] hover:bg-[#004e52] text-white shadow-md'"
);
content = content.replace(
  /className={`w-full mt-8 py-2 rounded-xl font-semibold border/g,
  "className={`w-full mt-auto py-2.5 rounded-lg text-sm font-semibold border"
);

// Fix free/enterprise default buttons so they have a consistent border and look like a secondary action (since Pro is primary)
content = content.replace(
  /'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-\[#006065\] dark:hover:border-\[#fad503\] text-slate-900 dark:text-white'/g,
  "'bg-white dark:bg-slate-900 border border-[#006065]/30 hover:border-[#006065] dark:border-slate-700 dark:hover:border-[#fad503] text-slate-900 dark:text-white shadow-sm'"
);

fs.writeFileSync('src/pages/clipad/CliPadBilling.jsx', content);
