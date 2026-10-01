import React from 'react';
import { Plus} from 'lucide-react';

export default function OrbitEmptyState({ 
 icon: Icon, 
 title, 
 description, 
 actionLabel, 
 onAction,
 moduleColor = 'var(--color-accent-primary)'
}) {
 return (
 <div className="flex flex-col items-center justify-center p-12 text-center border-[0.5px] border-black/9 dark:border-white/8 border-dashed border-[var(--color-border-strong)] rounded-md-[var(--radius-xl)] bg-[var(--color-surface-1)] hover:bg-[var(--color-surface-2)] transition-colors duration-300">
 <div 
 className="w-24 h-24 rounded-full flex items-center justify-center mb-6 opacity-80"
 style={{ backgroundColor: `color-mix(in srgb, ${moduleColor} 10%, transparent)`}}
 >
 <Icon className="w-12 h-12" style={{ color: moduleColor}} />
 </div>
 
 <h2 className="font-display italic text-[var(--text-2xl)] text-[var(--color-text-primary)] mb-2 font-light tracking-tight tracking-[-0.02em]">
 {title}
 </h2>
 
 <p className="text-[var(--text-base)] text-[var(--color-text-secondary)] max-w-sm mb-8 leading-relaxed">
 {description}
 </p>
 
 {actionLabel && onAction && (
 <button 
 onClick={onAction}
 className="flex items-center gap-2 px-6 py-3 bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-secondary)] text-white rounded-md-[var(--radius-md)] font-medium transition-all duration-200 hover:-translate-y-0.5 -[var(--color-accent-glow)]"
 >
 <Plus className="w-4 h-4" />
 {actionLabel}
 </button>
 )}
 </div>
 );
}
