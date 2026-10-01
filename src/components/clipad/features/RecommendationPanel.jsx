import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Brain, Sparkles, MessageSquare, Plus, FileText, X, Loader2 } from 'lucide-react';
import { generateText } from '@/lib/cloudflareAI';

export default function RecommendationPanel({ contextText, workspaceId, onInsert }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    // Debounce: wait 2 seconds after user stops typing before analyzing
    const timer = setTimeout(() => {
      if (!contextText || contextText.length < 20) {
        setRecommendations([]);
        return;
      }
      analyzeContext();
    }, 2000);
    return () => clearTimeout(timer);
  }, [contextText, workspaceId]);

  async function analyzeContext() {
    setLoading(true);
    try {
      // 1. Fetch real org data to search through
      const [decisionsRes, meetingsRes, blockersRes] = await Promise.all([
        supabase
          .from('clipad_decisions')
          .select('id, decision_text, rationale, status, created_at')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(15),
        supabase
          .from('clipad_meeting_records')
          .select('id, title, ai_summary, created_at')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('clipad_blockers')
          .select('id, description, severity, status')
          .eq('status', 'open')
          .limit(10),
      ]);

      const decisions = decisionsRes.data || [];
      const meetings = meetingsRes.data || [];
      const blockers = blockersRes.data || [];

      const hasData = decisions.length > 0 || meetings.length > 0 || blockers.length > 0;
      if (!hasData) { setRecommendations([]); setLoading(false); return; }

      // 2. Build a searchable knowledge base from real data
      const knowledgeBase = [
        decisions.length > 0 ? `DECISIONS:\n${decisions.map(d => `[DECISION:${d.id}] ${d.decision_text}. Rationale: ${d.rationale || 'N/A'}`).join('\n')}` : '',
        meetings.length > 0 ? `MEETINGS:\n${meetings.map(m => `[MEETING:${m.id}] "${m.title}": ${m.ai_summary?.substring(0, 150) || 'No summary'}`).join('\n')}` : '',
        blockers.length > 0 ? `BLOCKERS:\n${blockers.map(b => `[BLOCKER:${b.id}] ${b.description} (${b.severity})`).join('\n')}` : '',
      ].filter(Boolean).join('\n\n');

      // 3. Ask AI to find relevant context from real org data
      const raw = await generateText([
        {
          role: 'system',
          content: `You are a context recommendation engine. Given what a user is currently writing, find the top 2 most relevant items from the organization's knowledge base that could help them. 
Return ONLY a JSON array with up to 2 items. Each item must have:
- "type": "decision", "meeting", or "blocker"
- "id": the exact ID from the knowledge base (e.g. "DECISION:uuid")
- "title": short title for the recommendation card (max 8 words)
- "content": one sentence explaining why this is relevant (max 20 words)
- "snippet": the relevant text excerpt to potentially insert (max 100 chars)

If nothing is relevant, return [].
Do NOT invent facts. Only use data from the knowledge base provided.`,
        },
        {
          role: 'user',
          content: `User is currently writing:\n"${contextText.substring(0, 500)}"\n\nKnowledge Base:\n${knowledgeBase}`,
        },
      ]);

      // 4. Parse AI response
      let recs = [];
      try {
        const cleaned = (raw || '').replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) {
          recs = parsed.slice(0, 2).map(item => ({
            ...item,
            icon: item.type === 'decision' ? FileText : item.type === 'blocker' ? Sparkles : MessageSquare,
          }));
        }
      } catch {
        // AI didn't return valid JSON — no recommendations to show
      }

      setRecommendations(recs);
    } catch (err) {
      console.error('[RecommendationPanel]', err);
    } finally {
      setLoading(false);
    }
  }

  if (recommendations.length === 0 && !loading) return null;

  return (
    <div className={`fixed bottom-6 right-6 z-50 w-80 bg-white dark:bg-card border border-indigo-200 dark:border-indigo-500/30 rounded-2xl shadow-2xl transition-all duration-300 ${minimized ? 'translate-y-[calc(100%-60px)]' : 'translate-y-0'}`}>
      
      {/* Header */}
      <div 
        className="px-4 py-3 border-b border-slate-100 dark:border-border flex items-center justify-between cursor-pointer bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-t-2xl"
        onClick={() => setMinimized(!minimized)}
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            {loading && <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
            </span>}
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">AI Context Engine</h3>
        </div>
        <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          <X className={`w-4 h-4 transition-transform ${minimized ? 'rotate-45' : ''}`} />
        </button>
      </div>

      {/* Body */}
      {!minimized && (
        <div className="p-4 max-h-[400px] overflow-y-auto space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin mb-2" />
              <p className="text-xs font-medium text-slate-500">Searching org memory...</p>
            </div>
          ) : (
            recommendations.map(rec => (
              <div key={rec.id} className="bg-slate-50 dark:bg-secondary/50 rounded-xl p-3 border border-slate-100 dark:border-border hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-colors group">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <rec.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{rec.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{rec.content}</p>
                  </div>
                </div>
                
                <div className="mt-3 bg-white dark:bg-card rounded-lg p-2.5 border border-slate-200 dark:border-border text-xs text-slate-600 dark:text-foreground italic">
                  {rec.snippet}
                </div>
                
                {onInsert && (
                  <button 
                    onClick={() => onInsert(rec.snippet)}
                    className="w-full mt-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100"
                  >
                    <Plus className="w-3 h-3" /> Insert Context
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
