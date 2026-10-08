const fs = require('fs');

const files = [
  'src/lib/clipadOrganizationalAnalyticsService.js',
  'src/lib/clipadOrganizationalLearningService.js',
  'src/lib/clipadAutomationService.js'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\\`/g, '`');
  content = content.replace(/\\\$/g, '$');
  fs.writeFileSync(file, content, 'utf8');
  console.log(`Unescaped ${file}`);
}
