import { supabase} from '@/api/supabaseClient';
import React, { useState, useMemo} from 'react';
import { format} from 'date-fns';
import {
 Clock,
 Eye,
 Pencil,
 Trash2,
 GitCommitHorizontal,
 ArrowUpDown,
 Activity} from 'lucide-react';
import { Button} from '@/components/ui/button';
import { Badge} from '@/components/ui/badge';
import { Input} from '@/components/ui/input';
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
 DialogFooter} from '@/components/ui/dialog';
import { powerSync} from "@/api/PowerSyncConnector";
import { useToast} from '@/components/ui/use-toast';

const TIMELINE_COLORS = [
 { dot: 'bg-primary', border: 'border-primary/20', gradient: 'from-primary to-primary', lightBg: 'bg-muted/50', text: 'text-primary/90'},
 { dot: 'bg-primary', border: 'border-primary/20', gradient: 'from-primary to-primary', lightBg: 'bg-muted/50', text: 'text-primary/90'},
 { dot: 'bg-primary', border: 'border-primary/20', gradient: 'from-primary to-primary', lightBg: 'bg-muted/50', text: 'text-primary/90'},
 { dot: 'bg-amber-500', border: 'border-amber-200', gradient: 'from-amber-500 to-amber-600', lightBg: 'bg-amber-50', text: 'text-amber-700'},
 { dot: 'bg-rose-500', border: 'border-rose-200', gradient: 'from-rose-500 to-rose-600', lightBg: 'bg-rose-50', text: 'text-rose-700'},
 { dot: 'bg-primary', border: 'border-primary/20', gradient: 'from-primary to-primary', lightBg: 'bg-muted/50', text: 'text-primary/90'},
];

function getRecordTitle(record, fieldDefinitions) {
 const textFields = fieldDefinitions.filter((f) => f.field_type === 'text');
 if (textFields.length > 0) return record.data?.[textFields[0].name] || 'Untitled';
 const first = Object.values(record.data || {})[0];
 return first ? String(first) : 'Untitled';
}

function getRecordSubtitle(record, fieldDefinitions) {
 const textFields = fieldDefinitions.filter((f) => f.field_type === 'text');
 if (textFields.length > 1) return record.data?.[textFields[1].name] || '';
 return '';
}

