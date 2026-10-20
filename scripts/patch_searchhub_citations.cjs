const fs = require('fs');
const path = 'c:/Users/USER/OneDrive/Documents/clipad/src/pages/clipad/SearchHub.jsx';
let content = fs.readFileSync(path, 'utf8');

const targetOld = `{/* Validated Evidence Provenance Bar */}
                                      {msg.citations && msg.citations.valid && msg.citations.valid.length > 0 && (
                                        <div className="mt-3 pt-2.5 border-t border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center gap-1.5">
                                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-muted-foreground mr-1">
                                            Included Sources:
                                          </span>
                                          {msg.citations.valid.map((cite) => (
                                            <button
                                              key={cite.index}
                                              type="button"
                                              onClick={() => {
                                                const found = results.find(r => r.id === cite.id);
                                                if (found) {
                                                  setSelectedResult(found);
                                                  const el = document.getElementById(\`result-card-\${found.id}\`);
                                                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                }
                                              }}
                                              className={\`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors \${cite.isTruncated ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:border-amber-400' : 'bg-slate-100 dark:bg-slate-800/80 hover:bg-primary/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary/30'}\`}
                                              title={cite.isTruncated ? \`Partial source excerpt included in prompt: \${cite.title || 'Untitled'}\` : \`Full source included in prompt: \${cite.title || 'Untitled'}\`}
                                            >
                                              <span className={\`font-mono font-bold \${cite.isTruncated ? 'text-amber-600 dark:text-amber-400' : 'text-primary'}\`}>#{cite.index}</span>
                                              <span className="max-w-[140px] truncate">{cite.title}</span>
                                              {cite.isTruncated && <span className="text-[9px] uppercase px-1 rounded bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-bold">partial</span>}
                                            </button>
                                          ))}
                                        </div>
                                      )}`;

const targetNew = `{/* Validated Evidence Provenance Bar */}
                                      {msg.citations && (msg.citations.valid?.length > 0 || msg.citations.unextractable?.length > 0) && (
                                        <div className="mt-3 pt-2.5 border-t border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center gap-1.5">
                                          {msg.citations.valid?.length > 0 && (
                                            <>
                                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-muted-foreground mr-1">
                                                Included Sources:
                                              </span>
                                              {msg.citations.valid.map((cite) => (
                                                <button
                                                  key={cite.index}
                                                  type="button"
                                                  onClick={() => {
                                                    const found = results.find(r => r.id === cite.id);
                                                    if (found) {
                                                      setSelectedResult(found);
                                                      const el = document.getElementById(\`result-card-\${found.id}\`);
                                                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                    }
                                                  }}
                                                  className={\`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors \${cite.isTruncated ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:border-amber-400' : 'bg-slate-100 dark:bg-slate-800/80 hover:bg-primary/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary/30'}\`}
                                                  title={cite.isTruncated ? \`Partial source excerpt included in prompt: \${cite.title || 'Untitled'}\` : \`Full source included in prompt: \${cite.title || 'Untitled'}\`}
                                                >
                                                  <span className={\`font-mono font-bold \${cite.isTruncated ? 'text-amber-600 dark:text-amber-400' : 'text-primary'}\`}>#{cite.index}</span>
                                                  <span className="max-w-[140px] truncate">{cite.title}</span>
                                                  {cite.isTruncated && <span className="text-[9px] uppercase px-1 rounded bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-bold">partial</span>}
                                                </button>
                                              ))}
                                            </>
                                          )}
                                          {msg.citations.unextractable?.length > 0 && (
                                            <>
                                              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 dark:text-orange-500 mr-1 ml-1">
                                                Not Extracted:
                                              </span>
                                              {msg.citations.unextractable.map((cite) => (
                                                <button
                                                  key={cite.id}
                                                  type="button"
                                                  onClick={() => {
                                                    const found = results.find(r => r.id === cite.id);
                                                    if (found) {
                                                      setSelectedResult(found);
                                                      const el = document.getElementById(\`result-card-\${found.id}\`);
                                                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                    }
                                                  }}
                                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors bg-orange-50 dark:bg-orange-950/30 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-800 hover:border-orange-400"
                                                  title={\`Document found but could not be extracted: \${cite.title || 'Untitled'} (\${cite.unextractableReason || 'unextractable'})\`}
                                                >
                                                  <span className="font-mono font-bold text-orange-500 dark:text-orange-400">⚠</span>
                                                  <span className="max-w-[140px] truncate">{cite.title}</span>
                                                  <span className="text-[9px] uppercase px-1 rounded bg-orange-200/60 dark:bg-orange-900/60 text-orange-900 dark:text-orange-200 font-bold">unextractable</span>
                                                </button>
                                              ))}
                                            </>
                                          )}
                                        </div>
                                      )}`;

const normContent = content.replace(/\r\n/g, '\n');
const normTarget = targetOld.replace(/\r\n/g, '\n');

if (normContent.includes(normTarget)) {
  const updated = normContent.replace(normTarget, targetNew.replace(/\r\n/g, '\n'));
  fs.writeFileSync(path, updated.replace(/\n/g, '\r\n'), 'utf8');
  console.log('Successfully updated SearchHub.jsx');
} else {
  console.error('Target not found in SearchHub.jsx');
  process.exit(1);
}
