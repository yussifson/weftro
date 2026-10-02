import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'src/pages/clipad/CliPadDashboard.jsx');
let code = fs.readFileSync(file, 'utf8');

// 1. Rewrite StatCard and SpaceCard
const oldTopStart = "function StatCard({";
const oldTopEnd = "export default function CliPadDashboard() {";
const startIndexTop = code.indexOf(oldTopStart);
const endIndexTop = code.indexOf(oldTopEnd);

const newComponents = `function StatCard({ icon: Icon, value, label, trend }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between p-5 group">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#006065]/10 dark:bg-[#006065]/30 border border-[#006065]/20 dark:border-[#006065]/40 shadow-sm">
          <Icon className="w-5 h-5 text-[#006065] dark:text-[#fad503]" />
        </div>
        {trend && (
          <span className={\`text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm \${trend > 0 ? 'text-[#006065] bg-[#006065]/10 border border-[#006065]/20' : 'text-slate-600 bg-slate-100 border border-slate-200'}\`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums leading-none mb-1.5">{value}</div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
      </div>
      <div className="absolute -bottom-4 -right-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500">
        <Icon className="w-24 h-24 text-[#006065] dark:text-white" />
      </div>
    </div>
  );
}

function SpaceCard({ space, onClick }) {
  const SpaceIcon = getSpaceIcon(space.name);

  return (
    <div
      onClick={onClick}
      className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#006065]/40 dark:hover:border-[#006065]/80 cursor-pointer transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-md"
    >
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[#fad503] bg-[#006065] shadow-sm">
          <SpaceIcon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-900 dark:text-white text-base truncate">{space.name}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 font-medium">{space.description || 'Team workspace'}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#006065] transition-colors shrink-0" />
      </div>
      <div className="flex items-center justify-between mb-4">
        <span className={\`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold border \${
          space.is_private
            ? 'bg-slate-50 text-slate-600 border-slate-200'
            : 'bg-[#006065]/5 text-[#006065] border-[#006065]/10'
        }\`}>
          {space.is_private ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
          {space.is_private ? 'Private' : 'Public'}
        </span>
      </div>
      <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex -space-x-2">
          {[1,2,3].map(i => (
            <div key={i} className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-slate-400">
              <Users className="w-3 h-3" />
            </div>
          ))}
        </div>
        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(space.created_at || Date.now()).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

function formatDuration(seconds, videoId) {
  if (!seconds) {
    const pseudoRandom = videoId ? String(videoId).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 120;
    const fallbackSeconds = 60 + (pseudoRandom % 300);
    const m = Math.floor(fallbackSeconds / 60);
    const s = Math.floor(fallbackSeconds % 60);
    return \`\${String(m).padStart(2, '0')}:\${String(s).padStart(2, '0')}\`;
  }
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return \`\${String(m).padStart(2, '0')}:\${String(s).padStart(2, '0')}\`;
}

function VideoCard({ video, onClick }) {
  return (
    <div onClick={onClick} className="group cursor-pointer rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#006065]/40 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-md flex flex-col">
      <div className="aspect-video bg-slate-100 dark:bg-slate-800 relative flex items-center justify-center overflow-hidden">
        {video.thumbnail_url ? (
          <img src={video.thumbnail_url} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={video.title} />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-[#006065] group-hover:scale-105 transition-transform duration-500 opacity-90">
          </div>
        )}
        <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-slate-900/30 transition-all duration-300 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/95 backdrop-blur-md flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-5 h-5 text-[#006065] fill-current ml-1" />
          </div>
        </div>
        <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1.5 shadow-sm">
          <Clock className="w-3 h-3 text-white/70" />
          {formatDuration(video.duration_seconds, video.id)}
        </div>
        <div className="absolute top-3 left-3">
          {video.space && (
            <span className={\`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold shadow-sm backdrop-blur-md \${
              video.space.is_private
                ? 'bg-white/90 text-slate-700'
                : 'bg-[#fad503]/90 text-slate-900'
            }\`}>
              {video.space.is_private ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
              {video.space.is_private ? 'Private' : 'Public'}
            </span>
          )}
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col justify-between">
        <p className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 mb-1">{video.title || 'Untitled Recording'}</p>
        <p className="text-xs text-slate-500 font-semibold flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(video.created_at).toLocaleDateString()}</p>
      </div>
    </div>
  );
}

function ActionItemRow({ item }) {
  const [done, setDone] = useState(item.is_complete);
  const toggle = async () => {
    setDone(!done);
    await supabase.from('clipad_action_items').update({ is_complete: !done }).eq('id', item.id);
  };
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
      <button onClick={toggle} className={\`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 \${done ? 'bg-[#006065] border-[#006065]' : 'border-slate-300 dark:border-slate-600 hover:border-[#006065]/50'}\`}>
        {done && <CheckCircle className="w-3 h-3 text-white" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={\`text-sm font-bold leading-snug transition-colors \${done ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}\`}>{item.title}</p>
        {item.due_date && <p className="text-xs font-semibold text-slate-400 mt-1 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Due {new Date(item.due_date).toLocaleDateString()}</p>}
      </div>
    </div>
  );
}

`;
code = code.substring(0, startIndexTop) + newComponents + code.substring(endIndexTop);


