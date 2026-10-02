const fs = require('fs');
let kh = fs.readFileSync('src/pages/clipad/KnowledgeHealth.jsx', 'utf8');

// 1. Fix the page wrapper
kh = kh.replace(/className="min-h-full bg-transparent  flex flex-col w-full page-enter"/g, 'className="min-h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col w-full page-enter"');

// 2. Fix typography for title/desc
kh = kh.replace(/text-white\/70 mt-2/g, 'text-slate-500 dark:text-slate-400 mt-2');
kh = kh.replace(/text-3xl font-black flex items-center gap-3/g, 'text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3');

// 3. Fix the skeleton loader to be visible in light mode
kh = kh.replace(/bg-slate-200 dark:bg-white\/10/g, 'bg-slate-200 dark:bg-slate-800');
kh = kh.replace(/bg-white\/10 rounded-2xl border border-white\/10/g, 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm');
kh = kh.replace(/bg-white\/10 rounded-3xl border border-white\/10/g, 'bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm');

// 4. Fix raw data cards
kh = kh.replace(/bg-\[#006065\] text-white dark:bg-\[#006065\] border border-white\/15 dark:border-white\/15/g, 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800');
kh = kh.replace(/text-white\/70 dark:text-muted-foreground text-sm font-bold uppercase tracking-wider mb-1/g, 'text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider mb-1');
kh = kh.replace(/text-3xl font-black text-white dark:text-white mb-2/g, 'text-3xl font-black text-slate-900 dark:text-white mb-2');
kh = kh.replace(/text-xs text-white\/60 mt-auto/g, 'text-xs text-slate-500 dark:text-slate-400 mt-auto');

// 5. Fix radar chart block
kh = kh.replace(/text-xl font-bold mb-1 relative z-10/g, 'text-xl font-bold text-slate-900 dark:text-white mb-1 relative z-10');
kh = kh.replace(/text-sm text-white\/70 mb-6 relative z-10/g, 'text-sm text-slate-500 dark:text-slate-400 mb-6 relative z-10');
// The grid polar text is hardcoded to #64748b, which is fine

// 6. Fix "Generate Detailed Report" block
kh = kh.replace(/bg-black\/20 dark:bg-black\/20 border border-white\/10/g, 'bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50');
kh = kh.replace(/text-white dark:text-white leading-relaxed/g, 'text-slate-900 dark:text-white leading-relaxed');

// 7. Fix insights
kh = kh.replace(/text-white dark:text-white/g, 'text-slate-900 dark:text-white');
kh = kh.replace(/text-white\/80 dark:text-white\/60/g, 'text-slate-600 dark:text-slate-400');

// 8. Fix hanging promise issue!
// We'll separate the AI generation from the core fetchHealth to avoid locking the UI
kh = kh.replace(
  /const aiResponse = await generateText\(prompt\);\n\s*setDiagnosis\(aiResponse\?.trim\(\) \|\| "Organizational intelligence is healthy. Teams are effectively capturing decisions and resolving blockers."\);\n\n\s*\/\/ Generate Proactive Insights\n\s*try \{\n\s*const insightPrompt = \[([\s\S]*?)\];\n\s*const insightRaw = await generateText\(insightPrompt\);\n\s*\/\/ Try to extract JSON from the response\n\s*const jsonMatch = insightRaw.match\(\/\\\[\.\*\\\]\/s\);\n\s*if \(jsonMatch\) \{\n\s*setInsights\(JSON\.parse\(jsonMatch\[0\]\)\);\n\s*\} else \{\n\s*setInsights\(\[\n\s*\{ type: 'insight', title: 'Knowledge Base Growing', description: 'Your external integrations are successfully syncing data into the graph.' \},\n\s*\{ type: 'suggestion', title: 'Review Open Blockers', description: 'There are unresolved blockers that need attention to maintain resolution speed.' \}\n\s*\]\);\n\s*\}\n\s*\} catch\(e\) \{\n\s*console\.warn\("Failed to generate insights", e\);\n\s*\}/m,
  `
        // Run AI tasks asynchronously without awaiting them in the main loading flow
        generateText(prompt).then(aiResponse => {
          setDiagnosis(aiResponse?.trim() || "Organizational intelligence is healthy. Teams are effectively capturing decisions and resolving blockers.");
        }).catch(e => console.warn("Failed AI diag:", e));

        const insightPrompt = [
          { role: 'system', content: 'You are an AI organizational insights engine. Based on the following metrics, generate 3 specific, proactive, and actionable insights. Output strictly valid JSON as an array of objects. Each object must have "type" ("warning", "suggestion", or "insight"), "title" (short summary), and "description" (detailed actionable context).' },
          { role: 'user', content: \`Metrics: Total Meetings: \${meetingCount}, Key Decisions Made: \${decisionCount}, Blockers Raised: \${blockerCount}, Tasks Completed: \${taskCompletedCount}, Imported Integrations: \${importedCount}. Calculated Scores: Velocity: \${velocity}, Resolution: \${resolution}, Silos: \${silos}, Efficiency: \${bloat}.\` }
        ];
        
        generateText(insightPrompt).then(insightRaw => {
          const jsonMatch = insightRaw.match(/\\[.*?\\]/s);
          if (jsonMatch) {
            setInsights(JSON.parse(jsonMatch[0]));
          } else {
             setInsights([
               { type: 'insight', title: 'Knowledge Base Growing', description: 'Your external integrations are successfully syncing data into the graph.' },
               { type: 'suggestion', title: 'Review Open Blockers', description: 'There are unresolved blockers that need attention to maintain resolution speed.' }
             ]);
          }
        }).catch(e => console.warn("Failed insights:", e));
  `
);

fs.writeFileSync('src/pages/clipad/KnowledgeHealth.jsx', kh);
