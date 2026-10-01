import { supabase} from '@/api/supabaseClient';
import React, { useState, useMemo, useEffect} from 'react';
import { format} from 'date-fns';
import {
 ArrowUpDown,
 ArrowUp,
 ArrowDown,
 Trash2,
 Download,
 CheckSquare,
 Square,
 Minus,
 Table2,
 Save,
 X,
 AlertTriangle} from 'lucide-react';
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

function getColumnLabel(name) {
 return name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function DynamicSpreadsheetView({ data = [], fieldDefinitions = [], onRefresh, moduleDef}) {
 const { toast} = useToast();
 const [sortField, setSortField] = useState(null);
 const [sortDir, setSortDir] = useState('asc');
 const [selectedRows, setSelectedRows] = useState(new Set());
 const [editingCell, setEditingCell] = useState(null); // {recordId, fieldName}
 const [editValue, setEditValue] = useState('');
 const [isSaving, setIsSaving] = useState(false);
 const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
 const [isDeleting, setIsDeleting] = useState(false);
 const [dirtyRows, setDirtyRows] = useState(new Set()); // Track unsaved inline edits

 // Sort data
 const sortedData = useMemo(() => {
 if (!sortField) return data;
 return [...data].sort((a, b) => {
 const valA = a.data?.[sortField] ?? '';
 const valB = b.data?.[sortField] ?? '';
 const field = fieldDefinitions.find((f) => f.name === sortField);
 
 if (field?.field_type === 'number') {
 const numA = parseFloat(valA) || 0;
 const numB = parseFloat(valB) || 0;
 return sortDir === 'asc' ? numA - numB : numB - numA;
}
 if (field?.field_type === 'date') {
 const dateA = new Date(valA || 0).getTime();
 const dateB = new Date(valB || 0).getTime();
 return sortDir === 'asc' ? dateA - dateB : dateB - dateA;
}
 if (field?.field_type === 'boolean') {
 const boolA = valA ? 1 : 0;
 const boolB = valB ? 1 : 0;
 return sortDir === 'asc' ? boolA - boolB : boolB - boolA;
}
 const strA = String(valA).toLowerCase();
 const strB = String(valB).toLowerCase();
 return sortDir === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
});
}, [data, sortField, sortDir, fieldDefinitions]);

 const toggleSort = (fieldName) => {
 if (sortField === fieldName) {
 setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
} else {
 setSortField(fieldName);
 setSortDir('asc');
}
};

 // Selection
 const allSelected = selectedRows.size === sortedData.length && sortedData.length > 0;
 const someSelected = selectedRows.size > 0 && !allSelected;

 const toggleSelectAll = () => {
 if (allSelected) {
 setSelectedRows(new Set());
} else {
 setSelectedRows(new Set(sortedData.map((r) => r.id)));
}
};

 const toggleSelect = (id) => {
 const newSet = new Set(selectedRows);
 if (newSet.has(id)) newSet.delete(id);
 else newSet.add(id);
 setSelectedRows(newSet);
};

 // Inline editing
 const startEdit = (recordId, fieldName, currentValue) => {
 setEditingCell({ recordId, fieldName});
 setEditValue(currentValue ?? '');
};

 const cancelEdit = () => {
 setEditingCell(null);
 setEditValue('');
};

 const saveCell = async () => {
 if (!editingCell) return;
 const record = data.find((r) => r.id === editingCell.recordId);
 if (!record) return;

 const field = fieldDefinitions.find((f) => f.name === editingCell.fieldName);
 let finalValue = editValue;
 if (field?.field_type === 'number') finalValue = editValue === '' ? '' : Number(editValue);
 if (field?.field_type === 'boolean') finalValue = Boolean(editValue);

 const updatedData = { ...record.data, [editingCell.fieldName]: finalValue};

 setIsSaving(true);
 try {
 const { error} = await supabase
 .from('dynamic_records')
 .update({ data: updatedData})
 .eq('id', editingCell.recordId);
 if (error) throw error;
 toast({ title: 'Cell updated', description: `${getColumnLabel(editingCell.fieldName)} saved.`});
 setEditingCell(null);
 setEditValue('');
 if (onRefresh) onRefresh();
} catch (err) {
 toast({ title: 'Error', description: err.message || 'Failed to save.', variant: 'destructive'});
} finally {
 setIsSaving(false);
}
};

 const handleBooleanToggle = async (recordId, fieldName, currentValue) => {
 const record = data.find((r) => r.id === recordId);
 if (!record) return;
 const updatedData = { ...record.data, [fieldName]: !currentValue};
 try {
 const { error} = await supabase
 .from('dynamic_records')
 .update({ data: updatedData})
 .eq('id', recordId);
 if (error) throw error;
 if (onRefresh) onRefresh();
} catch (err) {
 toast({ title: 'Error', description: err.message || 'Failed to update.', variant: 'destructive'});
}
};

 const handleSelectChange = async (recordId, fieldName, newValue) => {
 const record = data.find((r) => r.id === recordId);
 if (!record) return;
 const updatedData = { ...record.data, [fieldName]: newValue};
 try {
 const { error} = await supabase
 .from('dynamic_records')
 .update({ data: updatedData})
 .eq('id', recordId);
 if (error) throw error;
 if (onRefresh) onRefresh();
} catch (err) {
 toast({ title: 'Error', description: err.message || 'Failed to update.', variant: 'destructive'});
}
};

 // Batch delete
 const handleBatchDelete = async () => {
 if (selectedRows.size === 0) return;
 setIsDeleting(true);
 try {
 const ids = Array.from(selectedRows);
 const { error} = await supabase
 .from('dynamic_records')
 .delete()
 .in('id', ids);
 if (error) throw error;
 toast({ title: 'Records deleted', description: `${ids.length} record${ids.length !== 1 ? 's' : ''} removed.`});
 setSelectedRows(new Set());
 setShowDeleteConfirm(false);
 if (onRefresh) onRefresh();
} catch (err) {
 toast({ title: 'Error', description: err.message || 'Failed to delete.', variant: 'destructive'});
} finally {
 setIsDeleting(false);
}
};

 // Export to CSV
 const handleExport = () => {
 const headers = fieldDefinitions.map((f) => f.name);
 const rows = sortedData.map((record) =>
 headers.map((h) => {
 const val = record.data?.[h];
 if (val === undefined || val === null) return '';
 return String(val).includes(',') ? `"${String(val)}"` : String(val);
})
 );

 const csvContent = [
 headers.join(','),
 ...rows.map((r) => r.join(',')),
 ].join('\n');

 const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;'});
 const url = URL.createObjectURL(blob);
 const link = document.createElement('a');
 link.href = url;
 link.setAttribute('download', `${moduleDef?.name || 'export'}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 URL.revokeObjectURL(url);
 toast({ title: 'Exported', description: 'Data exported to CSV successfully.'});
};

 // Handle key events in editing mode
 const handleKeyDown = (e) => {
 if (e.key === 'Enter') {
 e.preventDefault();
 saveCell();
} else if (e.key === 'Escape') {
 cancelEdit();
}
};

 if (!data || data.length === 0) {
 return (
 <div className="flex flex-col items-center justify-center py-20 bg-gradient-to-br from-slate-50 to-primary/30 rounded-2xl border-[0.5px] border-black/9 dark:border-white/8 border-primary/40">
 <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary flex items-center justify-center mb-4 -green-500/20">
 <Table2 className="w-8 h-8 text-white" />
 </div>
 <h3 className="text-lg font-semibold text-slate-800 mb-1">No Data Yet</h3>
 <p className="text-sm text-[#71717a] dark:text-gray-400 max-w-sm text-center">
 Add records to start working with the spreadsheet.
 </p>
 </div>
 );
}

 return (
 <>
 {/* Toolbar */}
 <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary flex items-center justify-center -green-500/20">
 <Table2 className="w-5 h-5 text-white" />
 </div>
 <div>
 <h2 className="text-lg font-semibold text-slate-800">Spreadsheet</h2>
 <p className="text-xs text-[#71717a] dark:text-gray-400 tracking-[0.04em]">
 {sortedData.length} row{sortedData.length !== 1 ? 's' : ''} · {fieldDefinitions.length} column{fieldDefinitions.length !== 1 ? 's' : ''}
 {selectedRows.size > 0 && (
 <span className="ml-2 text-primary font-medium">
 · {selectedRows.size} selected
 </span>
 )}
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 {selectedRows.size > 0 && (
 <Button
 variant="destructive"
 size="sm"
 onClick={() => setShowDeleteConfirm(true)}
 className="gap-2.5 text-xs tracking-[0.04em]"
 >
 <Trash2 className="w-3.5 h-3.5" />
 Delete ({selectedRows.size})
 </Button>
 )}
 <Button variant="outline" size="sm" onClick={handleExport} className="gap-2.5 text-xs tracking-[0.04em]">
 <Download className="w-3.5 h-3.5" />
 Export CSV
 </Button>
 </div>
 </div>

 {/* Spreadsheet */}
 <div className="rounded-xl border-[0.5px] border-black/9 dark:border-white/8 border-primary/40 bg-card overflow-hidden hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200">
 <div className="overflow-x-auto">
 <table className="w-full text-sm border-collapse">
 {/* Header */}
 <thead>
 <tr className="bg-gradient-to-r from-slate-50 to-slate-100/80 border-b border-primary/40">
 {/* Checkbox column */}
 <th className="w-12 px-3 py-3 text-center border-r border-primary/40 sticky left-0 bg-muted/50 z-10">
 <button
 onClick={toggleSelectAll}
 className="text-[#71717a] dark:text-gray-400 hover:text-[#71717a] dark:text-gray-400 transition-colors"
 >
 {allSelected ? (
 <CheckSquare className="w-4 h-4 text-primary" />
 ) : someSelected ? (
 <Minus className="w-4 h-4 text-primary" />
 ) : (
 <Square className="w-4 h-4" />
 )}
 </button>
 </th>
 {/* Row number */}
 <th className="w-12 px-3 py-3 text-center text-[10px] font-semibold text-[#71717a] dark:text-gray-400 uppercase tracking-wider border-r border-primary/40 tracking-[0.04em]">
 #
 </th>
 {/* Field columns */}
 {fieldDefinitions.map((field) => (
 <th
 key={field.name}
 className="px-4 py-3 text-left border-r border-primary/40 last:border-r-0"
 >
 <button
 onClick={() => toggleSort(field.name)}
 className="flex items-center gap-2.5 text-xs font-semibold text-[#71717a] dark:text-gray-400 uppercase tracking-wider hover:text-foreground transition-colors group tracking-[0.04em]"
 >
 {getColumnLabel(field.name)}
 <span className="flex-shrink-0">
 {sortField === field.name ? (
 sortDir === 'asc' ? (
 <ArrowUp className="w-3 h-3 text-primary" />
 ) : (
 <ArrowDown className="w-3 h-3 text-primary" />
 )
 ) : (
 <ArrowUpDown className="w-3 h-3 text-slate-300 group-hover:text-[#71717a] dark:text-gray-400" />
 )}
 </span>
 <span className="text-[9px] text-[#71717a] dark:text-gray-400 font-normal normal-case ml-1">
 {field.field_type}
 </span>
 </button>
 </th>
 ))}
 {/* Created at */}
 <th className="px-4 py-3 text-left">
 <span className="text-xs font-semibold text-[#71717a] dark:text-gray-400 uppercase tracking-wider tracking-[0.04em]">Created</span>
 </th>
 </tr>
 </thead>

 {/* Body */}
 <tbody>
 {sortedData.map((record, rowIdx) => {
 const isSelected = selectedRows.has(record.id);
 return (
 <tr
 key={record.id}
 className={`border-b border-primary/40 transition-colors ${
 isSelected
 ? 'bg-muted/500'
 : rowIdx % 2 === 0
 ? 'bg-card'
 : 'bg-muted/50/30'
} hover:bg-primary/40`}
 >
 {/* Checkbox */}
 <td className="px-3 py-2 text-center border-r border-primary/40 sticky left-0 bg-inherit z-10">
 <button onClick={() => toggleSelect(record.id)} className="text-[#71717a] dark:text-gray-400 hover:text-[#71717a] dark:text-gray-400">
 {isSelected ? (
 <CheckSquare className="w-4 h-4 text-primary" />
 ) : (
 <Square className="w-4 h-4" />
 )}
 </button>
 </td>
 {/* Row number */}
 <td className="px-3 py-2 text-center text-xs text-[#71717a] dark:text-gray-400 font-mono border-r border-primary/40 tracking-[0.04em]">
 {rowIdx + 1}
 </td>
 {/* Field cells */}
 {fieldDefinitions.map((field) => {
 const val = record.data?.[field.name];
 const isEditing = editingCell?.recordId === record.id && editingCell?.fieldName === field.name;

 return (
 <td
 key={field.name}
 className={`px-1 py-1 border-r border-primary/40 last:border-r-0 ${
 isEditing ? 'bg-muted/50 ring-2 ring-inset ring-primary/70' : ''
}`}
 >
 {/* Boolean - toggle immediately */}
 {field.field_type === 'boolean' && (
 <div className="flex items-center justify-center px-3 py-1">
 <button
 onClick={() => handleBooleanToggle(record.id, field.name, val)}
 className="transition-colors"
 >
 {val ? (
 <CheckSquare className="w-4 h-4 text-primary" />
 ) : (
 <Square className="w-4 h-4 text-slate-300 hover:text-[#71717a] dark:text-gray-400" />
 )}
 </button>
 </div>
 )}

 {/* Select - dropdown immediately */}
 {field.field_type === 'select' && (() => {
 let options = [];
 try { options = typeof field.options === 'string' ? JSON.parse(field.options) : (field.options || []);} catch { options = [];}
 return (
 <select
 value={val || ''}
 onChange={(e) => handleSelectChange(record.id, field.name, e.target.value)}
 className="w-full bg-transparent border-0 px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-0 cursor-pointer"
 >
 <option value="">—</option>
 {options.map((opt) => (
 <option key={opt} value={opt}>{opt}</option>
 ))}
 </select>
 );
})()}

 {/* Text / Number / Date - click to edit */}
 {field.field_type !== 'boolean' && field.field_type !== 'select' && (
 <>
 {isEditing ? (
 <div className="flex items-center gap-2">
 <input
 type={field.field_type === 'date' ? 'date' : field.field_type === 'number' ? 'number' : 'text'}
 value={editValue}
 onChange={(e) => setEditValue(e.target.value)}
 onKeyDown={handleKeyDown}
 onBlur={saveCell}
 
 className="w-full bg-card border-[0.5px] border-black/9 dark:border-white/8 border-primary/30 rounded-md px-2 py-1 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary/70 hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200"
 />
 </div>
 ) : (
 <div
 onClick={() => startEdit(record.id, field.name, val)}
 className="px-3 py-1.5 text-sm text-foreground cursor-text hover:bg-muted/50 rounded-md min-h-[32px] flex items-center"
 title="Click to edit"
 >
 {field.field_type === 'date' && val ? (
 (() => { try { return format(new Date(val), 'MMM d, yyyy');} catch { return String(val || '');}})()
 ) : (
 val !== undefined && val !== null && val !== '' ? String(val) : (
 <span className="text-slate-300 italic">Empty</span>
 )
 )}
 </div>
 )}
 </>
 )}
 </td>
 );
})}
 {/* Created at */}
 <td className="px-4 py-2 text-xs text-[#71717a] dark:text-gray-400 whitespace-nowrap tracking-[0.04em]">
 {record.created_at ? format(new Date(record.created_at), 'MMM d, yyyy') : '-'}
 </td>
 </tr>
 );
})}
 </tbody>
 </table>
 </div>

 {/* Footer */}
 <div className="px-4 py-3 bg-muted/50/80 border-t border-primary/40 flex items-center justify-between">
 <div className="text-xs text-[#71717a] dark:text-gray-400 tracking-[0.04em]">
 {sortedData.length} row{sortedData.length !== 1 ? 's' : ''} · Click any cell to edit
 </div>
 <div className="flex items-center gap-3 text-xs text-[#71717a] dark:text-gray-400 tracking-[0.04em]">
 <span className="flex items-center gap-2">
 <span className="w-2 h-2 rounded-full bg-primary" /> Sorted by: {sortField ? getColumnLabel(sortField) : 'Default'}
 </span>
 </div>
 </div>
 </div>

 {/* Batch Delete Confirmation */}
 <Dialog open={showDeleteConfirm} onOpenChange={(open) => !open && setShowDeleteConfirm(false)}>
 <DialogContent className="sm:max-w-[425px]">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2">
 <AlertTriangle className="w-5 h-5 text-red-500" />
 Delete Selected Records
 </DialogTitle>
 <DialogDescription>
 Are you sure you want to delete {selectedRows.size} selected record{selectedRows.size !== 1 ? 's' : ''}? This action cannot be undone.
 </DialogDescription>
 </DialogHeader>
 <DialogFooter className="mt-4">
 <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
 <Button variant="destructive" onClick={handleBatchDelete} disabled={isDeleting}>
 {isDeleting ? 'Deleting...' : `Delete ${selectedRows.size} Record${selectedRows.size !== 1 ? 's' : ''}`}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </>
 );
}
