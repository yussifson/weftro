import { supabase} from '@/api/supabaseClient';
import React, { useState, useMemo} from 'react';
import { format} from 'date-fns';
import { Button} from '@/components/ui/button';
import { Badge} from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter} from '@/components/ui/dialog';
import { Input} from '@/components/ui/input';
import { powerSync} from "@/api/PowerSyncConnector";
import { useToast} from '@/components/ui/use-toast';
import {
 CheckCircle2,
 XCircle,
 Clock,
 RotateCcw,
 ChevronDown,
 ChevronRight,
 FileText,
 Shield,
 AlertTriangle,
 Send,
 User,
 Eye,
 Inbox,
 Sparkles} from 'lucide-react';

const DEFAULT_STATUSES = ['Submitted', 'Under Review', 'Approved', 'Rejected'];

const STATUS_CONFIG = {
 submitted: {
 icon: Send,
 color: 'text-primary',
 bg: 'bg-muted/50',
 border: 'border-primary/20',
 gradient: 'from-primary to-primary',
 badgeCls: 'bg-orange-100 text-orange-700',
 ring: 'ring-primary/20'},
 'under review': {
 icon: Clock,
 color: 'text-amber-600',
 bg: 'bg-amber-50',
 border: 'border-amber-200',
 gradient: 'from-amber-500 to-orange-500',
 badgeCls: 'bg-amber-100 text-amber-700',
 ring: 'ring-amber-200'},
 approved: {
 icon: CheckCircle2,
 color: 'text-primary',
 bg: 'bg-muted/50',
 border: 'border-primary/20',
 gradient: 'from-primary to-primary',
 badgeCls: 'bg-primary/10 text-primary',
 ring: 'ring-primary/20'},
 rejected: {
 icon: XCircle,
 color: 'text-red-600',
 bg: 'bg-red-50',
 border: 'border-red-200',
 gradient: 'from-red-500 to-rose-500',
 badgeCls: 'bg-red-100 text-red-700',
 ring: 'ring-red-200'}};

const FALLBACK_CONFIG = {
 icon: FileText,
 color: 'text-[#71717a] dark:text-gray-400',
 bg: 'bg-muted/50',
 border: 'border-primary/40',
 gradient: 'from-slate-500 to-slate-600',
 badgeCls: 'bg-muted text-[#71717a] dark:text-gray-400',
 ring: 'ring-slate-200'};

function getStatusConfig(status) {
 if (!status) return FALLBACK_CONFIG;
 const key = status.toLowerCase().trim();
 return STATUS_CONFIG[key] || FALLBACK_CONFIG;
}

