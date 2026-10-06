const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'src', 'pages', 'clipad', 'CliPadDashboard.jsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/\{trend > 0 \? '[^']+' : '[^']+'\}/g, "{trend > 0 ? '\\u2191' : '\\u2193'}");
fs.writeFileSync(file, content, 'utf8');
console.log('Fixed trend arrows');
