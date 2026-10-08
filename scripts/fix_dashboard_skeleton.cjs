const fs = require('fs');
const path = 'src/pages/clipad/CliPadDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /\{loading && stats\.meetings === 0 \? \(\s*<div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full animate-pulse">[\s\S]*?<\/div>\s*\)\s*:\s*\(/;

const newLoading = `{loading && stats.meetings === 0 ? (
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-2">
              <div className="h-8 w-64 bg-slate-200 dark:bg-white/5 rounded-lg animate-pulse" />
              <div className="h-4 w-96 bg-slate-100 dark:bg-white/5 rounded-lg animate-pulse delay-75" />
            </div>
            <div className="h-10 w-32 bg-slate-200 dark:bg-white/5 rounded-xl animate-pulse" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-36 bg-card border border-border/50 rounded-2xl p-5 flex flex-col justify-between shadow-sm animate-pulse relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 rounded-xl bg-secondary/50" />
                  <div className="w-6 h-6 rounded-md bg-secondary/30" />
                </div>
                <div className="space-y-2">
                  <div className="h-6 w-1/2 bg-secondary/60 rounded-md" />
                  <div className="h-4 w-3/4 bg-secondary/30 rounded-md" />
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center mb-4">
                <div className="h-6 w-48 bg-slate-200 dark:bg-white/5 rounded-lg animate-pulse" />
                <div className="h-4 w-24 bg-slate-100 dark:bg-white/5 rounded-lg animate-pulse" />
              </div>
              {[1,2,3].map(i => (
                <div key={i} className="h-20 bg-card border border-border/50 rounded-xl p-4 flex items-center gap-4 animate-pulse">
                  <div className="w-12 h-12 rounded-lg bg-secondary/50 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-1/3 bg-secondary/60 rounded-md" />
                    <div className="h-4 w-1/2 bg-secondary/30 rounded-md" />
                  </div>
                  <div className="w-20 h-8 rounded-lg bg-secondary/40 shrink-0" />
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <div className="h-6 w-32 bg-slate-200 dark:bg-white/5 rounded-lg animate-pulse mb-4" />
              <div className="h-[300px] bg-card border border-border/50 rounded-2xl p-5 animate-pulse flex flex-col gap-4">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary/50 shrink-0" />
                    <div className="flex-1 h-4 bg-secondary/40 rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (`;

if (regex.test(content)) {
  content = content.replace(regex, newLoading);
  fs.writeFileSync(path, content);
  console.log('CliPadDashboard.jsx loading skeleton updated!');
} else {
  console.log('Regex did not match.');
}
