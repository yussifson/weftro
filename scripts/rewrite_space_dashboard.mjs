import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'src/pages/clipad/SpaceDashboard.jsx');
let content = fs.readFileSync(file, 'utf8');

// Find the start of the return block for the main component.
// We know it is around line 461. Let's find the `return (` after `const isMember = spaceMembers.some`.
const anchor = 'const isMember = spaceMembers.some(m => m.user_id === user?.id);';
const anchorIdx = content.indexOf(anchor);

if (anchorIdx === -1) {
  console.error("Could not find anchor in SpaceDashboard.jsx");
  process.exit(1);
}

// Extract everything up to the anchor + anchor.length
const logicPart = content.slice(0, anchorIdx + anchor.length);

const newReturn = `

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden text-slate-900 dark:text-slate-100">
      {/* Privacy Modal */}
      <Dialog open={showPrivacyModal} onOpenChange={setShowPrivacyModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start Meeting</DialogTitle>
            <DialogDescription>
              Choose the privacy setting for this meeting.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between p-4 mt-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-sm font-semibold">Meeting Privacy</p>
              <p className="text-xs text-slate-500">{privacyType === 'private' ? 'Only org members can join.' : 'External guests can knock to join.'}</p>
            </div>
            <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-md">
              <button
                onClick={() => setPrivacyType('private')}
                className={\`px-3 py-1.5 text-xs font-semibold rounded transition-all \${privacyType === 'private' ? 'bg-white dark:bg-slate-700 shadow' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}\`}
              >
                Private
              </button>
              <button
                onClick={() => setPrivacyType('public')}
                className={\`px-3 py-1.5 text-xs font-semibold rounded transition-all \${privacyType === 'public' ? 'bg-white dark:bg-slate-700 shadow' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}\`}
              >
                Public
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPrivacyModal(false)}>Cancel</Button>
            <Button className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900" onClick={confirmJoinMeeting}>Start Meeting</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Space Modal */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Space Settings</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSpace} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Name</label>
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Description</label>
              <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none h-20" />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <input type="checkbox" id="private-space" checked={editIsPrivate} onChange={e => setEditIsPrivate(e.target.checked)} className="rounded border-slate-300 text-slate-900 focus:ring-slate-900" />
              <label htmlFor="private-space" className="text-sm font-medium">Private Space</label>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
              <Button type="button" variant="destructive" size="sm" onClick={handleDeleteSpace} className="gap-2">
                <Trash2 className="w-4 h-4" /> Delete
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowEdit(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={savingEdit} className="bg-slate-900 text-white hover:bg-slate-800">{savingEdit ? 'Saving...' : 'Save'}</Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* SIDEBAR */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col hidden md:flex shrink-0">
        <div className="h-16 flex items-center px-4 border-b border-slate-200 dark:border-slate-800 gap-3">
          <button onClick={() => navigate('/spaces')} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className={\`w-8 h-8 rounded bg-gradient-to-br \${color} flex items-center justify-center text-white shrink-0 shadow-sm\`}>
            {React.createElement(getSpaceIcon(space.name), { className: "w-4 h-4" })}
          </div>
          <span className="font-semibold text-sm truncate">{space.name}</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">Menu</div>
          {TABS.filter(t => {
            if (t.id === 'automations') return user?.role === 'super_admin';
            if (['memory', 'decisions'].includes(t.id)) return isAdmin(user) || isSpacemanHere;
            return true;
          }).map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={\`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-all \${isActive ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'}\`}
              >
                <Icon className={\`w-4 h-4 \${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400'}\`} />
                {tab.label}
              </button>
            );
          })}
        </div>
        
        {/* Sidebar Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <button onClick={() => navigate('/chat')} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <MessageSquare className="w-4 h-4" /> Global Chat
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER (only visible on small screens) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 z-40 justify-between">
         <div className="flex items-center gap-2">
           <button onClick={() => navigate('/spaces')} className="p-2 -ml-2 text-slate-400 hover:text-slate-600">
             <ArrowLeft className="w-5 h-5" />
           </button>
           <span className="font-semibold text-sm truncate">{space.name}</span>
         </div>
         <button onClick={() => setShowMembers(true)} className="p-2 text-slate-500">
           <Users className="w-5 h-5" />
         </button>
      </div>

      {/* MOBILE TABS (horizontal scroll) */}
      <div className="md:hidden fixed top-14 left-0 right-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-30 flex overflow-x-auto px-2 py-2 hide-scrollbar">
          {TABS.filter(t => {
            if (t.id === 'automations') return user?.role === 'super_admin';
            if (['memory', 'decisions'].includes(t.id)) return isAdmin(user) || isSpacemanHere;
            return true;
          }).map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={\`flex items-center gap-1.5 px-3 py-1.5 mx-1 text-xs whitespace-nowrap rounded-full transition-all \${isActive ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}\`}
              >
                <Icon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            );
          })}
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden pt-24 md:pt-0">
        {/* Top Action Header */}
        <header className="hidden md:flex h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              {TABS.find(t => t.id === activeTab)?.label}
              {space.is_private && <Lock className="w-4 h-4 text-slate-400 ml-2" />}
            </h1>
          </div>
          <div className="flex items-center gap-3">
             {canEdit && (
               <button onClick={() => setShowEdit(true)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors" title="Settings">
                 <Settings className="w-4 h-4" />
               </button>
             )}
             <button onClick={() => setShowMembers(true)} className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-sm font-medium rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <Users className="w-4 h-4 text-slate-400" /> <span className="text-slate-600 dark:text-slate-300">{spaceMembers.length}</span>
             </button>
             <button
              onClick={handleJoinMeeting}
              className={\`flex items-center gap-2 px-4 py-1.5 rounded-md font-medium text-sm transition-all \${isLive ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse shadow-sm' : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 shadow-sm'}\`}
             >
              {isLive ? <Activity className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              {isLive ? 'Join Live' : 'Start Meeting'}
             </button>
          </div>
        </header>

        {/* Dynamic Tab Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
          
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Blocker Radar */}
                  <div className="col-span-1 flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-4">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-orange-500" /> Blocker Radar</h3>
                    <div className="flex-1">
                      <BlockerRadar workspaceId={space.company_id} spaceId={spaceId} isWorkspaceView={true} hasFullIntelligence={user?.clipad_plan === 'pro' || user?.clipad_plan === 'enterprise'} />
                    </div>
                  </div>
                  
                  {/* Commitment Tracker */}
                  <div className="col-span-1 flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-4">
                     <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Commitments</h3>
                     <div className="flex-1">
                       <CommitmentTracker spaceId={spaceId} />
                     </div>
                  </div>

                  {/* Redundant Work / Extra Widget */}
                  <div className="col-span-1 flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-4">
                     <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-blue-500" /> Redundant Work</h3>
                     <div className="flex-1 text-sm text-slate-500 flex items-center justify-center">
                       <RedundantWorkAlert workspaceId={space.company_id} spaceId={spaceId} />
                     </div>
                  </div>
                  
                  {/* Decision Ledger */}
                  <div className="col-span-1 md:col-span-2 lg:col-span-3 flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-4">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><Settings className="w-4 h-4 text-slate-500" /> Decision Ledger</h3>
                    <div className="flex-1">
                      <DecisionLedger workspaceId={space.company_id} spaceId={spaceId} hasFullIntelligence={user?.clipad_plan === 'pro' || user?.clipad_plan === 'enterprise'} teamColor={color} />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                  {/* Recent Videos */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Camera className="w-4 h-4 text-slate-400" /> Recent Videos
                      </h3>
                      <button onClick={() => setActiveTab('videos')} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">View all</button>
                    </div>
                    {videos.length === 0 ? (
                      <div className="py-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                        <p className="text-sm text-slate-500">No videos yet.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">{videos.slice(0,4).map(v => <VideoCard key={v.id} video={v} onClick={() => navigate(\`/watch/\${v.id}\`)} />)}</div>
                    )}
                  </div>

                  {/* Recent Meetings */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" /> Recent Meetings
                      </h3>
                      <button onClick={() => setActiveTab('meetings')} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">View all</button>
                    </div>
                    {meetings.length === 0 ? (
                      <div className="py-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                        <p className="text-sm text-slate-500">No meetings yet.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden">
                        {meetings.slice(0,5).map(m => (
                          <div key={m.id} onClick={() => navigate(\`/meetings/\${m.id}\`)} className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{m.title || 'Team Meeting'}</p>
                            <p className="text-xs text-slate-500 mt-1">{new Date(m.created_at).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* OTHER TABS */}
            {activeTab === 'videos' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {videos.length === 0 ? <p className="text-slate-500 text-sm">No videos found.</p> : videos.map(v => <VideoCard key={v.id} video={v} onClick={() => navigate(\`/watch/\${v.id}\`)} />)}
              </div>
            )}
            
            {activeTab === 'meetings' && (
              <div className="space-y-4">
                {meetings.length === 0 ? <p className="text-slate-500 text-sm">No meetings found.</p> : meetings.map(m => (
                   <div key={m.id} onClick={() => navigate(\`/meetings/\${m.id}\`)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl hover:shadow-sm cursor-pointer flex justify-between items-center">
                     <div>
                       <h3 className="font-semibold text-slate-900 dark:text-white">{m.title || 'Team Meeting'}</h3>
                       <p className="text-xs text-slate-500 mt-1">{new Date(m.created_at).toLocaleString()}</p>
                       {m.ai_summary && <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 line-clamp-1">{m.ai_summary}</p>}
                     </div>
                     <ArrowRight className="w-5 h-5 text-slate-300" />
                   </div>
                ))}
              </div>
            )}

            {activeTab === 'tasks' && (
              <TaskBoard spaceId={spaceId} user={user} spaceMembers={spaceMembers} />
            )}

            {activeTab === 'decisions' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                <DecisionLedger workspaceId={space.company_id} spaceId={spaceId} hasFullIntelligence={user?.clipad_plan === 'pro' || user?.clipad_plan === 'enterprise'} teamColor={color} />
              </div>
            )}

            {activeTab === 'docs' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden h-[75vh]">
                <SpaceDocs spaceId={spaceId} user={user} />
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden h-[75vh]">
                <SpaceChat spaceId={spaceId} user={user} />
              </div>
            )}

            {activeTab === 'standup' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                <StandupPanel spaceId={spaceId} workspaceId={space.company_id} />
              </div>
            )}

            {activeTab === 'automations' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6">
                <SpaceAutomations spaceId={spaceId} />
              </div>
            )}

            {activeTab === 'calendar' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6 overflow-hidden min-h-[75vh]">
                <SpaceCalendar spaceId={spaceId} />
              </div>
            )}

            {activeTab === 'canvas' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden h-[75vh]">
                <CanvasWhiteboard spaceId={spaceId} />
              </div>
            )}

            {activeTab === 'memory' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Organizational Memory</h2>
                  <MemoryTimeline spaceId={spaceId} workspaceId={space.company_id} />
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden min-h-[500px]">
                  <ContextCapsule spaceId={spaceId} />
                </div>
              </div>
            )}

            {activeTab === 'timeline' && (
               <OrgTimeline spaceId={spaceId} workspaceId={space.company_id} />
            )}

          </div>
        </main>
      </div>

      {/* Members Modal (Right Drawer) */}
      {showMembers && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setShowMembers(false)} />
          <div className="relative w-full max-w-sm h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transform transition-transform animate-in slide-in-from-right duration-200">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Space Members</h2>
                <p className="text-xs text-slate-500 mt-1">{spaceMembers.length} members</p>
              </div>
              <button onClick={() => setShowMembers(false)} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                <X className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </button>
            </div>
            
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search colleagues..."
                  value={searchMember}
                  onChange={e => setSearchMember(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {profiles
                .filter(p => p.id !== space.created_by && ((p.full_name || '').toLowerCase().includes((searchMember || '').toLowerCase()) || (p.email || '').toLowerCase().includes((searchMember || '').toLowerCase())))
                .map(p => {
                  const memberRow = spaceMembers.find(m => m.user_id === p.id);
                  const isMem = !!memberRow;
                  const isSpacemanMember = p.role === 'spaceman';

                  return (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <img src={p.avatar_url || \`https://api.dicebear.com/7.x/initials/svg?seed=\${p.full_name}\`} alt={p.full_name} className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 object-cover" />
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{p.full_name}</p>
                          <p className="text-xs text-slate-500">{p.email}</p>
                        </div>
                      </div>
                      {canEdit ? (
                        <button
                          onClick={() => toggleMember(p.id)}
                          className={\`px-3 py-1.5 rounded-md text-xs font-semibold transition-all \${isMem ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}\`}
                        >
                          {isMem ? 'Remove' : 'Add'}
                        </button>
                      ) : (
                        isMem && <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">Member</span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync(file, logicPart + newReturn, 'utf8');
console.log('SpaceDashboard updated.');
