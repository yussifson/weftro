import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'src/pages/clipad/SpacesList.jsx');
let content = fs.readFileSync(file, 'utf8');

// Find the start of the return block
const anchor = "const firstName = user?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';";
const anchorIdx = content.indexOf(anchor);

if (anchorIdx === -1) {
  console.error("Could not find anchor in SpacesList.jsx");
  process.exit(1);
}

const logicPart = content.slice(0, anchorIdx + anchor.length);

const newReturn = `
  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 page-enter overflow-x-hidden pb-24 md:pb-8">

      {showPaywall && (
        <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} featureName="Premium Spaces" />
      )}

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-1">Create a new space</h2>
              <p className="text-sm text-slate-500 mb-6">A dedicated area for your team's context and collaboration.</p>
              
              <form onSubmit={createSpace} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Space Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. Q4 Planning"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Description (Optional)</label>
                  <textarea
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    placeholder="What is this space for?"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all resize-none h-20"
                  />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="private-space"
                    checked={isPrivate}
                    onChange={e => setIsPrivate(e.target.checked)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <label htmlFor="private-space" className="text-sm font-medium">Private Space</label>
                </div>
                
                <div className="flex items-center justify-end gap-3 pt-6">
                  <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={!newName.trim() || creating} className="px-5 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-2">
                    {creating && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    Create Space
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Layers className="w-4 h-4 text-slate-600 dark:text-slate-300" />
             </div>
             <h1 className="text-lg font-bold">Spaces</h1>
          </div>
          <div className="flex items-center gap-3">
             <div className="relative hidden md:block w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search spaces..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all"
                />
             </div>
             {canCreateSpaces(user) && (
                <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 rounded-md font-semibold text-sm transition-all shadow-sm">
                  <Plus className="w-4 h-4" /> New Space
                </button>
             )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-10 py-8">
        {/* MOBILE SEARCH */}
        <div className="md:hidden relative w-full mb-6">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search spaces..."
            className="w-full pl-9 pr-3 py-2 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 shadow-sm"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-40 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
               <Layers className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No spaces found</h2>
            <p className="text-slate-500 text-sm max-w-sm">Create a space to organize context, tasks, and meetings for a specific project or team.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map(space => {
              const colors = ['bg-blue-600', 'bg-indigo-600', 'bg-purple-600', 'bg-emerald-600', 'bg-rose-600', 'bg-amber-600'];
              const colorIndex = space.id ? space.id.split('-').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length : 0;
              const bgColorClass = colors[colorIndex];
              const SpaceIcon = getSpaceIcon(space.name);

              return (
                <div 
                  key={space.id}
                  onClick={() => navigate(\`/spaces/\${space.id}\`)}
                  className="group relative bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer flex flex-col h-full"
                >
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                       <div className={\`w-12 h-12 rounded-lg \${bgColorClass} flex items-center justify-center text-white shadow-sm\`}>
                         <SpaceIcon className="w-6 h-6" />
                       </div>
                       {space.is_private && (
                         <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-100 dark:border-slate-700" title="Private Space">
                           <Lock className="w-3.5 h-3.5 text-slate-400" />
                         </div>
                       )}
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug line-clamp-1 mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {space.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                      {space.description || 'No description provided.'}
                    </p>
                  </div>
                  <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between mt-auto">
                     <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> Team Space
                     </span>
                     <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors group-hover:translate-x-1" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
`;

fs.writeFileSync(file, logicPart + newReturn, 'utf8');
console.log('SpacesList updated.');
