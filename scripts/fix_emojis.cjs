const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'pages', 'clipad', 'CliPadDashboard.jsx');
let content = fs.readFileSync(file, 'utf8');

// Remove BOM if present
if (content.charCodeAt(0) === 0xFEFF) {
  content = content.slice(1);
}

// Replace the corrupted emoji function with proper Unicode escape sequences
const oldFn = /const getGreetingEmoji = \(\) => \{[\s\S]*?const day = new Date\(\)\.getDate\(\);[\s\S]*?return emojis\[\(day - 1\) % emojis\.length\];[\s\S]*?\};/;

const newFn = `const getGreetingEmoji = () => {
    const emojis = [
      '\\u{1F44B}', '\\u{2728}', '\\u{1F680}', '\\u{1F31F}', '\\u{1F389}',
      '\\u{1F4A1}', '\\u{1F525}', '\\u{1F64C}', '\\u{1F60E}', '\\u{2615}',
      '\\u{1F4AA}', '\\u{1F3AF}', '\\u{1F308}', '\\u{26A1}', '\\u{1F388}',
      '\\u{1F60A}', '\\u{1F929}', '\\u{1F33A}', '\\u{1F340}', '\\u{1F3C6}',
      '\\u{1F48E}', '\\u{1F33B}', '\\u{1F91D}', '\\u{1F98B}', '\\u{1F973}',
      '\\u{1F64C}', '\\u{1F920}', '\\u{1F52E}', '\\u{1F38A}', '\\u{1F970}', '\\u{270C}\\u{FE0F}'
    ];
    const day = new Date().getDate();
    return emojis[(day - 1) % emojis.length];
  };`;

if (oldFn.test(content)) {
  content = content.replace(oldFn, newFn);
  fs.writeFileSync(file, content, 'utf8');
  console.log('✅ Fixed greeting emoji function');
} else {
  console.log('❌ Could not find the emoji function to replace');
  // Try a simpler approach - just find the lines
  const lines = content.split('\n');
  let startLine = -1, endLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const getGreetingEmoji')) startLine = i;
    if (startLine >= 0 && lines[i].trim() === '};' && i > startLine) {
      endLine = i;
      break;
    }
  }
  if (startLine >= 0 && endLine >= 0) {
    const replacement = newFn.split('\n');
    lines.splice(startLine, endLine - startLine + 1, ...replacement);
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
    console.log(`✅ Fixed emoji (lines ${startLine+1}-${endLine+1})`);
  } else {
    console.log('❌ Could not find emoji function at all');
  }
}
