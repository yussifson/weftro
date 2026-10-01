import { supabase} from '@/api/supabaseClient';
import React, { useState, useMemo} from 'react';
import { format} from 'date-fns';
import {
 Search,
 Eye,
 Pencil,
 Trash2,
 Users,
 Mail,
 Phone,
 MapPin,
 Building,
 ChevronDown,
 X,
 User} from 'lucide-react';
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

const AVATAR_GRADIENTS = [
 'from-primary to-primary',
 'from-primary to-primary',
 'from-primary to-primary',
 'from-amber-500 to-orange-600',
 'from-rose-500 to-primary',
 'from-primary to-primary',
 'from-primary to-primary',
 'from-lime-500 to-primary',
];

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function getInitials(name) {
 if (!name) return '?';
 const parts = String(name).trim().split(/\s+/);
 if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
 return parts[0].substring(0, 2).toUpperCase();
}

function getGradient(name) {
 if (!name) return AVATAR_GRADIENTS[0];
 let hash = 0;
 for (let i = 0; i < name.length; i++) {
 hash = name.charCodeAt(i) + ((hash << 5) - hash);
}
 return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function getFieldIcon(fieldName) {
 const lower = fieldName.toLowerCase();
 if (lower.includes('email') || lower.includes('mail')) return Mail;
 if (lower.includes('phone') || lower.includes('tel') || lower.includes('mobile')) return Phone;
 if (lower.includes('address') || lower.includes('city') || lower.includes('location')) return MapPin;
 if (lower.includes('company') || lower.includes('org') || lower.includes('department')) return Building;
 return null;
}

export default function DynamicDirectoryView({ data = [], fieldDefinitions = [], onRefresh, moduleDef}) {
 const { toast} = useToast();
 const [searchQuery, setSearchQuery] = useState('');
 const [activeLetter, setActiveLetter] = useState(null);
 const [selectedRecord, setSelectedRecord] = useState(null);
 const [editRecord, setEditRecord] = useState(null);
 const [editData, setEditData] = useState({});
 const [deleteRecord, setDeleteRecord] = useState(null);
 const [isSaving, setIsSaving] = useState(false);
 const [isDeleting, setIsDeleting] = useState(false);

 // Determine name and role fields
 const textFields = useMemo(() => fieldDefinitions.filter((f) => f.field_type === 'text'), [fieldDefinitions]);
 const nameField = textFields[0]?.name || null;
 const roleField = textFields[1]?.name || null;
 const detailFields = useMemo(
 () => fieldDefinitions.filter((f) => f.name !== nameField && f.name !== roleField),
 [fieldDefinitions, nameField, roleField]
 );

 const getName = (record) => (nameField ? record.data?.[nameField] || 'Untitled' : 'Untitled');
 const getRole = (record) => (roleField ? record.data?.[roleField] || '' : '');

 // Filter and sort records
 const filteredData = useMemo(() => {
 let result = [...data];

 // Search filter
 if (searchQuery.trim()) {
 const q = searchQuery.toLowerCase();
 result = result.filter((record) =>
 Object.values(record.data || {}).some((val) => String(val).toLowerCase().includes(q))
 );
}

 // Alphabet filter
 if (activeLetter) {
 result = result.filter((record) => {
 const name = getName(record);
 return name.toUpperCase().startsWith(activeLetter);
});
}

 // Sort alphabetically by name
 result.sort((a, b) => {
 const nameA = getName(a).toLowerCase();
 const nameB = getName(b).toLowerCase();
 return nameA.localeCompare(nameB);
});

 return result;
}, [data, searchQuery, activeLetter, nameField]);

 // Available letters (letters that have records)
 const availableLetters = useMemo(() => {
 const letters = new Set();
 data.forEach((record) => {
 const name = getName(record);
 if (name && name.length > 0) {
 letters.add(name[0].toUpperCase());
}
});
 return letters;
}, [data, nameField]);

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
 setSelectedRecord(null);
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
 <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary flex items-center justify-center mb-4 -emerald-500/20">
 <Users className="w-8 h-8 text-white" />
 </div>
 <h3 className="text-lg font-semibold text-slate-800 mb-1">No Contacts Yet</h3>
 <p className="text-sm text-[#71717a] dark:text-gray-400 max-w-sm text-center">
 Add records to build your directory.
 </p>
 </div>
 );
}

 return (
 <>
 {/* Header & Search */}
 <div className="mb-6">
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary flex items-center justify-center -emerald-500/20">
 <Users className="w-5 h-5 text-white" />
 </div>
 <div>
 <h2 className="text-lg font-semibold text-slate-800">Directory</h2>
 <p className="text-xs text-[#71717a] dark:text-gray-400 tracking-[0.04em]">{filteredData.length} of {data.length} contact{data.length !== 1 ? 's' : ''}</p>
 </div>
 </div>
 <div className="relative w-full sm:w-72">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717a] dark:text-gray-400" />
 <Input
 placeholder="Search contacts..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="pl-9"
 />
 </div>
 </div>

 {/* Alphabet Filter */}
 <div className="flex items-center gap-0.5 flex-wrap">
 <button
 onClick={() => setActiveLetter(null)}
 className={`w-8 h-8 rounded-xl text-xs font-semibold transition-all ${
 activeLetter === null
 ? 'bg-slate-800 text-white '
 : 'text-[#71717a] dark:text-gray-400 hover:bg-muted'
}`}
 >
 All
 </button>
 {ALPHABET.map((letter) => {
 const hasRecords = availableLetters.has(letter);
 return (
 <button
 key={letter}
 onClick={() => hasRecords && setActiveLetter(activeLetter === letter ? null : letter)}
 disabled={!hasRecords}
 className={`w-8 h-8 rounded-xl text-xs font-semibold transition-all ${
 activeLetter === letter
 ? 'bg-primary text-white -emerald-500/20'
 : hasRecords
 ? 'text-[#71717a] dark:text-gray-400 hover:bg-muted hover:text-foreground'
 : 'text-slate-300 cursor-not-allowed'
}`}
 >
 {letter}
 </button>
 );
})}
 </div>
 </div>

 {/* Contact Cards Grid */}
 {filteredData.length === 0 ? (
 <div className="text-center py-12 text-[#71717a] dark:text-gray-400 text-sm">
 No contacts match your search criteria.
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
 {filteredData.map((record) => {
 const name = getName(record);
 const role = getRole(record);
 const gradient = getGradient(name);
 const initials = getInitials(name);

 return (
 <div
 key={record.id}
 onClick={() => setSelectedRecord(record)}
 className="bg-card rounded-xl border-[0.5px] border-black/9 dark:border-white/8 border-primary/40 hover:border-primary/60 transition-all duration-300 cursor-pointer group overflow-hidden hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200"
 >
 {/* Card top gradient */}
 <div className={`h-16 bg-gradient-to-r ${gradient} relative`}>
 <div className="absolute inset-0 bg-primary/20" />
 {/* Action buttons */}
 <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
 <button
 onClick={(e) => { e.stopPropagation(); openEdit(record);}}
 className="p-1.5 rounded-xl bg-card/90 backdrop-blur text-[#71717a] dark:text-gray-400 hover:text-amber-600 transition-colors  hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200"
 >
 <Pencil className="w-3 h-3" />
 </button>
 <button
 onClick={(e) => { e.stopPropagation(); setDeleteRecord(record);}}
 className="p-1.5 rounded-xl bg-card/90 backdrop-blur text-[#71717a] dark:text-gray-400 hover:text-red-600 transition-colors  hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200"
 >
 <Trash2 className="w-3 h-3" />
 </button>
 </div>
 </div>

 <div className="px-4 pb-4 -mt-8 relative">
 {/* Avatar */}
 <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-lg font-semibold ring-3 ring-white mb-3`}>
 {initials}
 </div>

 {/* Name & Role */}
 <h3 className="font-semibold text-slate-800 text-sm truncate group-hover:text-primary/90 transition-colors">
 {name}
 </h3>
 {role && (
 <p className="text-xs text-[#71717a] dark:text-gray-400 truncate mt-0.5 tracking-[0.04em]">{role}</p>
 )}

 {/* Quick details */}
 <div className="mt-3 space-y-1.5">
 {detailFields.slice(0, 3).map((f) => {
 const val = record.data?.[f.name];
 if (!val) return null;
 const IconComp = getFieldIcon(f.name);
 return (
 <div key={f.name} className="flex items-center gap-2 text-xs text-[#71717a] dark:text-gray-400 tracking-[0.04em]">
 {IconComp ? <IconComp className="w-3 h-3 text-[#71717a] dark:text-gray-400 flex-shrink-0" /> : <span className="w-3 h-3 flex-shrink-0" />}
 <span className="truncate">
 {f.field_type === 'boolean' ? (val ? 'Yes' : 'No') :
 f.field_type === 'date' ? (() => { try { return format(new Date(val), 'MMM d, yyyy');} catch { return String(val);}})() :
 String(val)}
 </span>
 </div>
 );
})}
 </div>
 </div>
 </div>
 );
})}
 </div>
 )}

 {/* Detail / View Dialog */}
 <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
 <DialogContent className="sm:max-w-[520px]">
 {selectedRecord && (() => {
 const name = getName(selectedRecord);
 const role = getRole(selectedRecord);
 const gradient = getGradient(name);
 const initials = getInitials(name);
 return (
 <>
 <div className={`-mx-6 -mt-6 h-24 bg-gradient-to-r ${gradient} rounded-t-lg relative`}>
 <div className="absolute inset-0 bg-primary/20 rounded-t-lg" />
 </div>
 <div className="-mt-12 relative px-2">
 <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-2xl font-semibold ring-4 ring-white`}>
 {initials}
 </div>
 </div>
 <div className="mt-3 px-2">
 <h3 className="text-xl font-semibold text-slate-800">{name}</h3>
 {role && <p className="text-sm text-[#71717a] dark:text-gray-400 mt-0.5">{role}</p>}
 </div>
 <div className="mt-4 space-y-2 px-2">
 {fieldDefinitions.map((f) => {
 if (f.name === nameField || f.name === roleField) return null;
 const val = selectedRecord.data[f.name];
 const IconComp = getFieldIcon(f.name);
 return (
 <div key={f.name} className="flex items-center justify-between py-2.5 border-b border-primary/40 last:border-0">
 <span className="flex items-center gap-2 text-xs font-semibold text-[#71717a] dark:text-gray-400 uppercase tracking-wide tracking-[0.04em]">
 {IconComp && <IconComp className="w-3.5 h-3.5" />}
 {f.name.replace(/_/g, ' ')}
 </span>
 <span className="text-sm font-medium text-foreground max-w-[55%] text-right break-words">
 {f.field_type === 'boolean' ? (val ? 'Yes' : 'No') :
 f.field_type === 'date' && val ? format(new Date(val), 'MMM d, yyyy') :
 String(val ?? '-')}
 </span>
 </div>
 );
})}
 <p className="text-[11px] text-[#71717a] dark:text-gray-400 pt-2">
 Added {selectedRecord.created_at ? format(new Date(selectedRecord.created_at), 'MMM d, yyyy') : 'Unknown'}
 </p>
 </div>
 <DialogFooter className="mt-4">
 <Button variant="outline" onClick={() => setSelectedRecord(null)}>Close</Button>
 <Button onClick={() => { openEdit(selectedRecord); setSelectedRecord(null);}} className="gap-2 bg-primary hover:bg-primary/90 text-white">
 <Pencil className="h-4 w-4" /> Edit
 </Button>
 </DialogFooter>
 </>
 );
})()}
 </DialogContent>
 </Dialog>

 {/* Edit Record Dialog */}
 <Dialog open={!!editRecord} onOpenChange={(open) => !open && setEditRecord(null)}>
 <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>Edit Contact</DialogTitle>
 <DialogDescription>Update the contact details below and save your changes.</DialogDescription>
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
 <DialogTitle>Delete Contact</DialogTitle>
 <DialogDescription>Are you sure you want to delete this contact? This action cannot be undone.</DialogDescription>
 </DialogHeader>
 <DialogFooter className="mt-4">
 <Button variant="outline" onClick={() => setDeleteRecord(null)}>Cancel</Button>
 <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
 {isDeleting ? 'Deleting...' : 'Delete Contact'}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </>
 );
}
