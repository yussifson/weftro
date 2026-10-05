const fs = require('fs');
let c = fs.readFileSync('src/components/ui/orbit-loader.jsx', 'utf8');
c = c.replace(/<style>\{([\s\S]*?)\}<\/style>/g, '<style>{`$1`}</style>');
fs.writeFileSync('src/components/ui/orbit-loader.jsx', c);
