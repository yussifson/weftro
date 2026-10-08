const fs = require('fs');
const path = require('path');

const dirsToScan = [
  path.join(__dirname, 'src', 'components', 'clipad'),
  path.join(__dirname, 'src', 'pages', 'clipad')
];

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('emerald')) {
        content = content.replace(/text-emerald-500/g, 'text-[#006065]');
        content = content.replace(/text-emerald-600/g, 'text-[#006065]');
        content = content.replace(/bg-emerald-500/g, 'bg-[#006065]');
        content = content.replace(/bg-emerald-600/g, 'bg-[#006065]');
        content = content.replace(/border-emerald-500/g, 'border-[#006065]');
        content = content.replace(/border-emerald-600/g, 'border-[#006065]');
        content = content.replace(/ring-emerald-500/g, 'ring-[#006065]');
        content = content.replace(/text-emerald-400/g, 'text-[#00beac]');
        content = content.replace(/bg-emerald-50/g, 'bg-[#006065]/10');
        content = content.replace(/bg-emerald-100/g, 'bg-[#006065]/20');
        content = content.replace(/text-emerald-700/g, 'text-[#004e52]');
        content = content.replace(/bg-emerald-900\/20/g, 'bg-[#004e52]/20');
        content = content.replace(/bg-emerald-900\/30/g, 'bg-[#004e52]/30');
        
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Fixed', fullPath);
      }
    }
  }
}

dirsToScan.forEach(processDirectory);
