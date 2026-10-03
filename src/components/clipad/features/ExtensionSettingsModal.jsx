import React, { useState } from 'react';
import { X, Shield, Globe, EyeOff, Lock, Laptop, CheckCircle2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function ExtensionSettingsModal({ onClose }) {
  const [mode, setMode] = useState('ACTIVE'); // ACTIVE, PAUSED, PRIVATE
  const [exclusions, setExclusions] = useState('banking.com\npersonal-email.com');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // Simulated save for Phase 6 Extension Configuration
    setSaved(true);
    toast({ title: 'Preferences Saved', description: 'Browser extension settings updated successfully.' });
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-950 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center">
              <Laptop className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Browser Extension Settings</h2>
              <p className="text-sm text-slate-500">Manage what context gets captured automatically.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
          {/* Capture Modes */}
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Global Capture Mode</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button 
                onClick={() => setMode('ACTIVE')}
                className={\`p-4 rounded-2xl border text-left transition-all \${mode === 'ACTIVE' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 ring-1 ring-emerald-500' : 'border-slate-200 dark:border-slate-800 hover:border-emerald-300'}\`}
              >
                <Globe className={\`w-6 h-6 mb-3 \${mode === 'ACTIVE' ? 'text-emerald-500' : 'text-slate-400'}\`} />
                <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Capture ON</h4>
                <p className="text-xs text-slate-500">Continuously capture context for Org Memory.</p>
              </button>

              <button 
                onClick={() => setMode('PRIVATE')}
                className={\`p-4 rounded-2xl border text-left transition-all \${mode === 'PRIVATE' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/10 ring-1 ring-amber-500' : 'border-slate-200 dark:border-slate-800 hover:border-amber-300'}\`}
              >
                <Shield className={\`w-6 h-6 mb-3 \${mode === 'PRIVATE' ? 'text-amber-500' : 'text-slate-400'}\`} />
                <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Private Session</h4>
                <p className="text-xs text-slate-500">Capture locally, but never upload to Org Memory.</p>
              </button>

              <button 
                onClick={() => setMode('PAUSED')}
                className={\`p-4 rounded-2xl border text-left transition-all \${mode === 'PAUSED' ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/10 ring-1 ring-rose-500' : 'border-slate-200 dark:border-slate-800 hover:border-rose-300'}\`}
              >
                <EyeOff className={\`w-6 h-6 mb-3 \${mode === 'PAUSED' ? 'text-rose-500' : 'text-slate-400'}\`} />
                <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Capture OFF</h4>
                <p className="text-xs text-slate-500">Pause all background visual & text capture entirely.</p>
              </button>
            </div>
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-800" />

          {/* Privacy Controls */}
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-500" /> Excluded Sites (Never Capture)
            </h3>
            <p className="text-sm text-slate-500 mb-4">List domains that should never be recorded or contextualized.</p>
            <textarea
              value={exclusions}
              onChange={e => setExclusions(e.target.value)}
              placeholder="e.g. yourbank.com"
              className="w-full h-32 px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono focus:border-indigo-500 outline-none resize-none"
            />
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
            <h4 className="font-bold text-blue-900 dark:text-blue-200 text-sm mb-1">Privacy Guarantee</h4>
            <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
              Sensitive/private sources explicitly excluded here will bypass the Capture Layer entirely and will never automatically become organizational memory. Your visual context remains explicitly under your control.
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-md">
            {saved ? <><CheckCircle2 className="w-4 h-4" /> Saved</> : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}
