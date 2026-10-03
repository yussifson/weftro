const fs = require('fs');
let chat = fs.readFileSync('src/pages/clipad/ClipadChat.jsx', 'utf8');

// The main messages area background
chat = chat.replace(/bg-\[#f8fafc\] dark:bg-\[#006065\]/g, 'bg-slate-50 dark:bg-slate-950');
chat = chat.replace(/bg-transparent border border-white\/10 shadow-inner/g, 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]');

// Fix Chat Bubbles
chat = chat.replace(
  /isMe \? "ml-auto flex-row-reverse" : "mr-auto"/g,
  'isMe ? "ml-auto flex-row-reverse" : "mr-auto"'
);

chat = chat.replace(
  /"relative px-3.5 py-2 text-\[14.5px\] leading-snug rounded-\[14px\] shadow-sm",\s*isMe\s*\?\s*"bg-\[#00beac\] text-\[#00beac\] font-medium rounded-tr-none"\s*:\s*"bg-\[#006065\] text-white border border-white\/15 rounded-tl-none border border-black\/5 dark:border-white\/5"/gm,
  `"relative px-4 py-2.5 text-[14.5px] leading-relaxed rounded-2xl shadow-sm",
 isMe 
 ? "bg-[#006065] text-[#fad503] font-medium rounded-br-sm shadow-[0_2px_10px_rgba(0,96,101,0.2)]" 
 : "bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-bl-sm"`
);

// Strip out the SVG tails
chat = chat.replace(/\{showTail && \([\s\S]*?<\/svg>\s*\)\}/gm, '');

// Fix the reply block inside the bubble
chat = chat.replace(/bg-black\/20 border-l-4 border-\[#00beac\]/g, 'bg-black/10 dark:bg-white/10 border-l-4 border-current');
chat = chat.replace(/text-\[#fad503\] block/g, 'text-current opacity-90 block');

// Header of the chat messages area
chat = chat.replace(/bg-white\/10 dark:bg-white\/10 backdrop-blur-md px-4 py-3 flex justify-between items-center border-b border-black\/5 dark:border-white\/10 shrink-0 sticky top-0 z-10/g, 'bg-white/95 dark:bg-slate-950/95 backdrop-blur-md px-4 py-3 flex justify-between items-center border-b border-slate-200 dark:border-slate-800 shrink-0 sticky top-0 z-10');

// Input Area
chat = chat.replace(/bg-transparent border border-white\/15 p-2 rounded-xl/g, 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-[0_-5px_30px_rgba(0,0,0,0.03)] p-3 rounded-xl mx-2 mb-2');
chat = chat.replace(/bg-transparent border-none focus:ring-0 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white\/40 resize-none min-h-\[44px\]/g, 'bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-500 resize-none min-h-[44px]');

// Header text colors in the main chat area (which was white/10)
chat = chat.replace(/text-white dark:text-white font-bold tracking-tight/g, 'text-slate-900 dark:text-white font-bold tracking-tight');
chat = chat.replace(/text-\[12px\] text-white\/70/g, 'text-[12px] text-slate-500 dark:text-slate-400');
chat = chat.replace(/text-white\/80 hover:text-white/g, 'text-slate-500 hover:text-slate-900 dark:hover:text-white');

fs.writeFileSync('src/pages/clipad/ClipadChat.jsx', chat);
