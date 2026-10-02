import fs from 'fs';
import path from 'path';

let file = path.join(process.cwd(), 'src/pages/clipad/SpaceDashboard.jsx');
let content = fs.readFileSync(file, 'utf8');

// The block to replace starts with:
// {showMembers && (
//   <div className="fixed inset-0 z-50 flex justify-end">
//   <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setShowMembers(false)} />
//   <div className="relative w-full max-w-sm h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transform transition-transform animate-in slide-in-from-right duration-200">
//     <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
// ... and ends at:
//                     );
//                   })}
//               </div>
//             </div>
//           </div>
//         )}

const startTag = '{showMembers && (\\s*<div className="fixed inset-0 z-50 flex justify-end">)';
const regex = /\{showMembers && \([\s\S]*?<\/div>\s*<\/div>\s*\)\}/;

const newDrawer = `{showMembers && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/30 dark:bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={() => setShowMembers(false)} />
          
          {/* Drawer Panel */}
          <div className="relative w-full max-w-[400px] h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transform transition-transform animate-in slide-in-from-right duration-300">
            
            {/* Header */}
            <div className="px-6 py-5 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white leading-none mb-1">Manage Access</h2>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{spaceMembers.length} Members</p>
                </div>
              </div>
              <button onClick={() => setShowMembers(false)} className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                <X className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </button>
            </div>
            
            {/* Search Bar */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
              <div className="relative group">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search directory..."
                  value={searchMember}
                  onChange={e => setSearchMember(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg pl-10 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
              <div className="pb-16 pt-2">
              {profiles
                .filter(p => p.id !== space.created_by && ((p.full_name || '').toLowerCase().includes((searchMember || '').toLowerCase()) || (p.email || '').toLowerCase().includes((searchMember || '').toLowerCase())))
                .map(p => {
                  const memberRow = spaceMembers.find(m => m.user_id === p.id);
                  const isMem = !!memberRow;
                  const isSpacemanMember = p.role === 'spaceman';

                  return (
                    <div key={p.id} className="group flex items-center justify-between p-3 mx-2 mb-1 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <img src={p.avatar_url || \`https://api.dicebear.com/7.x/initials/svg?seed=\${p.full_name}\`} alt={p.full_name} className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 object-cover ring-2 ring-white dark:ring-slate-900 shadow-sm shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate flex items-center gap-2">
                            {p.full_name}
                            {isSpacemanMember && <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500" title="Spaceman" />}
                          </p>
                          <p className="text-xs font-medium text-slate-500 truncate">{p.email}</p>
                        </div>
                      </div>
                      <div className="shrink-0 ml-3">
                      {canEdit ? (
                        <button
                          onClick={() => toggleMember(p.id)}
                          className={\`px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm \${isMem ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:border-rose-200 dark:hover:border-rose-900/50 dark:hover:text-rose-400' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm border border-transparent'}\`}
                        >
                          {isMem ? 'Remove' : 'Add'}
                        </button>
                      ) : (
                        isMem && <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full">Member</span>
                      )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}`;

content = content.replace(regex, newDrawer);

fs.writeFileSync(file, content, 'utf8');
console.log('Members drawer updated.');
