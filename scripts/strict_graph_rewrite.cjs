const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src/pages/clipad/KnowledgeGraph.jsx');
let code = fs.readFileSync(file, 'utf8');

// 1. AI Insights button
code = code.replace(/bg-\[#00beac\] hover:bg-\[#00beac\]\/90 text-\[#00beac\]/g, 'bg-[#fad503] hover:bg-[#fad503]/90 text-[#006065]');

// 2. Focus borders
code = code.replace(/focus:border-\[#00beac\]/g, 'focus:border-[#fad503]');

// 3. Search input bg
code = code.replace(/bg-white text-white border border-white\/15\/80/g, 'bg-white/10 text-white border border-white/20');
code = code.replace(/border-white\/15\/80/g, 'border-white/15');

// 4. Spinners
code = code.replace(/text-violet-500/g, 'text-[#fad503]');

// 5. AI Insight Panel header icon bg
code = code.replace(/bg-\[#00beac\]\/20/g, 'bg-black/20');

// 6. Node Selection Outline
code = code.replace(/borderColor: selected \? '#00beac' : color/g, "borderColor: selected ? '#fad503' : color");
code = code.replace(/boxShadow: selected \? '0 0 0 3px #00beac, 0 4px 24px rgba\\(0,0,0,0\.3\\)' : '0 4px 12px rgba\\(0,0,0,0\.15\\)'/g, "boxShadow: selected ? '0 0 0 3px #fad503, 0 4px 24px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.15)'");

// 7. Graph Background Grid Dots
code = code.replace(/#6366F140/g, '#00606540');
code = code.replace(/#6366F120/g, '#00606520');

// 8. Back button navigation route logic check:
// Wait, the back button goes to `/integrations`. It should probably go to `/capture` to match our route updates, though it will auto-redirect anyway.
code = code.replace(/navigate\('\/integrations'\)/g, "navigate('/capture')");

fs.writeFileSync(file, code);
console.log('Graph page strictly themed.');