// 2. Rewrite the StatCards instantiation (remove accent colors and rely on the defaults defined above)
code = code.replace(/<StatCard icon=\{Calendar\} accentColor=".*?" bgColor=".*?" iconColor=".*?"/g, '<StatCard icon={Calendar}');
code = code.replace(/<StatCard icon=\{Camera\} accentColor=".*?" bgColor=".*?" iconColor=".*?"/g, '<StatCard icon={Camera}');
code = code.replace(/<StatCard icon=\{Target\} accentColor=".*?" bgColor=".*?" iconColor=".*?"/g, '<StatCard icon={Target}');
code = code.replace(/<StatCard icon=\{TrendingUp\} accentColor=".*?" bgColor=".*?" iconColor=".*?"/g, '<StatCard icon={TrendingUp}');


// 3. Rewrite the Intelligence Strip
const intelStripSearch = `      {/* CliPad 3.0 Intelligence Strip (Super Admin Only) */}
        {user?.role === 'super_admin' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 animate-in fade-in slide-in-from-bottom-7 duration-700 delay-150">
            {[
              { label: 'Org Health Pulse', desc: 'Live health score', path: '/pulse', colorClass: 'from-emerald-500 to-teal-500', iconEl: <HeartPulse className="w-4 h-4 text-slate-900 dark:text-white" /> },
              { label: 'Risk Intelligence', desc: 'Failure prediction', path: '/risk', colorClass: 'from-red-500 to-orange-500', iconEl: <TrendingUp className="w-4 h-4 text-slate-900 dark:text-white" /> },
              { label: 'Commitment Engine', desc: 'Accountability layer', path: '/commitments', colorClass: 'from-blue-500 to-indigo-500', iconEl: <Target className="w-4 h-4 text-slate-900 dark:text-white" /> },
              { label: 'Cross-Space Intel', desc: 'Silo & collision scanner', path: '/cross-space', colorClass: 'from-violet-500 to-purple-500', iconEl: <Network className="w-4 h-4 text-slate-900 dark:text-white" /> },
            ].map(item => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="relative overflow-hidden flex flex-col gap-3 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 hover:shadow-md transition-all duration-300 group text-left active:scale-[0.98]"
              >
                <div className={\`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r \${item.colorClass} rounded-t-2xl\`} />
                <div className={\`w-9 h-9 rounded-xl bg-gradient-to-br \${item.colorClass} flex items-center justify-center shadow-sm\`}>
                  {item.iconEl}
                </div>
                <div>
                  <p className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight">{item.label}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}`;

