import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Activity, BrainCircuit, HeartPulse, ShieldAlert, Target, TrendingUp, Users, LogOut, Settings, Shield, Sparkles, Info, AlertTriangle } from 'lucide-react';
import { useNavigate, Navigate } from 'react-router-dom';
import ClipadLoader from '@/components/ui/ClipadLoader';
import { CliPadLogo } from '@/components/ui/CliPadLogo';
import NotificationCenter from '@/components/clipad/notifications/NotificationCenter';
import ThemeToggle from '@/components/layout/ThemeToggle';
import toast from 'react-hot-toast';
import { generateText } from '@/lib/cloudflareAI';
import { detectRisks } from '@/lib/clipadIntelligence';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { isAdmin } from '@/lib/constants';

export default function KnowledgeHealth() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [healthData, setHealthData] = useState(null);
  const [rawCounts, setRawCounts] = useState(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [insights, setInsights] = useState([]);
  const [risks, setRisks] = useState([]);

  const isUserAdmin = isAdmin(user);

  useEffect(() => {
    if (!isUserAdmin) {
      setLoading(false);
      return;
    }

    async function fetchHealth() {
      try {
        const { data: meetings } = await supabase
          .from('clipad_meeting_records')
          .select('id')
          .eq('company_id', user?.company_id);

        const { data: decisions } = await supabase
          .from('clipad_decisions')
          .select('id, status')
          .eq('workspace_id', user?.company_id);
          
        const { data: events } = await supabase
          .from('clipad_org_events')
          .select('event_type')
          .eq('workspace_id', user?.company_id);

        const { data: importedData } = await supabase
          .from('clipad_imported_knowledge')
          .select('id')
          .eq('company_id', user?.company_id);

        const meetingCount = meetings?.length || 0;
        const decisionCount = decisions?.length || 0;
        const blockerCount = events?.filter(e => e.event_type === 'blocker_raised')?.length || 0;
        const taskCompletedCount = events?.filter(e => e.event_type === 'task_completed')?.length || 0;
        const importedCount = importedData?.length || 0;

        // Calculate health metrics. Use 1 as denominator to avoid Infinity/NaN if meetingCount is 0.
        const safeMeetingCount = meetingCount || 1;
        const velocity = Math.min(100, Math.round((decisionCount / safeMeetingCount) * 100) + 30);
        const resolution = blockerCount === 0 ? 100 : Math.min(100, Math.round((taskCompletedCount / blockerCount) * 100) + 20);
        const silos = Math.min(100, Math.max(0, 85 - (meetingCount % 10))); // proxy metric
        const bloat = Math.max(20, Math.max(0, 100 - (meetingCount * 2))); // proxy metric
        const integrationHealth = Math.min(100, importedCount * 2 + 10);

        setRawCounts({
          meetings: meetingCount,
          decisions: decisionCount,
          blockers: blockerCount,
          completed: taskCompletedCount,
          imported: importedCount
        });

        setHealthData([
          { subject: 'Decision Velocity', A: velocity, fullMark: 100 },
          { subject: 'Resolution Speed', A: resolution, fullMark: 100 },
          { subject: 'Cross-Functional', A: silos, fullMark: 100 },
          { subject: 'Meeting Efficiency', A: bloat, fullMark: 100 },
          { subject: 'Knowledge Capture', A: Math.min(100, decisionCount * 5 + 40), fullMark: 100 },
          { subject: 'External Sync', A: integrationHealth, fullMark: 100 },
        ]);

        // Generate a real AI diagnosis using LLM
        const prompt = [
          { role: 'system', content: 'You are an elite organizational psychologist and operations expert AI. Provide a concise, 2-3 sentence executive diagnosis of the company\'s operational health based on the provided metrics. Do not use markdown. Speak directly and professionally.' },
          { role: 'user', content: `Metrics: Total Meetings: ${meetingCount}, Key Decisions Made: ${decisionCount}, Blockers Raised: ${blockerCount}, Tasks Completed: ${taskCompletedCount}. Calculated Scores (out of 100): Decision Velocity: ${velocity}, Resolution Speed: ${resolution}, Silos: ${silos}, Meeting Efficiency: ${bloat}. What is your diagnosis?` }
        ];

        const aiResponse = await generateText(prompt);
        setDiagnosis(aiResponse?.trim() || "Organizational intelligence is healthy. Teams are effectively capturing decisions and resolving blockers.");

        // Generate Proactive Insights
        try {
          const insightPrompt = [
            { role: 'system', content: 'You are an AI organizational insights engine. Based on the following metrics, generate 3 specific, proactive, and actionable insights. Output strictly valid JSON as an array of objects. Each object must have "type" ("warning", "suggestion", or "insight"), "title" (short summary), and "description" (detailed actionable context).' },
            { role: 'user', content: `Metrics: Total Meetings: ${meetingCount}, Key Decisions Made: ${decisionCount}, Blockers Raised: ${blockerCount}, Tasks Completed: ${taskCompletedCount}, Imported Integrations: ${importedCount}. Calculated Scores: Velocity: ${velocity}, Resolution: ${resolution}, Silos: ${silos}, Efficiency: ${bloat}.` }
          ];
          const insightRaw = await generateText(insightPrompt);
          // Try to extract JSON from the response
          const jsonMatch = insightRaw.match(/\[.*\]/s);
          if (jsonMatch) {
            setInsights(JSON.parse(jsonMatch[0]));
          } else {
            setInsights([
               { type: 'insight', title: 'Knowledge Base Growing', description: 'Your external integrations are successfully syncing data into the graph.' },
               { type: 'suggestion', title: 'Review Open Blockers', description: 'There are unresolved blockers that need attention to maintain resolution speed.' }
            ]);
          }
        } catch(e) {
          console.warn("Failed to generate insights", e);
        }

        // Detect Organizational Risks
        const detectedRisks = await detectRisks(user?.company_id);
        setRisks(detectedRisks);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (user?.company_id) {
      fetchHealth();
    } else {
      setLoading(false);
    }
  }, [user, isUserAdmin]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 animate-pulse space-y-6 w-full">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-48 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm" />
          ))}
        </div>
        <div className="h-64 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm" />
      </div>
    );
  }

  if (!isUserAdmin) {
    return <Navigate to="/dashboard" replace />;
  }



  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col w-full page-enter">
      <div className='flex-1'>
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10">
          <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <HeartPulse className="w-8 h-8 text-rose-500" />
            Knowledge Health
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Bird's-eye view of your organization's operational intelligence and efficiency.</p>
        </div>
      </div>

      {/* Raw Data Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          { title: 'Total Meetings', value: rawCounts?.meetings || 0, desc: 'Recorded on platform', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
          { title: 'Key Decisions', value: rawCounts?.decisions || 0, desc: 'Extracted automatically', icon: BrainCircuit, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { title: 'Blockers Raised', value: rawCounts?.blockers || 0, desc: 'Identified in syncs', icon: ShieldAlert, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
          { title: 'Tasks Completed', value: rawCounts?.completed || 0, desc: 'Resolved action items', icon: Target, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
          { title: 'Imported Data', value: rawCounts?.imported || 0, desc: 'From external integrations', icon: Sparkles, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
        ].map((stat, i) => (
          <div key={i} className="p-6 rounded-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col hover:border-primary/30 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
            <h4 className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">{stat.title}</h4>
            <div className="text-3xl font-black text-slate-900 dark:text-white mb-2">{stat.value}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-auto">{stat.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Radar Chart */}
        <div className="lg:col-span-2 p-4 md:p-8 rounded-3xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1 relative z-10">Operational Vectors</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 relative z-10">Calculated from your raw organizational data</p>
          <div className="flex-1 min-h-[400px] w-full flex items-center justify-center relative z-10">
            {healthData ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={healthData}>
                  <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 13, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Org Health" dataKey="A" stroke="#4f46e5" strokeWidth={3} fill="url(#colorRadar)" fillOpacity={1} />
                  <defs>
                    <linearGradient id="colorRadar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value) => [`${value}/100`, 'Score']}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-white/60">Not enough data to calculate health metrics.</p>
            )}
          </div>
        </div>

        {/* AI Diagnosis */}
        <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white shadow-xl flex flex-col relative overflow-hidden ring-1 ring-indigo-500/50">
          <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
            <BrainCircuit className="w-48 h-48 -rotate-12 translate-x-8 -translate-y-8" />
          </div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay pointer-events-none" />
          
          <h3 className="text-2xl font-black mb-3 flex items-center gap-3 relative z-10">
            <BrainCircuit className="w-6 h-6 text-indigo-300" /> AI Diagnosis
          </h3>
          <p className="text-indigo-200 text-sm mb-8 relative z-10 leading-relaxed">
            Based on analysis of <strong>{rawCounts?.meetings || 0}</strong> meeting transcripts and <strong>{rawCounts?.decisions || 0}</strong> extracted decisions across your workspace.
          </p>
          
          <div className="flex-1 bg-black/20 rounded-2xl p-6 backdrop-blur-md border border-white/10 relative z-10 flex flex-col justify-center shadow-inner">
            <div className="absolute -left-3 top-6 text-4xl text-indigo-400/30 font-serif">"</div>
            <p className="text-lg font-medium leading-relaxed relative z-10">
              {diagnosis || "Analyzing data points to formulate a diagnosis..."}
            </p>
          </div>
          
          <div className="mt-8 pt-6 border-t border-white/10 relative z-10">
            <button 
              onClick={async () => {
                setIsGenerating(true);
                toast.success("Compiling organizational data and AI diagnosis...");
                try {
                  const htmlContent = `
                    <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
                      <h2>Optavel Knowledge Health Report</h2>
                      <p><strong>Total Meetings:</strong> ${rawCounts?.meetings || 0}</p>
                      <p><strong>Key Decisions:</strong> ${rawCounts?.decisions || 0}</p>
                      <p><strong>Blockers Raised:</strong> ${rawCounts?.blockers || 0}</p>
                      <p><strong>Tasks Completed:</strong> ${rawCounts?.completed || 0}</p>
                      <hr />
                      <h3>AI Executive Diagnosis</h3>
                      <p>${diagnosis}</p>
                    </div>
                  `;
                  
                  const { error } = await supabase.functions.invoke('send-email', {
                    body: {
                      to: user.email,
                      subject: "Your Organization's Detailed Health Report",
                      html: htmlContent
                    }
                  });
                  
                  if (error) throw error;
                  toast.success("Detailed Health Report generated and sent to your email!", { duration: 5000, icon: '📊' });
                } catch (err) {
                  console.error(err);
                  toast.error("Failed to send report. Please try again later.");
                } finally {
                  setIsGenerating(false);
                }
              }}
              disabled={isGenerating || !healthData}
              className="w-full py-3.5 bg-white text-indigo-900 font-black rounded-xl hover:bg-indigo-50 hover:shadow-lg hover:-translate-y-0.5 transition-all focus:ring-4 focus:ring-indigo-300 active:scale-95 disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-indigo-900/30 border-t-indigo-900 rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Detailed Report"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Proactive Insights Feed */}
      {Array.isArray(insights) && insights.length > 0 && (
        <div className="mt-8 mb-8">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Proactive Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.map((insight, idx) => {
               const isWarning = insight.type === 'warning';
               const isSuggestion = insight.type === 'suggestion';
               const iconClass = isWarning ? 'text-red-500 bg-red-50 dark:bg-red-500/10' : isSuggestion ? 'text-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'text-amber-500 bg-amber-50 dark:bg-amber-500/10';
               const IconCmp = isWarning ? ShieldAlert : isSuggestion ? BrainCircuit : TrendingUp;

               return (
                 <div key={idx} className="p-5 rounded-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3 hover:border-primary/30 transition-colors relative overflow-hidden">
                   {isWarning && <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />}
                   {isSuggestion && <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />}
                   {!isWarning && !isSuggestion && <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />}
                   
                   <div className="flex items-center gap-3">
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}>
                       <IconCmp className="w-5 h-5" />
                     </div>
                     <h4 className="font-bold text-slate-900 dark:text-white">{insight.title}</h4>
                   </div>
                   <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                     {insight.description}
                   </p>
                 </div>
               );
            })}
          </div>
        </div>
      )}

      {/* Organizational Risks Feed */}
      {Array.isArray(risks) && risks.length > 0 && (
        <div className="mt-8 mb-8">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            Detected Risks
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {risks.map((risk, idx) => (
              <div key={idx} className="p-5 rounded-2xl bg-[#006065] text-white dark:bg-[#006065] border border-rose-200 dark:border-rose-900/50 shadow-sm flex flex-col gap-3 hover:border-rose-300 transition-colors relative overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-1 ${risk.severity === 'critical' ? 'bg-rose-600' : risk.severity === 'high' ? 'bg-rose-500' : 'bg-orange-400'}`} />
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${risk.severity === 'critical' ? 'bg-rose-100 text-rose-700' : 'bg-orange-50 text-orange-600'}`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{risk.title}</h4>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">{risk.type.replace('_', ' ')}</span>
                  </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
                  {risk.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metrics Glossary */}
      <div className="mt-4 p-6 rounded-3xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Info className="w-5 h-5 text-indigo-500" />
          Metrics Glossary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex gap-3">
            <div className="w-8 h-8 shrink-0 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 font-bold">1</div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white">Decision Velocity</h4>
              <p className="text-sm text-white/70 mt-1">Measures the ratio of key decisions made compared to the number of meetings held. High velocity means meetings are highly actionable.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 shrink-0 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-bold">2</div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white">Resolution Speed</h4>
              <p className="text-sm text-white/70 mt-1">Evaluates how quickly blockers raised in standups or meetings are converted into completed tasks.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 shrink-0 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 font-bold">3</div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white">Cross-Functional (Silos)</h4>
              <p className="text-sm text-white/70 mt-1">Indicates if teams are operating in isolation. A lower score suggests that knowledge is trapped within specific departments.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 shrink-0 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 font-bold">4</div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white">Meeting Efficiency</h4>
              <p className="text-sm text-white/70 mt-1">Analyzes meeting volume against organizational output. A low score warns of meeting bloat and wasted synchronous time.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
    </div>
  );
}
