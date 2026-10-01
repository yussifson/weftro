import { supabase} from '@/api/supabaseClient';
import React, { useState} from "react";
import { format} from "date-fns";
import { Pencil, Trash2, Eye} from "lucide-react";
import { Button} from "@/components/ui/button";
import { Input} from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter} from "@/components/ui/dialog";
import { powerSync} from "@/api/PowerSyncConnector";
import { useToast} from "@/components/ui/use-toast";

export default function DynamicGrid({ data, fieldDefinitions, theme, onRefresh}) {
 const { toast} = useToast();
 const [editRecord, setEditRecord] = useState(null);
 const [editData, setEditData] = useState({});
 const [deleteRecord, setDeleteRecord] = useState(null);
 const [viewRecord, setViewRecord] = useState(null);
 const [isSaving, setIsSaving] = useState(false);
 const [isDeleting, setIsDeleting] = useState(false);

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
 <div className="py-12 text-center text-[#71717a] dark:text-gray-400 bg-card border-[0.5px] border-black/9 dark:border-white/8 border-primary/40 rounded-xl  hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200">
 No records found. Click "Add Record" to create one.
 </div>
 );
}

 // Get primary title fields (first 2 string fields)
 const titleFields = fieldDefinitions.filter(f => f.field_type === 'text').slice(0, 2);
 const otherFields = fieldDefinitions.filter(f => !titleFields.includes(f)).slice(0, 3);

 return (
 <>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
 {data.map((record) => (
 <div key={record.id} className={`bg-card rounded-xl border-[0.5px] border-black/9 dark:border-white/8 border-primary/40 p-5 transition- relative overflow-hidden group`}>
 {theme && theme !== 'primary' && (
 <div className={`absolute top-0 left-0 w-full h-1 bg-${theme}-500`} />
 )}
 {(!theme || theme === 'primary') && (
 <div className={`absolute top-0 left-0 w-full h-1 bg-primary`} />
 )}

 {/* Action buttons on hover */}
 <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
 <button
 onClick={() => setViewRecord(record)}
 className="p-1.5 rounded-xl bg-card/80 backdrop-blur border-[0.5px] border-black/9 dark:border-white/8 border-primary/40 text-[#71717a] dark:text-gray-400 hover:text-primary hover:border-primary/30 transition-colors  hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200"
 title="View"
 >
 <Eye className="w-3.5 h-3.5" />
 </button>
 <button
 onClick={() => openEdit(record)}
 className="p-1.5 rounded-xl bg-card/80 backdrop-blur border-[0.5px] border-black/9 dark:border-white/8 border-primary/40 text-[#71717a] dark:text-gray-400 hover:text-amber-600 hover:border-amber-300 transition-colors  hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200"
 title="Edit"
 >
 <Pencil className="w-3.5 h-3.5" />
 </button>
 <button
 onClick={() => setDeleteRecord(record)}
 className="p-1.5 rounded-xl bg-card/80 backdrop-blur border-[0.5px] border-black/9 dark:border-white/8 border-primary/40 text-[#71717a] dark:text-gray-400 hover:text-red-600 hover:border-red-300 transition-colors  hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200"
 title="Delete"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>

 <div className="mb-4">
 {titleFields.map((field, idx) => (
 <div key={field.id} className={idx === 0 ? "font-semibold text-lg text-foreground mb-1" : "text-sm text-[#71717a] dark:text-gray-400"}>
 {record.data[field.name] || '-'}
 </div>
 ))}
 </div>

 <div className="space-y-2 text-sm">
 {otherFields.map(field => (
 <div key={field.id} className="flex justify-between items-center border-t border-primary/40 pt-2">
 <span className="text-[#71717a] dark:text-gray-400 text-xs tracking-[0.04em]">{field.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
 <span className="font-medium text-foreground truncate max-w-[120px]" title={record.data[field.name]}>
 {field.field_type === 'boolean' ? (record.data[field.name] ? 'Yes' : 'No') : 
 field.field_type === 'date' && record.data[field.name] ? format(new Date(record.data[field.name]), 'MMM d, yyyy') :
 record.data[field.name] || '-'}
 </span>
 </div>
 ))}
 </div>
 
 <div className="mt-4 pt-3 border-t border-primary/40 flex justify-between items-center text-xs text-[#71717a] dark:text-gray-400 tracking-[0.04em]">
 <span>Added {format(new Date(record.created_at || new Date()), 'MMM d')}</span>
 </div>
 </div>
 ))}
 </div>

 {/* View Dialog */}
 <Dialog open={!!viewRecord} onOpenChange={(open) => !open && setViewRecord(null)}>
 <DialogContent className="sm:max-w-[500px]">
 <DialogHeader>
 <DialogTitle>Record Details</DialogTitle>
 <DialogDescription>Full data for this record.</DialogDescription>
 </DialogHeader>
 {viewRecord && (
 <div className="mt-2 space-y-2">
 {fieldDefinitions.map(f => (
 <div key={f.name} className="flex justify-between items-center py-2 border-b border-primary/40 last:border-0">
 <span className="text-xs font-semibold text-[#71717a] dark:text-gray-400 uppercase tracking-wide tracking-[0.04em]">{f.name.replace(/_/g, ' ')}</span>
 <span className="text-sm font-medium text-foreground max-w-[60%] text-right break-words">{String(viewRecord.data[f.name] ?? '-')}</span>
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

 {/* Edit Dialog */}
 <Dialog open={!!editRecord} onOpenChange={(open) => !open && setEditRecord(null)}>
 <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>Edit Record</DialogTitle>
 <DialogDescription>Update the values below and save your changes.</DialogDescription>
 </DialogHeader>
 <div className="mt-4 space-y-4">
 {fieldDefinitions.map(f => {
 const label = f.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
 const val = editData[f.name] ?? '';

 if (f.field_type === 'boolean') {
 return (
 <div key={f.name} className="flex items-center justify-between py-2 border-b border-primary/40 last:border-0">
 <label className="text-sm font-medium text-foreground">{label}</label>
 <input type="checkbox" checked={!!val} onChange={e => setEditData({ ...editData, [f.name]: e.target.checked})} className="h-4 w-4 rounded-md border-primary/40" />
 </div>
 );
}
 if (f.field_type === 'select') {
 let options = [];
 try { options = typeof f.options === 'string' ? JSON.parse(f.options) : (f.options || []);} catch { options = [];}
 return (
 <div key={f.name} className="space-y-1">
 <label className="text-xs font-semibold text-[#71717a] dark:text-gray-400 uppercase tracking-wide tracking-[0.04em]">{label}</label>
 <select value={val} onChange={e => setEditData({ ...editData, [f.name]: e.target.value})} className="w-full rounded-xl border-[0.5px] border-black/9 dark:border-white/8 border-primary/40 bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200">
 <option value="">Select...</option>
 {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
 </select>
 </div>
 );
}
 return (
 <div key={f.name} className="space-y-1">
 <label className="text-xs font-semibold text-[#71717a] dark:text-gray-400 uppercase tracking-wide tracking-[0.04em]">{label}</label>
 <Input type={f.field_type === 'date' ? 'date' : f.field_type === 'number' ? 'number' : 'text'} value={val} onChange={e => setEditData({ ...editData, [f.name]: e.target.value})} />
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