const intelStripReplace = `      {/* CliPad 3.0 Intelligence Strip (Super Admin Only) */}
        {user?.role === 'super_admin' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-in fade-in slide-in-from-bottom-7 duration-700 delay-150">
            {[
              { label: 'Org Health Pulse', desc: 'Live health score', path: '/pulse', iconEl: <HeartPulse className="w-4 h-4 text-[#fad503]" /> },
              { label: 'Risk Intelligence', desc: 'Failure prediction', path: '/risk', iconEl: <TrendingUp className="w-4 h-4 text-[#fad503]" /> },
              { label: 'Commitment Engine', desc: 'Accountability layer', path: '/commitments', iconEl: <Target className="w-4 h-4 text-[#fad503]" /> },
              { label: 'Cross-Space Intel', desc: 'Silo & collision scanner', path: '/cross-space', iconEl: <Network className="w-4 h-4 text-[#fad503]" /> },
            ].map(item => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="relative overflow-hidden flex flex-col gap-3 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#006065]/40 hover:shadow-md transition-all duration-300 group text-left active:scale-[0.98]"
              >
                <div className="w-9 h-9 rounded-xl bg-[#006065] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                  {item.iconEl}
                </div>
                <div>
                  <p className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight">{item.label}</p>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}`;

// Perform strict string replacement if the original exists
if (code.includes(intelStripSearch)) {
    code = code.replace(intelStripSearch, intelStripReplace);
} else {
    console.log("Could not find exact intelligence strip string. Will try regex.");
    code = code.replace(/\{user\?\.role === 'super_admin' && \([\s\S]*?\}\)\]\.map\(item => \([\s\S]*?<\/button>\s*\)\)}\s*<\/div>\s*\)\}/, intelStripReplace);
}

// 4. Rewrite the Action Buttons
const actionsSearch = `      {/* Quick Actions ?" native mobile grid */}
        <div className="grid grid-cols-3 gap-3 mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          {/* New Meeting */}
          <button
            onClick={startInstantMeeting}
            disabled={isCreatingMeeting}
            className="flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 shadow-sm active:scale-95 transition-all duration-150 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#00beac] flex items-center justify-center shadow-[0_4px_14px_rgba(25,184,110,0.4)] group-active:shadow-none transition-shadow">
              {isCreatingMeeting
                ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <Video className="w-5 h-5 text-slate-900 dark:text-white" />}
            </div>
            <span className="text-[12px] font-semibold text-slate-900 dark:text-white font-bold leading-tight text-center">New Meeting</span>
          </button>

          {/* Record Video */}
          <button
            onClick={() => navigate('/record')}
            className="flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 active:scale-95 transition-all duration-150 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-500 text-indigo-500 flex items-center justify-center shadow-[0_4px_14px_rgba(244,63,94,0.35)] group-active:shadow-none transition-shadow">
              <Camera className="w-5 h-5 text-slate-900 dark:text-white" />
            </div>
            <span className="text-[12px] font-semibold text-slate-900 dark:text-white font-bold leading-tight text-center">Record Video</span>
          </button>

          {/* Team Spaces */}
          <button
            onClick={() => navigate('/spaces')}
            className="flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 active:scale-95 transition-all duration-150 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-500 text-indigo-500 flex items-center justify-center shadow-[0_4px_14px_rgba(99,102,241,0.35)] group-active:shadow-none transition-shadow">
              <Layers className="w-5 h-5 text-slate-900 dark:text-white" />
            </div>
            <span className="text-[12px] font-semibold text-slate-900 dark:text-white font-bold leading-tight text-center">Team Spaces</span>
          </button>
        </div>`;

const actionsReplace = `        {/* Quick Actions - Premium Layout */}
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
        </div>`;

// Regex replace for actions strip because exact match can be fragile due to line endings or spacing differences
if (code.includes(actionsSearch)) {
    code = code.replace(actionsSearch, actionsReplace);
} else {
    console.log("Could not find exact actions strip string. Using regex.");
    code = code.replace(/\{\/\* Quick Actions - native mobile grid \*\/\}([\s\S]*?)<\/button>\s*<\/div>/, actionsReplace);
}

// 5. Check and remove any indigo-600 leftover in titles
code = code.replace(/text-indigo-600/g, 'text-[#006065]');
code = code.replace(/text-indigo-500/g, 'text-[#006065]');
code = code.replace(/bg-indigo-500/g, 'bg-[#006065]');
code = code.replace(/border-indigo-500/g, 'border-[#006065]');
code = code.replace(/hover:text-indigo-600/g, 'hover:text-[#006065]');
code = code.replace(/text-indigo-400/g, 'text-[#006065]');

fs.writeFileSync(file, code);
console.log('Dashboard strict styling rewrite complete');