export default function DynamicTimelineView({ data = [], fieldDefinitions = [], onRefresh, moduleDef}) {
 const { toast} = useToast();
 const [sortAsc, setSortAsc] = useState(false);
 const [viewRecord, setViewRecord] = useState(null);
 const [editRecord, setEditRecord] = useState(null);
 const [editData, setEditData] = useState({});
 const [deleteRecord, setDeleteRecord] = useState(null);
 const [isSaving, setIsSaving] = useState(false);
 const [isDeleting, setIsDeleting] = useState(false);

 const sortedData = useMemo(() => {
 const sorted = [...data].sort((a, b) => {
 const dateA = new Date(a.created_at || 0).getTime();
 const dateB = new Date(b.created_at || 0).getTime();
 return sortAsc ? dateA - dateB : dateB - dateA;
});
 return sorted;
}, [data, sortAsc]);

 // Group by date
 const groupedData = useMemo(() => {
 const groups = {};
 sortedData.forEach((record) => {
 const dateKey = record.created_at
 ? format(new Date(record.created_at), 'yyyy-MM-dd')
 : 'Unknown';
 if (!groups[dateKey]) groups[dateKey] = [];
 groups[dateKey].push(record);
});
 return groups;
}, [sortedData]);

 const openEdit = (record) => {
 setEditRecord(record);
 setEditData({ ...record.data});
};

 const handleSaveEdit = async () => {
 if (!editRecord) return;
 setIsSaving(true);
 try {
 const { error} = await supabase
 .from('dynamic_records')
 .update({ data: editData})
 .eq('id', editRecord.id);
 if (error) throw error;
 toast({ title: 'Record updated', description: 'Changes saved successfully.'});
 setEditRecord(null);
 if (onRefresh) onRefresh();
} catch (err) {
 toast({ title: 'Error', description: err.message || 'Failed to save.', variant: 'destructive'});
} finally {
 setIsSaving(false);
}
};

 const handleDelete = async () => {
 if (!deleteRecord) return;
 setIsDeleting(true);
 try {
 const { error} = await supabase
 .from('dynamic_records')
 .delete()
 .eq('id', deleteRecord.id);
 if (error) throw error;
 toast({ title: 'Record deleted', description: 'The record has been removed.'});
 setDeleteRecord(null);
 if (onRefresh) onRefresh();
} catch (err) {
 toast({ title: 'Error', description: err.message || 'Failed to delete.', variant: 'destructive'});
} finally {
 setIsDeleting(false);
}
};

 if (!data || data.length === 0) {
 return (
 <div className="flex flex-col items-center justify-center py-20 bg-gradient-to-br from-slate-50 to-primary/30 rounded-2xl border-[0.5px] border-black/9 dark:border-white/8 border-primary/40">
 <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary flex items-center justify-center mb-4 -violet-500/20">
 <Activity className="w-8 h-8 text-white" />
 </div>
 <h3 className="text-lg font-semibold text-slate-800 mb-1">No Activity Yet</h3>
 <p className="text-sm text-[#71717a] dark:text-gray-400 max-w-sm text-center">
 Add records to see them appear on the timeline.
 </p>
 </div>
 );
}

 let globalIndex = 0;

 return (
 <>
 {/* Header */}
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary flex items-center justify-center -violet-500/20">
 <Activity className="w-5 h-5 text-white" />
 </div>
 <div>
 <h2 className="text-lg font-semibold text-slate-800">Activity Timeline</h2>
 <p className="text-xs text-[#71717a] dark:text-gray-400 tracking-[0.04em]">{data.length} record{data.length !== 1 ? 's' : ''}</p>
 </div>
 </div>
 <Button
 variant="outline"
 size="sm"
 onClick={() => setSortAsc(!sortAsc)}
 className="gap-2 text-xs tracking-[0.04em]"
 >
 <ArrowUpDown className="w-3.5 h-3.5" />
 {sortAsc ? 'Oldest First' : 'Newest First'}
 </Button>
 </div>

 {/* Timeline */}
 <div className="relative">
 {Object.entries(groupedData).map(([dateKey, records]) => (
 <div key={dateKey} className="mb-8">
 {/* Date Header */}
 <div className="flex items-center gap-3 mb-4 relative z-10">
 <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white text-xs font-semibold px-4 py-2 rounded-full  tracking-[0.04em]">
 {dateKey !== 'Unknown' ? format(new Date(dateKey), 'EEEE, MMMM d, yyyy') : 'Unknown Date'}
 </div>
 <div className="flex-1 h-px bg-gradient-to-r from-slate-300 to-transparent" />
 </div>

 {/* Timeline items */}
 <div className="relative pl-0 md:pl-0">
 {/* Vertical line */}
 <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-slate-300 via-slate-200 to-transparent hidden md:block" />
 <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-slate-300 via-slate-200 to-transparent md:hidden" />

 {records.map((record, idx) => {
 const colorSet = TIMELINE_COLORS[globalIndex % TIMELINE_COLORS.length];
 const isLeft = globalIndex % 2 === 0;
 globalIndex++;

 return (
 <div
 key={record.id}
 className="relative mb-6 group"
 style={{ animationDelay: `${idx * 80}ms`}}
 >
 {/* Desktop: alternating layout */}
 <div className="hidden md:grid md:grid-cols-2 gap-8 items-start">
 {/* Left content */}
 <div className={`${isLeft ? '' : 'order-2'}`}>
 {isLeft && (
 <div className="flex justify-end">
 <TimelineCard
 record={record}
 fieldDefinitions={fieldDefinitions}
 colorSet={colorSet}
 onView={() => setViewRecord(record)}
 onEdit={() => openEdit(record)}
 onDelete={() => setDeleteRecord(record)}
 align="right"
 />
 </div>
 )}
 {!isLeft && (
 <div className="flex items-center justify-end h-full pt-4">
 <span className="text-xs text-[#71717a] dark:text-gray-400 font-medium flex items-center gap-2.5 tracking-[0.04em]">
 <Clock className="w-3 h-3" />
 {record.created_at ? format(new Date(record.created_at), 'h:mm a') : ''}
 </span>
 </div>
 )}
 </div>

 {/* Center dot */}
 <div className="absolute left-1/2 -translate-x-1/2 top-4 z-10 flex flex-col items-center">
 <div className={`w-4 h-4 rounded-full ${colorSet.dot} ring-4 ring-white transition-transform group-hover:scale-125`} />
 </div>

 {/* Right content */}
 <div className={`${isLeft ? 'order-2' : ''}`}>
 {!isLeft && (
 <div>
 <TimelineCard
 record={record}
 fieldDefinitions={fieldDefinitions}
 colorSet={colorSet}
 onView={() => setViewRecord(record)}
 onEdit={() => openEdit(record)}
 onDelete={() => setDeleteRecord(record)}
 align="left"
 />
 </div>
 )}
 {isLeft && (
 <div className="flex items-center h-full pt-4">
 <span className="text-xs text-[#71717a] dark:text-gray-400 font-medium flex items-center gap-2.5 tracking-[0.04em]">
 <Clock className="w-3 h-3" />
 {record.created_at ? format(new Date(record.created_at), 'h:mm a') : ''}
 </span>
 </div>
 )}
 </div>
 </div>

 {/* Mobile: single column */}
 <div className="md:hidden flex gap-4">
 {/* Dot */}
 <div className="flex flex-col items-center flex-shrink-0">
 <div className={`w-3.5 h-3.5 rounded-full ${colorSet.dot} ring-4 ring-white mt-4`} />
 </div>
 {/* Card */}
 <div className="flex-1 min-w-0">
 <TimelineCard
 record={record}
 fieldDefinitions={fieldDefinitions}
 colorSet={colorSet}
 onView={() => setViewRecord(record)}
 onEdit={() => openEdit(record)}
 onDelete={() => setDeleteRecord(record)}
 align="left"
 />
 </div>
 </div>
 </div>
 );
})}
 </div>
 </div>
 ))}

 {/* End marker */}
 <div className="flex justify-center md:justify-center">
 <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
 <GitCommitHorizontal className="w-4 h-4 text-[#71717a] dark:text-gray-400" />
 </div>
 </div>
 </div>

 {/* View Record Dialog */}
 <Dialog open={!!viewRecord} onOpenChange={(open) => !open && setViewRecord(null)}>
 <DialogContent className="sm:max-w-[500px]">
 <DialogHeader>
 <DialogTitle>Record Details</DialogTitle>
 <DialogDescription>Full data for this record.</DialogDescription>
 </DialogHeader>
 {viewRecord && (
 <div className="mt-2 space-y-2">
 {fieldDefinitions.map((f) => (
 <div key={f.name} className="flex justify-between items-center py-2 border-b border-primary/40 last:border-0">
 <span className="text-xs font-semibold text-[#71717a] dark:text-gray-400 uppercase tracking-wide tracking-[0.04em]">{f.name.replace(/_/g, ' ')}</span>
 <span className="text-sm font-medium text-foreground max-w-[60%] text-right break-words">
 {f.field_type === 'boolean' ? (viewRecord.data[f.name] ? 'Yes' : 'No') :
 f.field_type === 'date' && viewRecord.data[f.name] ? format(new Date(viewRecord.data[f.name]), 'MMM d, yyyy') :
 String(viewRecord.data[f.name] ?? '-')}
 </span>
 </div>
 ))}
 <p className="text-[11px] text-[#71717a] dark:text-gray-400 pt-2">Created: {new Date(viewRecord.created_at).toLocaleString()}</p>
 </div>
 )}
 <DialogFooter className="mt-4">
 <Button variant="outline" onClick={() => setViewRecord(null)}>Close</Button>
 <Button onClick={() => { openEdit(viewRecord); setViewRecord(null);}} className="gap-2">
 <Pencil className="h-4 w-4" /> Edit Record
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Edit Record Dialog */}
 <Dialog open={!!editRecord} onOpenChange={(open) => !open && setEditRecord(null)}>
 <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>Edit Record</DialogTitle>
 <DialogDescription>Update the values below and save your changes.</DialogDescription>
 </DialogHeader>
 <div className="mt-4 space-y-4">
 {fieldDefinitions.map((f) => {
 const label = f.name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
 const val = editData[f.name] ?? '';
 if (f.field_type === 'boolean') {
 return (
 <div key={f.name} className="flex items-center justify-between py-2 border-b border-primary/40 last:border-0">
 <label className="text-sm font-medium text-foreground">{label}</label>
 <input type="checkbox" checked={!!val} onChange={(e) => setEditData({ ...editData, [f.name]: e.target.checked})} className="h-4 w-4 rounded-md border-primary/40" />
 </div>
 );
}
 if (f.field_type === 'select') {
 let options = [];
 try { options = typeof f.options === 'string' ? JSON.parse(f.options) : (f.options || []);} catch { options = [];}
 return (
 <div key={f.name} className="space-y-1">
 <label className="text-xs font-semibold text-[#71717a] dark:text-gray-400 uppercase tracking-wide tracking-[0.04em]">{label}</label>
 <select value={val} onChange={(e) => setEditData({ ...editData, [f.name]: e.target.value})} className="w-full rounded-xl border-[0.5px] border-black/9 dark:border-white/8 border-primary/40 bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200">
 <option value="">Select...</option>
 {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
 </select>
 </div>
 );
}
 return (
 <div key={f.name} className="space-y-1">
 <label className="text-xs font-semibold text-[#71717a] dark:text-gray-400 uppercase tracking-wide tracking-[0.04em]">{label}</label>
 <Input type={f.field_type === 'date' ? 'date' : f.field_type === 'number' ? 'number' : 'text'} value={val} onChange={(e) => setEditData({ ...editData, [f.name]: e.target.value})} />
 </div>
 );
})}
 </div>
 <DialogFooter className="mt-6 pt-4 border-t border-primary/40">
 <Button variant="outline" onClick={() => setEditRecord(null)}>Cancel</Button>
 <Button onClick={handleSaveEdit} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-white">
 {isSaving ? 'Saving...' : 'Save Changes'}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Delete Confirmation */}
 <Dialog open={!!deleteRecord} onOpenChange={(open) => !open && setDeleteRecord(null)}>
 <DialogContent className="sm:max-w-[425px]">
 <DialogHeader>
 <DialogTitle>Delete Record</DialogTitle>
 <DialogDescription>Are you sure you want to delete this record? This action cannot be undone.</DialogDescription>
 </DialogHeader>
 <DialogFooter className="mt-4">
 <Button variant="outline" onClick={() => setDeleteRecord(null)}>Cancel</Button>
 <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
 {isDeleting ? 'Deleting...' : 'Delete Record'}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </>
 );
}

