const fs = require('fs');

const lines = fs.readFileSync('src/pages/clipad/RecordVideo.jsx', 'utf8').split('\n');

const startIndex = lines.findIndex(l => l.includes("{/* SETUP PHASE */}"));
let endIndex = -1;

for (let i = startIndex + 1; i < lines.length; i++) {
  if (lines[i].includes("PREMIUM COUNTDOWN OVERLAY")) {
    endIndex = i;
    break;
  }
}

if (startIndex > -1 && endIndex > -1) {
  const newSetup = `{/* SETUP PHASE */}
        {phase === 'setup' && (
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-10 items-start">
            {/* Left Column: Mode Selection */}
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Record Video</h1>
                <p className="text-slate-500 dark:text-slate-400 text-[15px]">Capture and share async updates with your team in seconds.</p>
              </div>

              {!hasDisplayMedia && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl text-amber-800 dark:text-amber-400">
                  <Camera className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold">Camera recording only</p>
                    <p className="text-xs mt-0.5 opacity-80">Screen recording is not supported on mobile browsers. You can record using your camera.</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <label className="block text-sm font-bold text-slate-900 dark:text-slate-300">Recording Mode</label>
                <div className="grid grid-cols-3 gap-3">
                  {MODES.filter(m => hasDisplayMedia || m.id === 'camera_only').map(m => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setMode(m.id)}
                        className={\`flex flex-col items-center justify-center p-4 md:p-5 rounded-2xl border transition-all duration-300 shadow-sm active:scale-95 \${mode === m.id ? 'border-[#006065] dark:border-[#00beac] bg-[#006065]/5 dark:bg-[#00beac]/10 text-[#006065] dark:text-[#00beac] ring-1 ring-[#006065]/20' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'}\`}
                      >
                        <Icon className={\`w-7 h-7 mb-3 \${mode === m.id ? 'text-[#006065] dark:text-[#00beac]' : 'text-slate-400'}\`} />
                        <span className="font-bold text-[13px] text-center leading-tight">
                          {m.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div onClick={() => setMicEnabled(!micEnabled)} className={\`w-11 h-6 rounded-full transition-colors relative \${micEnabled ? 'bg-[#006065] dark:bg-[#00beac]' : 'bg-slate-200 dark:bg-slate-700 group-hover:bg-slate-300 dark:group-hover:bg-slate-600'}\`}>
                    <div className={\`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all \${micEnabled ? 'left-6' : 'left-1'}\`} />
                  </div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    {micEnabled ? <Mic className="w-4 h-4 text-[#006065] dark:text-[#00beac]" /> : <MicOff className="w-4 h-4 text-slate-400" />}
                    Microphone
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div onClick={() => setStudioSound(!studioSound)} className={\`w-11 h-6 rounded-full transition-colors relative \${studioSound ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700 group-hover:bg-slate-300 dark:group-hover:bg-slate-600'}\`}>
                    <div className={\`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all \${studioSound ? 'left-6' : 'left-1'}\`} />
                  </div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Wand2 className={\`w-4 h-4 \${studioSound ? 'text-indigo-500' : 'text-slate-400'}\`} />
                    Studio Sound
                  </span>
                </label>
              </div>
            </div>

            {/* Right Column: Settings & Start */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-slate-300 mb-2">Video Title <span className="text-red-500">*</span></label>
                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Q3 Feature Walkthrough"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006065]/20 focus:border-[#006065] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-slate-300 mb-2">Save to Space <span className="text-red-500">*</span></label>
                  <select
                    value={selectedSpace}
                    onChange={e => setSelectedSpace(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#006065]/20 focus:border-[#006065] transition-all appearance-none"
                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto' }}
                  >
                    <option value="">Select a space...</option>
                    {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                {/* Teleprompter Toggle & Input */}
                <div className="pt-5 border-t border-slate-100 dark:border-slate-800/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-300">
                      <AlignLeft className="w-4 h-4 text-slate-400" /> AI Teleprompter
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="E.g. Announce new product features..."
                      className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400"
                      value={scriptPrompt}
                      onChange={e => setScriptPrompt(e.target.value)}
                    />
                    <button 
                      onClick={generateScript}
                      disabled={isGeneratingScript || !scriptPrompt.trim()}
                      className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 px-3 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {isGeneratingScript ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                      Generate
                    </button>
                  </div>
                  {teleprompterText && (
                    <div className="relative">
                      <textarea
                        className="w-full h-24 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                        value={teleprompterText}
                        onChange={e => setTeleprompterText(e.target.value)}
                      />
                      <button 
                        onClick={refineScript}
                        disabled={isGeneratingScript}
                        className="absolute bottom-2 right-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                        title="Make it punchy!"
                      >
                        <Sparkles className="w-3 h-3 text-amber-500" /> Refine
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    onClick={startRecording}
                    disabled={countdown !== null || isPreparingStream || !title.trim() || !selectedSpace}
                    className={\`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl \${countdown !== null || isPreparingStream || !title.trim() || !selectedSpace ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' : 'bg-[#006065] hover:bg-[#004a4e] text-white shadow-md hover:shadow-lg hover:-translate-y-0.5'} font-bold text-sm transition-all duration-200\`}
                  >
                    {isPreparingStream ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <span className={\`w-2 h-2 rounded-full \${countdown !== null || isPreparingStream || !title.trim() || !selectedSpace ? 'bg-slate-400' : 'bg-rose-500 animate-pulse'}\`} />
                    )}
                    {isPreparingStream ? 'Accessing Camera...' : countdown !== null ? \`Starting in \${countdown}...\` : 'Start Recording'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
`;

  lines.splice(startIndex, endIndex - startIndex, newSetup);
  
  // Now fix the wrapper container and active mode UI:
  let content = lines.join('\n');
  content = content.replace(/className="max-w-5xl mx-auto px-6 py-8 space-y-6"/g, 'className="max-w-5xl mx-auto px-6 py-8"');
  
  // Fix the active recording state UI stuff we wanted to fix earlier
  content = content.replace(/className="fixed bottom-10 left-1\/2 -translate-x-1\/2 z-50 flex items-center gap-2 p-2 bg-white\/50 \/80 backdrop-blur-3xl border border-black\/5 dark:border-white\/5 rounded-full shadow-\[0_8px_30px_rgba\(0,0,0,0\.12\)\]"/g, 'className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[24px] shadow-xl"');

  // Fix buttons inside the pill:
  content = content.replace(/w-12 h-12 rounded-full/g, 'w-10 h-10 rounded-full');
  content = content.replace(/bg-white dark:bg-slate-900 text-white dark:text-white/g, 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white');
  content = content.replace(/bg-red-600 hover:bg-red-500 text-white/g, 'bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm px-4 h-10 w-auto rounded-full gap-2 shadow-md');

  // The active recording view (bg-black layout fix)
  content = content.replace(/className="min-h-full bg-\[\#f0f2f5\]  text-white dark:text-slate-100 page-enter overflow-x-hidden pb-24 md:pb-8"/g, 'className={`min-h-full ${phase === \'setup\' ? \'bg-slate-50 dark:bg-slate-950\' : \'bg-slate-100 dark:bg-slate-900\'} page-enter overflow-x-hidden pb-24 md:pb-8`}');

  // Nav header fixes
  content = content.replace(/text-white\/90 dark:text-foreground/g, 'text-slate-700 dark:text-slate-200');
  content = content.replace(/<ArrowLeft className="w-4 h-4 text-white\/70" \/>/g, '<ArrowLeft className="w-4 h-4 text-slate-500" />');
  content = content.replace(/<span className="text-foreground font-semibold">Record Async Video<\/span>/g, '<span className="text-slate-900 dark:text-white font-bold text-sm">Record Async Video</span>');

  // Fix the video container itself in active mode
  content = content.replace(/rounded-3xl overflow-hidden bg-black aspect-video shadow-2xl ring-1 ring-white\/10 select-none/g, 'rounded-3xl overflow-hidden bg-white dark:bg-black aspect-video shadow-xl border border-slate-200 dark:border-slate-800 select-none ring-4 ring-white dark:ring-transparent');

  // Fix preview layout
  content = content.replace(/bg-slate-100 dark:bg-slate-900/g, 'bg-slate-50 dark:bg-slate-950');
  content = content.replace(/text-muted-foreground/g, 'text-slate-500');

  fs.writeFileSync('src/pages/clipad/RecordVideo.jsx', content);
  console.log("SUCCESS!");
} else {
  console.log("FAILED to find markers:", startIndex, endIndex);
}
