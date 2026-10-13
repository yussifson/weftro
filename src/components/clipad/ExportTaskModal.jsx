import React, { useState } from 'react';
import { ExternalLink, CheckCircle, Copy, Share2, Sparkles, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

const PM_TOOLS = [
  { id: 'jira', name: 'Jira', color: 'bg-blue-600 text-white', icon: 'âš¡' },
  { id: 'linear', name: 'Linear', color: 'bg-purple-600 text-white', icon: 'ðŸ“' },
  { id: 'clickup', name: 'ClickUp', color: 'bg-pink-600 text-white', icon: 'ðŸŽ¯' },
  { id: 'asana', name: 'Asana', color: 'bg-rose-500 text-white', icon: 'ðŸ”´' },
  { id: 'trello', name: 'Trello', color: 'bg-sky-600 text-white', icon: '📊' },
];

export default function ExportTaskModal({ isOpen, onClose, task, meetingTitle, meetingId }) {
  const [selectedTool, setSelectedTool] = useState('jira');
  const [exported, setExported] = useState(false);

  if (!isOpen || !task) return null;

  const meetingUrl = meetingId ? `${window.location.origin}/meetings/${meetingId}` : window.location.href;
  const exportPayload = {
    title: task.title || task.name,
    description: `Originating from KERINT Meeting: "${meetingTitle || 'Meeting'}"\n\nDeep Link: ${meetingUrl}\n\nTask Detail:\n${task.title || task.name}`,
    source: 'KERINT 2.0 Meeting-to-Execution Pipeline',
  };

  const handleExport = () => {
    // Copy markdown issue payload to clipboard
    const textToCopy = `**${exportPayload.title}**\n\n${exportPayload.description}`;
    navigator.clipboard.writeText(textToCopy);
    setExported(true);
    toast.success(`Task payload copied! Paste directly into ${PM_TOOLS.find(t => t.id === selectedTool)?.name}`);
    setTimeout(() => {
      setExported(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#006065] dark:bg-[#053639]/10 border border-[#006065] dark:border-border/20 flex items-center justify-center">
              <Share2 className="w-4 h-4 text-[#006065]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-foreground">Export to PM Tool</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-accent text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-border text-xs space-y-1.5">
          <span className="font-semibold text-slate-500 dark:text-muted-foreground uppercase tracking-wider text-[10px]">Action Item</span>
          <p className="font-medium text-slate-800 dark:text-slate-200 text-sm">{task.title || task.name}</p>
          {meetingTitle && (
            <p className="text-slate-400 text-[11px] flex items-center gap-1">
              ðŸ”— Linked to: <span className="font-medium text-[#006065] dark:text-[#00beac]">{meetingTitle}</span>
            </p>
          )}
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">Select Destination</label>
          <div className="grid grid-cols-5 gap-2">
            {PM_TOOLS.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setSelectedTool(tool.id)}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                  selectedTool === tool.id
                    ? 'border-[#006065] dark:border-border bg-[#006065] dark:bg-[#053639]/10 text-[#006065] dark:text-[#00beac] font-bold scale-105'
                    : 'border-slate-200 dark:border-border hover:bg-slate-50 dark:hover:bg-accent text-slate-600 dark:text-muted-foreground'
                }`}
              >
                <span className="text-base">{tool.icon}</span>
                <span className="text-[10px] font-semibold">{tool.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-border hover:bg-slate-100 dark:hover:bg-accent text-slate-600 dark:text-muted-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#006065] dark:bg-[#053639] hover:bg-[#004e52] text-white shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            {exported ? <CheckCircle className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
            {exported ? 'Exported!' : `Export Task`}
          </button>
        </div>
      </div>
    </div>
  );
}


