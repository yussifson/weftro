const fs = require('fs');
let c = fs.readFileSync('src/components/ui/orbit-loader.jsx', 'utf8');
c = c.replace(/className=\{orbit-loader orbit-loader-- \}/g, 'className={`orbit-loader orbit-loader--${size} ${className}`}');
// And just to be safe, replace the original bad one if it somehow reverted
c = c.replace(/className=\{orbit-loader orbit-loader-- \+ size \+   \+ className\}/g, 'className={`orbit-loader orbit-loader--${size} ${className}`}');

fs.writeFileSync('src/components/ui/orbit-loader.jsx', c);
