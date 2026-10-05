const fs = require('fs');
const path = require('path');

// Files where bg-[#006065] is used as SIDEBAR background → dark:bg-[#0D1626]
const sidebarFiles = [
  'src/components/clipad/ClipadSidebar.jsx',
  'src/components/clipad/ClipadMobileNav.jsx',
];

// Files where bg-[#006065] is used as TOP NAV / CANVAS → dark:bg-[#0A0F1C]
const canvasFiles = [
  'src/components/clipad/ClipadTopNav.jsx',
  'src/components/layout/ClipadLayout.jsx',
  'src/components/layout/ClipadAdminLayout.jsx',
];

// ALL remaining files → bg-[#006065] surfaces become dark:bg-[#131A2C]
const cardFiles = fs.readdirSync('src', { recursive: true })
  .filter(f => f.endsWith('.jsx'))
  .map(f => path.join('src', f))
  .filter(f => {
    try {
      return fs.readFileSync(f, 'utf8').includes('bg-[#006065]');
    } catch { return false; }
  })
  .filter(f => !sidebarFiles.includes(f.replace(/\\/g, '/')) && !canvasFiles.includes(f.replace(/\\/g, '/')));

let totalChanges = 0;

function processFile(filePath, darkBg) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changes = 0;
  
  // Replace bg-[#006065] that does NOT already have dark:bg- after it
  const newContent = content.replace(/bg-\[#006065\](?!\s+dark:bg-)/g, (match) => {
    changes++;
    return `bg-[#006065] ${darkBg}`;
  });
  
  if (changes > 0) {
    fs.writeFileSync(filePath, newContent);
    console.log(`  ${filePath}: ${changes} replacements → ${darkBg}`);
    totalChanges += changes;
  }
}

// Special handling for sidebar dropdown menus
function processSidebar(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changes = 0;
  
  // For DropdownMenuContent, use card bg
  content = content.replace(
    /bg-\[#006065\](?=\s+border-white\/15\s+text-white\s+shadow)/g,
    () => { changes++; return 'bg-[#006065] dark:bg-[#131A2C]'; }
  );
  
  // All other bg-[#006065] in sidebar → sidebar dark bg
  content = content.replace(/bg-\[#006065\](?!\s+dark:bg-)/g, (match) => {
    changes++;
    return 'bg-[#006065] dark:bg-[#0D1626]';
  });
  
  if (changes > 0) {
    fs.writeFileSync(filePath, content);
    console.log(`  ${filePath}: ${changes} replacements → sidebar dark bg`);
    totalChanges += changes;
  }
}

console.log('=== Sidebar files ===');
sidebarFiles.forEach(f => {
  if (fs.existsSync(f)) processSidebar(f);
});

console.log('\n=== Canvas/Nav files ===');
canvasFiles.forEach(f => {
  if (fs.existsSync(f)) processFile(f, 'dark:bg-[#0A0F1C]');
});

console.log('\n=== Card/Surface files ===');
cardFiles.forEach(f => {
  if (fs.existsSync(f.replace(/\\/g, '/'))) processFile(f, 'dark:bg-[#131A2C]');
  else if (fs.existsSync(f)) processFile(f, 'dark:bg-[#131A2C]');
});

console.log(`\n✅ Total: ${totalChanges} replacements across all files`);
