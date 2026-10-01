import { supabase} from '@/api/supabaseClient';
import React, { useState, useEffect, useMemo} from 'react';
import { format} from 'date-fns';
import { Button} from '@/components/ui/button';
import { Badge} from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter} from '@/components/ui/dialog';
import { Input} from '@/components/ui/input';
import { powerSync} from "@/api/PowerSyncConnector";
import { useToast} from '@/components/ui/use-toast';
import {
 GripVertical,
 DollarSign,
 Hash,
 User,
 ChevronRight,
 Plus,
 Eye,
 MoreHorizontal,
 Sparkles,
 TrendingUp,
 Layers} from 'lucide-react';

const STAGE_COLORS = [
 { bg: 'from-slate-500 to-slate-600', light: 'bg-muted/50', border: 'border-primary/40', text: 'text-foreground', badge: 'bg-muted text-[#71717a] dark:text-gray-400'},
 { bg: 'from-primary to-primary', light: 'bg-muted/50', border: 'border-primary/20', text: 'text-primary/90', badge: 'bg-muted text-primary'},
 { bg: 'from-primary to-primary', light: 'bg-muted/50', border: 'border-primary/20', text: 'text-primary/90', badge: 'bg-muted text-primary'},
 { bg: 'from-primary to-primary', light: 'bg-muted/50', border: 'border-primary/20', text: 'text-primary/90', badge: 'bg-muted text-primary'},
 { bg: 'from-primary to-primary', light: 'bg-muted/50', border: 'border-primary/20', text: 'text-primary/90', badge: 'bg-muted text-primary'},
 { bg: 'from-primary to-primary', light: 'bg-muted/50', border: 'border-primary/20', text: 'text-primary/90', badge: 'bg-muted text-primary'},
 { bg: 'from-amber-500 to-amber-600', light: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-600'},
 { bg: 'from-rose-500 to-rose-600', light: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-600'},
];

function PipelineCard({ record, fieldDefinitions, stageFieldName, onView, colorTheme}) {
 const textFields = fieldDefinitions.filter(f => f.field_type === 'text' && f.name !== stageFieldName).slice(0, 2);
 const numberFields = fieldDefinitions.filter(f => f.field_type === 'number').slice(0, 2);
 const title = record.data?.name || record.data?.title || textFields[0]?.name ? record.data?.[textFields[0]?.name] : Object.values(record.data || {})[0];

 return (
 <div
 draggable
 onDragStart={(e) => {
 e.dataTransfer.setData('text/plain', JSON.stringify({ id: record.id, sourceStage: record.data?.[stageFieldName]}));
 e.dataTransfer.effectAllowed = 'move';
 e.currentTarget.style.opacity = '0.5';
 e.currentTarget.style.transform = 'rotate(2deg)';
}}
 onDragEnd={(e) => {
 e.currentTarget.style.opacity = '1';
 e.currentTarget.style.transform = 'rotate(0deg)';
}}
 className="bg-card rounded-xl border-[0.5px] border-black/9 dark:border-white/8 border-primary/40 p-4 cursor-grab active:cursor-grabbing transition-all duration-200 hover:border-primary/40 group hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200"
 >
 <div className="flex items-start justify-between mb-2">
 <div className="flex items-center gap-2 min-w-0">
 <GripVertical className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
 <h4 className="text-sm font-semibold text-slate-800 truncate">
 {title || 'Untitled'}
 </h4>
 </div>
 <button
 onClick={(e) => { e.stopPropagation(); onView(record);}}
 className="p-1 rounded-xl text-[#71717a] dark:text-gray-400 hover:text-[#71717a] dark:text-gray-400 hover:bg-muted opacity-0 group-hover:opacity-100 transition-all"
 >
 <Eye className="w-3.5 h-3.5" />
 </button>
 </div>

 {textFields.length > 1 && record.data?.[textFields[1]?.name] && (
 <p className="text-xs text-[#71717a] dark:text-gray-400 mb-3 line-clamp-2 pl-5 tracking-[0.04em]">
 {record.data[textFields[1].name]}
 </p>
 )}

 {numberFields.length > 0 && (
 <div className="flex flex-wrap gap-2.5 mt-2">
 {numberFields.map(f => {
 const val = record.data?.[f.name];
 if (val === undefined || val === null || val === '') return null;
 return (
 <span
 key={f.name}
 className={`inline-flex items-center gap-2 text-xs font-semibold px-2 py-1 rounded-xl ${colorTheme.badge}`}
 >
 <Hash className="w-3 h-3" />
 {Number(val).toLocaleString()}
 </span>
 );
})}
 </div>
 )}

 <div className="flex items-center justify-between mt-3 pt-2 border-t border-primary/40">
 <span className="text-[10px] text-[#71717a] dark:text-gray-400">
 {record.created_at ? format(new Date(record.created_at), 'MMM d, yyyy') : ''}
 </span>
 <div className="w-5 h-5 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
 <User className="w-3 h-3 text-[#71717a] dark:text-gray-400" />
 </div>
 </div>
 </div>
 );
}

export default function DynamicPipelineView({ data = [], fieldDefinitions = [], onRefresh, moduleDef}) {
 const { toast} = useToast();
 const [viewRecord, setViewRecord] = useState(null);
 const [dragOverStage, setDragOverStage] = useState(null);

 // Find the select field to use as pipeline stage
 const stageField = useMemo(() => {
 const priority = ['stage', 'status', 'pipeline', 'phase'];
 for (const name of priority) {
 const found = fieldDefinitions.find(f => f.field_type === 'select' && f.name.toLowerCase() === name);
 if (found) return found;
}
 return fieldDefinitions.find(f => f.field_type === 'select') || null;
}, [fieldDefinitions]);

 const stageFieldName = stageField?.name || 'status';

 // Get stages (columns)
 const stages = useMemo(() => {
 if (!stageField) return ['New', 'In Progress', 'Done'];
 let opts = [];
 try {
 opts = typeof stageField.options === 'string' ? JSON.parse(stageField.options) : (stageField.options || []);
} catch {
 opts = [];
}
 return opts.length > 0 ? opts : ['New', 'In Progress', 'Done'];
}, [stageField]);

 // Group records by stage
 const columns = useMemo(() => {
 const cols = {};
 stages.forEach(s => (cols[s] = []));
 data.forEach(r => {
 const val = r.data?.[stageFieldName];
 if (val && cols[val]) {
 cols[val].push(r);
} else if (val && !cols[val]) {
 cols[val] = [r];
} else {
 const firstStage = stages[0] || 'New';
 if (!cols[firstStage]) cols[firstStage] = [];
 cols[firstStage].push(r);
}
});
 return cols;
}, [data, stages, stageFieldName]);

 // Number fields for totals
 const numberFields = useMemo(
 () => fieldDefinitions.filter(f => f.field_type === 'number'),
 [fieldDefinitions]
 );

 const getColumnTotal = (records, fieldName) => {
 return records.reduce((sum, r) => {
 const val = parseFloat(r.data?.[fieldName]);
 return sum + (isNaN(val) ? 0 : val);
}, 0);
};

 const handleDrop = async (stage, e) => {
 e.preventDefault();
 setDragOverStage(null);

 try {
 const payload = JSON.parse(e.dataTransfer.getData('text/plain'));
 if (payload.sourceStage === stage) return;

 const record = data.find(r => r.id === payload.id);
 if (!record) return;

 const updatedData = { ...record.data, [stageFieldName]: stage};

 const { error} = await supabase
 .from('dynamic_records')
 .update({ data: updatedData})
 .eq('id', record.id);

 if (error) throw error;

 toast({
 title: 'Card Moved',
 description: `Moved to "${stage}" successfully.`});
 if (onRefresh) onRefresh();
} catch (err) {
 toast({
 title: 'Move Failed',
 description: err.message || 'Could not move card.',
 variant: 'destructive'});
}
};

 if (!stageField && fieldDefinitions.length > 0) {
 return (
 <div className="flex flex-col items-center justify-center py-20 text-center">
 <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/5 border-[0.5px] border-black/9 dark:border-white/8 border-primary/40 mb-5">
 <Layers className="w-12 h-12 text-primary/30" />
 </div>
 <h3 className="text-lg font-semibold text-foreground mb-2">No Pipeline Field Found</h3>
 <p className="text-sm text-[#71717a] dark:text-gray-400 max-w-sm">
 Add a select field (e.g., "stage" or "status") to your module to enable the pipeline view.
 </p>
 </div>
 );
}

 if (!data || data.length === 0) {
 return (
 <div className="flex flex-col items-center justify-center py-20 text-center">
 <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/5 border-[0.5px] border-black/9 dark:border-white/8 border-primary/40 mb-5">
 <Sparkles className="w-12 h-12 text-primary/30" />
 </div>
 <h3 className="text-lg font-semibold text-foreground mb-2">Empty Pipeline</h3>
 <p className="text-sm text-[#71717a] dark:text-gray-400 max-w-sm">
 No records yet. Add your first record to see it in the pipeline.
 </p>
 </div>
 );
}

 return (
 <>
 {/* Pipeline Header Stats */}
 <div className="mb-5 flex items-center gap-4 flex-wrap">
 <div className="flex items-center gap-2">
 <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary -indigo-200">
 <TrendingUp className="w-4 h-4 text-white" />
 </div>
 <div>
 <p className="text-xs text-[#71717a] dark:text-gray-400 font-medium tracking-[0.04em]">Pipeline</p>
 <p className="text-sm font-semibold text-slate-800">{data.length} deals</p>
 </div>
 </div>
 {numberFields.slice(0, 1).map(nf => {
 const total = data.reduce((s, r) => s + (parseFloat(r.data?.[nf.name]) || 0), 0);
 return (
 <div key={nf.name} className="flex items-center gap-2 ml-4">
 <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary -emerald-200">
 <DollarSign className="w-4 h-4 text-white" />
 </div>
 <div>
 <p className="text-xs text-[#71717a] dark:text-gray-400 font-medium tracking-[0.04em]">Total {nf.name.replace(/_/g, ' ')}</p>
 <p className="text-sm font-semibold text-slate-800">{total.toLocaleString()}</p>
 </div>
 </div>
 );
})}
 </div>

 {/* Pipeline Columns */}
 <div className="flex gap-4 overflow-x-auto pb-4 items-start" style={{ minHeight: '500px'}}>
 {stages.map((stage, idx) => {
 const records = columns[stage] || [];
 const color = STAGE_COLORS[idx % STAGE_COLORS.length];
 const isDragOver = dragOverStage === stage;

 return (
 <div
 key={stage}
 className={`w-[300px] flex-shrink-0 rounded-2xl flex flex-col max-h-[700px] border-[0.5px] border-black/9 dark:border-white/8 transition-all duration-200 ${
 isDragOver
 ? `${color.border} ring-2 ring-offset-2 ring-primary/30`
 : 'border-primary/40 '
}`}
 style={{ backgroundColor: isDragOver ? '#f0f4ff' : '#fafbfc'}}
 onDragOver={(e) => {
 e.preventDefault();
 e.dataTransfer.dropEffect = 'move';
 setDragOverStage(stage);
}}
 onDragLeave={() => setDragOverStage(null)}
 onDrop={(e) => handleDrop(stage, e)}
 >
 {/* Column Header */}
 <div className={`p-4 rounded-md-t-2xl bg-gradient-to-r ${color.bg}`}>
 <div className="flex items-center justify-between">
 <h3 className="text-sm font-semibold text-white truncate">{stage}</h3>
 <Badge className="bg-card/20 text-white border-0 text-xs font-semibold backdrop-blur-sm tracking-[0.04em] hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200">
 {records.length}
 </Badge>
 </div>
 {numberFields.slice(0, 1).map(nf => {
 const total = getColumnTotal(records, nf.name);
 return (
 <p key={nf.name} className="text-xs text-white/80 mt-1 font-medium tracking-[0.04em]">
 {nf.name.replace(/_/g, ' ')}: {total.toLocaleString()}
 </p>
 );
})}
 </div>

 {/* Cards */}
 <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ minHeight: '120px'}}>
 {records.length === 0 && (
 <div className="flex flex-col items-center justify-center py-8 text-center">
 <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
 <Plus className="w-4 h-4 text-[#71717a] dark:text-gray-400" />
 </div>
 <p className="text-xs text-[#71717a] dark:text-gray-400 tracking-[0.04em]">Drop cards here</p>
 </div>
 )}
 {records.map(record => (
 <PipelineCard
 key={record.id}
 record={record}
 fieldDefinitions={fieldDefinitions}
 stageFieldName={stageFieldName}
 onView={setViewRecord}
 colorTheme={color}
 />
 ))}
 </div>

 {/* Column Footer */}
 <div className="p-3 border-t border-primary/40">
 <div className="flex items-center justify-center">
 <ChevronRight className="w-3.5 h-3.5 text-[#71717a] dark:text-gray-400 mr-1" />
 <span className="text-[10px] text-[#71717a] dark:text-gray-400 font-medium uppercase tracking-wider tracking-[0.04em]">
 {idx < stages.length - 1 ? `→ ${stages[idx + 1]}` : 'Final stage'}
 </span>
 </div>
 </div>
 </div>
 );
})}
 </div>

 {/* View Dialog */}
 <Dialog open={!!viewRecord} onOpenChange={(open) => !open && setViewRecord(null)}>
 <DialogContent className="sm:max-w-[500px]">
 <DialogHeader>
 <DialogTitle>Record Details</DialogTitle>
 <DialogDescription>Full details for this pipeline card.</DialogDescription>
 </DialogHeader>
 {viewRecord && (
 <div className="mt-2 space-y-2">
 {fieldDefinitions.map(f => (
 <div key={f.name} className="flex justify-between items-center py-2.5 border-b border-primary/40 last:border-0">
 <span className="text-xs font-semibold text-[#71717a] dark:text-gray-400 uppercase tracking-wide tracking-[0.04em]">
 {f.name.replace(/_/g, ' ')}
 </span>
 <span className="text-sm font-medium text-foreground max-w-[60%] text-right break-words">
 {f.field_type === 'boolean'
 ? (viewRecord.data?.[f.name] ? 'Yes' : 'No')
 : f.field_type === 'date' && viewRecord.data?.[f.name]
 ? format(new Date(viewRecord.data[f.name]), 'MMM d, yyyy')
 : String(viewRecord.data?.[f.name] ?? '-')}
 </span>
 </div>
 ))}
 <p className="text-[11px] text-[#71717a] dark:text-gray-400 pt-2">
 Created: {viewRecord.created_at ? new Date(viewRecord.created_at).toLocaleString() : '-'}
 </p>
 </div>
 )}
 <DialogFooter className="mt-4">
 <Button variant="outline" onClick={() => setViewRecord(null)}>Close</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </>
 );
}