function ProgressionBar({ currentStatus, statuses}) {
 const currentIdx = statuses.findIndex(
 s => s.toLowerCase() === (currentStatus || '').toLowerCase()
 );

 return (
 <div className="flex items-center gap-2 w-full">
 {statuses.map((status, idx) => {
 const config = getStatusConfig(status);
 const isActive = idx === currentIdx;
 const isPast = idx < currentIdx;
 const StatusIcon = config.icon;

 return (
 <React.Fragment key={status}>
 <div className="flex flex-col items-center flex-shrink-0">
 <div
 className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
 isActive
 ? `bg-gradient-to-br ${config.gradient} ring-2 ${config.ring} ring-offset-1`
 : isPast
 ? `bg-gradient-to-br ${config.gradient} opacity-60`
 : 'bg-muted border-[0.5px] border-black/9 dark:border-white/8 border-primary/40'
}`}
 >
 <StatusIcon
 className={`w-3.5 h-3.5 ${isActive || isPast ? 'text-white' : 'text-[#71717a] dark:text-gray-400'}`}
 />
 </div>
 <span
 className={`text-[9px] mt-1.5 font-semibold text-center leading-tight max-w-[60px] ${
 isActive ? config.color : isPast ? 'text-[#71717a] dark:text-gray-400' : 'text-[#71717a] dark:text-gray-400'
}`}
 >
 {status}
 </span>
 </div>
 {idx < statuses.length - 1 && (
 <div
 className={`flex-1 h-0.5 rounded-full transition-all duration-300 mt-[-12px] ${
 isPast ? 'bg-gradient-to-r from-primary/70 to-primary/30' : 'bg-muted'
}`}
 />
 )}
 </React.Fragment>
 );
})}
 </div>
 );
}

function ApprovalCard({ record, fieldDefinitions, statusFieldName, statuses, onAction, onView}) {
 const status = record.data?.[statusFieldName] || statuses[0];
 const config = getStatusConfig(status);
 const StatusIcon = config.icon;
 const textFields = fieldDefinitions.filter(
 f => f.field_type === 'text' && f.name !== statusFieldName
 ).slice(0, 3);
 const title =
 record.data?.name ||
 record.data?.title ||
 (textFields[0] ? record.data?.[textFields[0].name] : null) ||
 'Untitled';

 const isTerminal = ['approved', 'rejected'].includes(status.toLowerCase());

 return (
 <div
 className={`rounded-2xl border ${config.border} ${config.bg} overflow-hidden transition-all duration-300 group`}
 >
 {/* Top accent bar */}
 <div className={`h-1 bg-gradient-to-r ${config.gradient}`} />

 <div className="p-5">
 {/* Header */}
 <div className="flex items-start justify-between mb-4">
 <div className="flex items-center gap-3 min-w-0">
 <div className={`p-2 rounded-xl bg-card border ${config.border}`}>
 <StatusIcon className={`w-4 h-4 ${config.color}`} />
 </div>
 <div className="min-w-0">
 <h4 className="text-sm font-semibold text-foreground truncate">{title}</h4>
 <div className="flex items-center gap-2 mt-0.5">
 <Badge className={`text-[10px] font-semibold ${config.badgeCls} border-0`}>
 {status}
 </Badge>
 <span className="text-[10px] text-[#71717a] dark:text-gray-400">
 {record.created_at ? format(new Date(record.created_at), 'MMM d, yyyy') : ''}
 </span>
 </div>
 </div>
 </div>
 <button
 onClick={() => onView(record)}
 className="p-1.5 rounded-xl text-[#71717a] dark:text-gray-400 hover:text-[#71717a] dark:text-gray-400 hover:bg-card opacity-0 group-hover:opacity-100 transition-all hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200"
 >
 <Eye className="w-4 h-4" />
 </button>
 </div>

 {/* Content preview */}
 <div className="space-y-1.5 mb-4">
 {textFields.slice(1).map(f => {
 const val = record.data?.[f.name];
 if (!val) return null;
 return (
 <p key={f.name} className="text-xs text-[#71717a] dark:text-gray-400 line-clamp-1 tracking-[0.04em]">
 <span className="text-[#71717a] dark:text-gray-400 font-medium">
 {f.name.replace(/_/g, ' ')}:
 </span>{' '}
 {val}
 </p>
 );
})}
 </div>

 {/* Progression Bar */}
 <div className="bg-card rounded-xl p-3 border-[0.5px] border-black/9 dark:border-white/8 border-primary/40 mb-4 hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200">
 <ProgressionBar currentStatus={status} statuses={statuses} />
 </div>

 {/* Action Buttons */}
 {!isTerminal && (
 <div className="flex gap-2">
 <Button
 size="sm"
 onClick={() => onAction(record, 'Approved')}
 className="flex-1 bg-gradient-to-r from-primary to-primary hover:from-primary hover:to-primary text-white -emerald-200 text-xs h-8 gap-2.5 tracking-[0.04em]"
 >
 <CheckCircle2 className="w-3.5 h-3.5" />
 Approve
 </Button>
 <Button
 size="sm"
 variant="outline"
 onClick={() => onAction(record, 'Rejected')}
 className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 text-xs h-8 gap-2.5 tracking-[0.04em]"
 >
 <XCircle className="w-3.5 h-3.5" />
 Reject
 </Button>
 {status.toLowerCase() !== 'submitted' && (
 <Button
 size="sm"
 variant="outline"
 onClick={() => onAction(record, 'Submitted')}
 className="text-[#71717a] dark:text-gray-400 border-primary/40 hover:bg-muted/50 text-xs h-8 gap-2.5 tracking-[0.04em]"
 >
 <RotateCcw className="w-3.5 h-3.5" />
 Return
 </Button>
 )}
 </div>
 )}

 {isTerminal && (
 <div className="flex gap-2">
 <Button
 size="sm"
 variant="outline"
 onClick={() => onAction(record, 'Under Review')}
 className="flex-1 text-amber-600 border-amber-200 hover:bg-amber-50 text-xs h-8 gap-2.5 tracking-[0.04em]"
 >
 <RotateCcw className="w-3.5 h-3.5" />
 Reopen for Review
 </Button>
 </div>
 )}
 </div>
 </div>
 );
}

export default function DynamicApprovalView({ data = [], fieldDefinitions = [], onRefresh, moduleDef}) {
 const { toast} = useToast();
 const [collapsedSections, setCollapsedSections] = useState({});
 const [viewRecord, setViewRecord] = useState(null);
 const [confirmAction, setConfirmAction] = useState(null);
 const [isUpdating, setIsUpdating] = useState(false);

 // Find the status field
 const statusField = useMemo(() => {
 const priority = ['status', 'approval_status', 'state', 'approval'];
 for (const name of priority) {
 const found = fieldDefinitions.find(
 f => f.field_type === 'select' && f.name.toLowerCase() === name
 );
 if (found) return found;
}
 return fieldDefinitions.find(f => f.field_type === 'select') || null;
}, [fieldDefinitions]);

 const statusFieldName = statusField?.name || 'status';

 const statuses = useMemo(() => {
 if (!statusField) return DEFAULT_STATUSES;
 let opts = [];
 try {
 opts = typeof statusField.options === 'string'
 ? JSON.parse(statusField.options)
 : (statusField.options || []);
} catch {
 opts = [];
}
 return opts.length > 0 ? opts : DEFAULT_STATUSES;
}, [statusField]);

 // Group records by status
 const grouped = useMemo(() => {
 const groups = {};
 statuses.forEach(s => (groups[s] = []));
 groups['Other'] = [];

 data.forEach(r => {
 const val = r.data?.[statusFieldName] || '';
 const matchedStatus = statuses.find(s => s.toLowerCase() === val.toLowerCase());
 if (matchedStatus) {
 groups[matchedStatus].push(r);
} else {
 groups['Other'].push(r);
}
});

 if (groups['Other'].length === 0) delete groups['Other'];
 return groups;
}, [data, statuses, statusFieldName]);

 const toggleSection = (section) => {
 setCollapsedSections(prev => ({ ...prev, [section]: !prev[section]}));
};

 const handleAction = async () => {
 if (!confirmAction) return;
 const { record, newStatus} = confirmAction;
 setIsUpdating(true);

 try {
 const updatedData = { ...record.data, [statusFieldName]: newStatus};
 const { error} = await supabase
 .from('dynamic_records')
 .update({ data: updatedData})
 .eq('id', record.id);

 if (error) throw error;

 toast({
 title: 'Status Updated',
 description: `Record has been marked as "${newStatus}".`});
 setConfirmAction(null);
 if (onRefresh) onRefresh();
} catch (err) {
 toast({
 title: 'Update Failed',
 description: err.message || 'Could not update status.',
 variant: 'destructive'});
} finally {
 setIsUpdating(false);
}
};

 if (!data || data.length === 0) {
 return (
 <div className="flex flex-col items-center justify-center py-20 text-center">
 <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/5 border-[0.5px] border-black/9 dark:border-white/8 border-primary/40 mb-5">
 <Inbox className="w-12 h-12 text-primary/30" />
 </div>
 <h3 className="text-lg font-semibold text-foreground mb-2">No Approval Items</h3>
 <p className="text-sm text-[#71717a] dark:text-gray-400 max-w-sm">
 There are no records awaiting approval. Create a new record to start the approval workflow.
 </p>
 </div>
 );
}

 const totalPending = Object.entries(grouped)
 .filter(([key]) => !['approved', 'rejected'].includes(key.toLowerCase()))
 .reduce((sum, [, records]) => sum + records.length, 0);

 return (
 <>
 {/* Header Stats */}
 <div className="flex items-center gap-6 mb-6 flex-wrap">
 <div className="flex items-center gap-3">
 <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary -indigo-200">
 <Shield className="w-5 h-5 text-white" />
 </div>
 <div>
 <h2 className="text-xl font-semibold text-foreground tracking-tight">Approvals</h2>
 <p className="text-xs text-[#71717a] dark:text-gray-400 mt-0.5 tracking-[0.04em]">
 {data.length} total • {totalPending} pending
 </p>
 </div>
 </div>

 <div className="flex gap-2 flex-wrap">
 {statuses.map(s => {
 const config = getStatusConfig(s);
 const count = (grouped[s] || []).length;
 return (
 <Badge
 key={s}
 className={`${config.badgeCls} border-0 text-xs font-semibold px-3 py-1`}
 >
 {s}: {count}
 </Badge>
 );
})}
 </div>
 </div>

 {/* Grouped Sections */}
 <div className="space-y-5">
 {Object.entries(grouped).map(([status, records]) => {
 if (records.length === 0) return null;
 const config = getStatusConfig(status);
 const StatusIcon = config.icon;
 const isCollapsed = collapsedSections[status];

 return (
 <div key={status}>
 <button
 onClick={() => toggleSection(status)}
 className={`w-full flex items-center gap-3 p-3 rounded-xl ${config.bg} border ${config.border} transition-all mb-3`}
 >
 <div className={`p-1.5 rounded-xl bg-gradient-to-br ${config.gradient}`}>
 <StatusIcon className="w-4 h-4 text-white" />
 </div>
 <span className={`text-sm font-semibold ${config.color}`}>{status}</span>
 <Badge className={`${config.badgeCls} border-0 text-xs`}>{records.length}</Badge>
 <div className="ml-auto">
 {isCollapsed ? (
 <ChevronRight className={`w-4 h-4 ${config.color}`} />
 ) : (
 <ChevronDown className={`w-4 h-4 ${config.color}`} />
 )}
 </div>
 </button>

 {!isCollapsed && (
 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pl-2">
 {records.map(record => (
 <ApprovalCard
 key={record.id}
 record={record}
 fieldDefinitions={fieldDefinitions}
 statusFieldName={statusFieldName}
 statuses={statuses}
 onAction={(rec, newStatus) =>
 setConfirmAction({ record: rec, newStatus})
}
 onView={setViewRecord}
 />
 ))}
 </div>
 )}
 </div>
 );
})}
 </div>

 {/* Confirm Action Dialog */}
 <Dialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
 <DialogContent className="sm:max-w-[420px]">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2">
 <AlertTriangle className="w-5 h-5 text-amber-500" />
 Confirm Status Change
 </DialogTitle>
 <DialogDescription>
 Are you sure you want to change this record&apos;s status to{' '}
 <strong>&quot;{confirmAction?.newStatus}&quot;</strong>? This action will update the record immediately.
 </DialogDescription>
 </DialogHeader>
 <DialogFooter className="mt-4">
 <Button variant="outline" onClick={() => setConfirmAction(null)}>
 Cancel
 </Button>
 <Button
 onClick={handleAction}
 disabled={isUpdating}
 className="bg-gradient-to-r from-primary to-primary hover:from-primary hover:to-primary/90 text-white"
 >
 {isUpdating ? 'Updating...' : 'Confirm'}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* View Dialog */}
 <Dialog open={!!viewRecord} onOpenChange={(open) => !open && setViewRecord(null)}>
 <DialogContent className="sm:max-w-[500px]">
 <DialogHeader>
 <DialogTitle>Record Details</DialogTitle>
 <DialogDescription>Full information for this approval item.</DialogDescription>
 </DialogHeader>
 {viewRecord && (
 <div className="mt-2 space-y-2">
 {fieldDefinitions.map(f => (
 <div
 key={f.name}
 className="flex justify-between items-center py-2.5 border-b border-primary/40 last:border-0"
 >
 <span className="text-xs font-semibold text-[#71717a] dark:text-gray-400 uppercase tracking-wide tracking-[0.04em]">
 {f.name.replace(/_/g, ' ')}
 </span>
 <span className="text-sm font-medium text-foreground max-w-[60%] text-right break-words">
 {f.field_type === 'boolean'
 ? viewRecord.data?.[f.name]
 ? 'Yes'
 : 'No'
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
 <Button variant="outline" onClick={() => setViewRecord(null)}>
 Close
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </>
 );
}
