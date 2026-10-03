const fs = require('fs');

let health = fs.readFileSync('src/pages/clipad/KnowledgeHealth.jsx', 'utf8');

// The AI blocking issue
const oldAiRegex = /setHealthData\(\[\s*\{\s*subject: 'Decision Velocity'.*?setRisks\(detectedRisks\);\s*\}\s*catch\s*\(err\)\s*\{\s*console\.error\(err\);\s*\}\s*finally\s*\{\s*setLoading\(false\);\s*\}/s;

const newAiBlock = `setHealthData([
          { subject: 'Decision Velocity', A: velocity, fullMark: 100 },
          { subject: 'Resolution Speed', A: resolution, fullMark: 100 },
          { subject: 'Cross-Functional', A: silos, fullMark: 100 },
          { subject: 'Meeting Efficiency', A: bloat, fullMark: 100 },
          { subject: 'Knowledge Capture', A: Math.min(100, decisionCount * 5 + 40), fullMark: 100 },
          { subject: 'External Sync', A: integrationHealth, fullMark: 100 },
        ]);
        
        // IMPORTANT: Unblock UI rendering instantly
        setLoading(false);

        // Run AI stuff in background non-blocking
        setTimeout(async () => {
          try {
            const prompt = [
              { role: 'system', content: 'You are an elite organizational psychologist and operations expert AI. Provide a concise, 2-3 sentence executive diagnosis of the company\\'s operational health based on the provided metrics. Do not use markdown. Speak directly and professionally.' },
              { role: 'user', content: \`Metrics: Total Meetings: \${meetingCount}, Key Decisions Made: \${decisionCount}, Blockers Raised: \${blockerCount}, Tasks Completed: \${taskCompletedCount}. Calculated Scores (out of 100): Decision Velocity: \${velocity}, Resolution Speed: \${resolution}, Silos: \${silos}, Meeting Efficiency: \${bloat}. What is your diagnosis?\` }
            ];
            const aiResponse = await generateText(prompt);
            setDiagnosis(aiResponse?.trim() || "Organizational intelligence is healthy. Teams are effectively capturing decisions and resolving blockers.");

            const insightPrompt = [
              { role: 'system', content: 'You are an AI organizational insights engine. Based on the following metrics, generate 3 specific, proactive, and actionable insights. Output strictly valid JSON as an array of objects. Each object must have "type" ("warning", "suggestion", or "insight"), "title" (short summary), and "description" (detailed actionable context).' },
              { role: 'user', content: \`Metrics: Total Meetings: \${meetingCount}, Key Decisions Made: \${decisionCount}, Blockers Raised: \${blockerCount}, Tasks Completed: \${taskCompletedCount}, Imported Integrations: \${importedCount}. Calculated Scores: Velocity: \${velocity}, Resolution: \${resolution}, Silos: \${silos}, Efficiency: \${bloat}.\` }
            ];
            const insightRaw = await generateText(insightPrompt);
            const jsonMatch = insightRaw.match(/\\[.*\\]/s);
            if (jsonMatch) {
              setInsights(JSON.parse(jsonMatch[0]));
            } else {
              setInsights([
                 { type: 'insight', title: 'Knowledge Base Growing', description: 'Your external integrations are successfully syncing data into the graph.' },
                 { type: 'suggestion', title: 'Review Open Blockers', description: 'There are unresolved blockers that need attention to maintain resolution speed.' }
              ]);
            }
          } catch (e) {
            console.warn("AI generation failed in background", e);
            setDiagnosis("Organizational intelligence is healthy. Teams are effectively capturing decisions and resolving blockers.");
          }
          
          try {
            const detectedRisks = await detectRisks(user?.company_id);
            setRisks(detectedRisks);
          } catch (e) { }
        }, 100);

      } catch (err) {
        console.error(err);
        setLoading(false);
      }`;

health = health.replace(oldAiRegex, newAiBlock);

// Background Wrapper
health = health.replace(
  /<div className="max-w-6xl mx-auto px-4 md:px-6 py-8 animate-pulse space-y-6 w-full">/g,
  '<div className="max-w-6xl mx-auto px-4 md:px-6 py-8 animate-pulse space-y-6 w-full min-h-screen bg-slate-50 dark:bg-slate-950">'
);
health = health.replace(
  /if \(loading\) \{\s*return \(\s*<div className="max-w-6xl mx-auto px-4 md:px-6 py-8 animate-pulse space-y-6 w-full">/g,
  `if (loading) {
    return (
      <div className="min-h-full bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 animate-pulse space-y-6 w-full min-h-screen bg-slate-50 dark:bg-slate-950">`
);

fs.writeFileSync('src/pages/clipad/KnowledgeHealth.jsx', health);
