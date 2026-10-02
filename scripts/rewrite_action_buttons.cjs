const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src/pages/clipad/CliPadDashboard.jsx');
let code = fs.readFileSync(file, 'utf8');

const start = code.indexOf('{/* Quick Actions');
const end = code.indexOf('{/* Main content grid */}');

if (start !== -1 && end !== -1) {
    const before = code.substring(0, start);
    const after = code.substring(end);
    
    const newActions = `{/* Quick Actions - Premium Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          {/* New Meeting */}
          <button
            onClick={startInstantMeeting}
            disabled={isCreatingMeeting}
            className="flex items-center gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-[#006065]/30 active:scale-[0.98] transition-all duration-200 group text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-[#006065] text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              {isCreatingMeeting
                ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <Video className="w-5 h-5 text-[#fad503]" />}
            </div>
            <div>
              <span className="block text-sm font-extrabold text-slate-900 dark:text-white leading-tight mb-0.5">New Meeting</span>
              <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Start an instant room</span>
            </div>
          </button>

          {/* Record Video */}
          <button
            onClick={() => navigate('/record')}
            className="flex items-center gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-[#006065]/30 active:scale-[0.98] transition-all duration-200 group text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-[#006065] text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Camera className="w-5 h-5 text-[#fad503]" />
            </div>
            <div>
              <span className="block text-sm font-extrabold text-slate-900 dark:text-white leading-tight mb-0.5">Record Video</span>
              <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Capture your screen</span>
            </div>
          </button>

          {/* Team Spaces */}
          <button
            onClick={() => navigate('/spaces')}
            className="flex items-center gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-[#fad503]/50 active:scale-[0.98] transition-all duration-200 group text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-[#fad503] text-[#006065] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5 font-bold" />
            </div>
            <div>
              <span className="block text-sm font-extrabold text-slate-900 dark:text-white leading-tight mb-0.5">Team Spaces</span>
              <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">Browse workspaces</span>
            </div>
          </button>
        </div>

        `;
        
    fs.writeFileSync(file, before + newActions + after);
    console.log('Action buttons rewritten.');
} else {
    console.log('Could not find boundaries.');
}
