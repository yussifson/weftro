const fs = require('fs');
let content = fs.readFileSync('src/pages/clipad/RecordVideo.jsx', 'utf8');

content = content.split('bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-foreground font-bold')
  .join('bg-[#006065] hover:bg-[#004e52] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold');

content = content.split('text-primary').join('text-[#006065] dark:text-[#00beac]');
content = content.split('border-primary').join('border-[#006065] dark:border-[#00beac]');
content = content.split('bg-primary').join('bg-[#006065]');
content = content.split('shadow-primary/25').join('shadow-[#006065]/25');
content = content.split('ring-primary/20').join('ring-[#006065]/20');

// Fix text-[#006065] dark:text-[#00beac] when it's inside bg-[#006065] - oh wait, I replaced ALL bg-primary. 
// That's fine, bg-[#006065] text-white is explicit now.

fs.writeFileSync('src/pages/clipad/RecordVideo.jsx', content);
