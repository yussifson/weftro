const fs = require('fs');
const file = 'src/pages/clipad/IntegrationsHub.jsx';
let content = fs.readFileSync(file, 'utf8');
const old = content;
content = content.split('Ã¢â‚¬â€').join('—');
content = content.split('Ã¢â‚¬Â¢').join('•');
content = content.split('Ã¢â€â‚¬').join('─');
content = content.split('Ã¢â€ â‚¬').join('─');
if (content !== old) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Replaced literally in IntegrationsHub!');
} else {
    console.log('No change in IntegrationsHub!');
}
