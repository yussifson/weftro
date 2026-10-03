const fs = require('fs');
const lines = fs.readFileSync('src/pages/clipad/RecordVideo.jsx', 'utf8').split('\n');

const startIndex = lines.findIndex(l => l.includes("{/* Action Row: Visibility, Lock Settings & Save Buttons */}"));
let endIndex = -1;

for (let i = startIndex + 1; i < lines.length; i++) {
  if (lines[i].includes("{activeVideoId ? 'Save Details' : 'Save to CliPad'}")) {
    endIndex = i + 3;
    break;
  }
}

if (startIndex > -1 && endIndex > -1) {
  const newActionRow = `{/* Action Row: Visibility, Lock Settings & Save Buttons */}
            <div className="mt-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="flex-1 max-w-[220px]">
                  <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Visibility</label>
                  <select
                    value={visibility}
                    onChange={e => setVisibility(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#006065]/20 focus:border-[#006065] transition-all appearance-none"
                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto' }}
                  >
                    <option value="internal">Internal (Company Only)</option>
                    <option value="external">External (Anyone with link)</option>
                  </select>
                </div>

                <div className="flex-1 max-w-[220px]">
                  <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Access Control</label>
                  <select
                    value={lockType}
                    onChange={e => setLockType(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#006065]/20 focus:border-[#006065] transition-all appearance-none"
                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto' }}
                  >
                    <option value="none">Public (Space Members)</option>
                    <option value="manual">Locked (Only Me)</option>
                    <option value="scheduled">Scheduled Release</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-4 md:mt-0">
                {!activeVideoId && recordingUrl && (
                  <button onClick={() => {
                    const a = document.createElement('a');
                    a.href = recordingUrl;
                    a.download = \`recording-\${Date.now()}.webm\`;
                    a.click();
                  }} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-sm transition-all shadow-sm">
                    <Download className="w-4 h-4" /> Download
                  </button>
                )}
                <button onClick={discard} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 border border-red-200 dark:border-rose-500/30 text-red-600 dark:text-rose-400 font-bold text-sm transition-all shadow-sm">
                  <RotateCcw className="w-4 h-4" /> Discard
                </button>
                <button onClick={uploadRecording} disabled={!title.trim() || !selectedSpace} className="flex items-center gap-2 px-8 py-3 rounded-xl bg-[#006065] hover:bg-[#004a4e] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold shadow-lg shadow-[#006065]/25 transition-all text-sm">
                  <Upload className="w-4 h-4" /> {activeVideoId ? 'Save Details' : 'Save to CliPad'}
                </button>
              </div>
            </div>`;
  lines.splice(startIndex, endIndex - startIndex, newActionRow);
  fs.writeFileSync('src/pages/clipad/RecordVideo.jsx', lines.join('\n'));
}