// Timeline Card sub-component
function TimelineCard({ record, fieldDefinitions, colorSet, onView, onEdit, onDelete, align}) {
 const title = (() => {
 const textFields = fieldDefinitions.filter((f) => f.field_type === 'text');
 if (textFields.length > 0) return record.data?.[textFields[0].name] || 'Untitled';
 const first = Object.values(record.data || {})[0];
 return first ? String(first) : 'Untitled';
})();

 const subtitle = (() => {
 const textFields = fieldDefinitions.filter((f) => f.field_type === 'text');
 if (textFields.length > 1) return record.data?.[textFields[1].name] || '';
 return '';
})();

 const otherFields = fieldDefinitions.filter((f) => f.field_type !== 'text').slice(0, 3);

 return (
 <div className={`w-full max-w-md bg-card rounded-xl border-[0.5px] border-black/9 dark:border-white/8 border-primary/40 transition-all duration-300 overflow-hidden group/card`}>
 {/* Gradient accent bar */}
 <div className={`h-1 bg-gradient-to-r ${colorSet.gradient}`} />

 <div className="p-4">
 <div className="flex items-start justify-between">
 <div className="flex-1 min-w-0">
 <h4 className="font-semibold text-slate-800 text-sm truncate">{title}</h4>
 {subtitle && (
 <p className="text-xs text-[#71717a] dark:text-gray-400 mt-0.5 truncate tracking-[0.04em]">{subtitle}</p>
 )}
 </div>
 <div className="flex gap-2 opacity-0 group-hover/card:opacity-100 transition-opacity ml-2 flex-shrink-0 hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200">
 <button onClick={onView} className="p-1.5 rounded-xl bg-muted text-[#71717a] dark:text-gray-400 hover:text-primary hover:bg-muted/50 transition-colors">
 <Eye className="w-3.5 h-3.5" />
 </button>
 <button onClick={onEdit} className="p-1.5 rounded-xl bg-muted text-[#71717a] dark:text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
 <Pencil className="w-3.5 h-3.5" />
 </button>
 <button onClick={onDelete} className="p-1.5 rounded-xl bg-muted text-[#71717a] dark:text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 </div>

 {/* Field values */}
 {otherFields.length > 0 && (
 <div className="mt-3 flex flex-wrap gap-2.5">
 {otherFields.map((f) => {
 const val = record.data?.[f.name];
 if (val === undefined || val === null || val === '') return null;
 return (
 <span key={f.name} className={`inline-flex items-center gap-2 text-[10px] font-medium px-2 py-0.5 rounded-lg ${colorSet.lightBg} ${colorSet.text}`}>
 <span className="text-[#71717a] dark:text-gray-400">{f.name.replace(/_/g, ' ')}:</span>
 {f.field_type === 'boolean' ? (val ? 'Yes' : 'No') :
 f.field_type === 'date' ? (() => { try { return format(new Date(val), 'MMM d');} catch { return String(val);}})() :
 String(val)}
 </span>
 );
})}
 </div>
 )}

 {/* Timestamp */}
 <div className="mt-3 pt-2 border-t border-primary/40 flex items-center gap-2.5 text-[10px] text-[#71717a] dark:text-gray-400">
 <Clock className="w-3 h-3" />
 {record.created_at ? format(new Date(record.created_at), 'MMM d, yyyy · h:mm a') : 'Unknown'}
 </div>
 </div>
 </div>
 );
}
