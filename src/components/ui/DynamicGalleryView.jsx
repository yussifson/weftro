import { supabase} from '@/api/supabaseClient';
import React, { useState, useMemo} from 'react';
import { format} from 'date-fns';
import {
 Search,
 Eye,
 Pencil,
 Trash2,
 LayoutGrid,
 Grid3X3,
 Grid2X2,
 Columns3,
 Filter,
 X,
 Image,
 Sparkles,
 Calendar,
 Hash} from 'lucide-react';
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

const CARD_GRADIENTS = [
 'from-primary via-primary to-primary/90',
 'from-primary via-primary to-primary/90',
 'from-primary via-primary to-primary/90',
 'from-amber-500 via-orange-600 to-red-700',
 'from-rose-500 via-primary to-primary/90',
 'from-primary via-primary to-primary/90',
 'from-primary via-primary to-primary/90',
 'from-lime-500 via-primary to-primary/90',
 'from-primary via-primary to-primary/90',
 'from-orange-500 via-red-600 to-rose-700',
];

// Deterministic but varied card heights for masonry-like feel
const HEIGHT_VARIANTS = ['h-auto', 'h-auto', 'h-auto'];

function getCardGradient(index) {
 return CARD_GRADIENTS[index % CARD_GRADIENTS.length];
}

function getRecordTitle(record, fieldDefinitions) {
 const textFields = fieldDefinitions.filter((f) => f.field_type === 'text');
 if (textFields.length > 0) return record.data?.[textFields[0].name] || 'Untitled';
 const first = Object.values(record.data || {})[0];
 return first ? String(first) : 'Untitled';
}

export default function DynamicGalleryView({ data = [], fieldDefinitions = [], onRefresh, moduleDef}) {
 const { toast} = useToast();
 const [gridCols, setGridCols] = useState(3);
 const [searchQuery, setSearchQuery] = useState('');
 const [activeFilter, setActiveFilter] = useState(null); // {field, value}
 const [viewRecord, setViewRecord] = useState(null);
 const [editRecord, setEditRecord] = useState(null);
 const [editData, setEditData] = useState({});
 const [deleteRecord, setDeleteRecord] = useState(null);
 const [isSaving, setIsSaving] = useState(false);
 const [isDeleting, setIsDeleting] = useState(false);

 // Find select fields for filtering
 const selectFields = useMemo(
 () => fieldDefinitions.filter((f) => f.field_type === 'select'),
 [fieldDefinitions]
 );

 // Filter data
 const filteredData = useMemo(() => {
 let result = [...data];

 if (searchQuery.trim()) {
 const q = searchQuery.toLowerCase();
 result = result.filter((record) =>
 Object.values(record.data || {}).some((val) => String(val).toLowerCase().includes(q))
 );
}

 if (activeFilter) {
 result = result.filter(
 (record) => record.data?.[activeFilter.field] === activeFilter.value
 );
}

 return result;
}, [data, searchQuery, activeFilter]);

 // Collect unique values for the active filter field
 const filterOptions = useMemo(() => {
 if (selectFields.length === 0) return {};
 const opts = {};
 selectFields.forEach((sf) => {
 const values = new Set();
 data.forEach((r) => {
 const val = r.data?.[sf.name];
 if (val) values.add(val);
});
 opts[sf.name] = Array.from(values);
});
 return opts;
}, [data, selectFields]);

 const gridColsClass = useMemo(() => {
 switch (gridCols) {
 case 2: return 'grid-cols-1 sm:grid-cols-2';
 case 3: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
 case 4: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
 default: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
}
}, [gridCols]);

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

 // Decide which fields to show prominently on the card
 const titleField = fieldDefinitions.find((f) => f.field_type === 'text');
 const subtitleField = fieldDefinitions.filter((f) => f.field_type === 'text')[1];
 const displayFields = fieldDefinitions.filter((f) => f !== titleField && f !== subtitleField).slice(0, 4);

 if (!data || data.length === 0) {
 return (
 <div className="flex flex-col items-center justify-center py-20 bg-gradient-to-br from-slate-50 to-primary/30 rounded-2xl border-[0.5px] border-black/9 dark:border-white/8 border-primary/40">
 <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary flex items-center justify-center mb-4 -fuchsia-500/20">
 <Image className="w-8 h-8 text-white" />
 </div>
 <h3 className="text-lg font-semibold text-slate-800 mb-1">No Items Yet</h3>
 <p className="text-sm text-[#71717a] dark:text-gray-400 max-w-sm text-center">
 Add records to see them displayed in the gallery.
 </p>
 </div>
 );
}

 return (
 <>
 {/* Toolbar */}
 <div className="mb-6 space-y-3">
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary flex items-center justify-center -fuchsia-500/20">
 <Sparkles className="w-5 h-5 text-white" />
 </div>
 <div>
 <h2 className="text-lg font-semibold text-slate-800">Gallery</h2>
 <p className="text-xs text-[#71717a] dark:text-gray-400 tracking-[0.04em]">{filteredData.length} item{filteredData.length !== 1 ? 's' : ''}</p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 {/* Search */}
 <div className="relative w-60">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717a] dark:text-gray-400" />
 <Input
 placeholder="Search gallery..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="pl-9"
 />
 </div>

 {/* Grid size toggle */}
 <div className="flex items-center bg-muted rounded-xl p-0.5 gap-0.5">
 {[2, 3, 4].map((cols) => (
 <button
 key={cols}
 onClick={() => setGridCols(cols)}
 className={`p-2 rounded-lg transition-all ${
 gridCols === cols
 ? 'bg-card text-slate-800'
 : 'text-[#71717a] dark:text-gray-400 hover:text-[#71717a] dark:text-gray-400'
}`}
 title={`${cols} columns`}
 >
 {cols === 2 && <Grid2X2 className="w-4 h-4" />}
 {cols === 3 && <Columns3 className="w-4 h-4" />}
 {cols === 4 && <LayoutGrid className="w-4 h-4" />}
 </button>
 ))}
 </div>
 </div>
 </div>

 {/* Filter bar */}
 {selectFields.length > 0 && (
 <div className="flex items-center gap-2 flex-wrap">
 <Filter className="w-4 h-4 text-[#71717a] dark:text-gray-400" />
 {selectFields.map((sf) => (
 <div key={sf.name} className="flex items-center gap-2 flex-wrap">
 <span className="text-xs text-[#71717a] dark:text-gray-400 font-medium tracking-[0.04em]">{sf.name.replace(/_/g, ' ')}:</span>
 {(filterOptions[sf.name] || []).map((val) => (
 <button
 key={val}
 onClick={() =>
 activeFilter?.field === sf.name && activeFilter?.value === val
 ? setActiveFilter(null)
 : setActiveFilter({ field: sf.name, value: val})
}
 className={`text-xs px-2.5 py-1 rounded-full transition-all font-medium ${
 activeFilter?.field === sf.name && activeFilter?.value === val
 ? 'bg-primary text-white -fuchsia-500/20'
 : 'bg-muted text-[#71717a] dark:text-gray-400 hover:bg-muted'
}`}
 >
 {val}
 </button>
 ))}
 </div>
 ))}
 {activeFilter && (
 <button onClick={() => setActiveFilter(null)} className="text-xs text-[#71717a] dark:text-gray-400 hover:text-[#71717a] dark:text-gray-400 flex items-center gap-2 ml-2 tracking-[0.04em]">
 <X className="w-3 h-3" /> Clear
 </button>
 )}
 </div>
 )}
 </div>

 {/* Gallery Grid */}
 {filteredData.length === 0 ? (
 <div className="text-center py-12 text-[#71717a] dark:text-gray-400 text-sm">
 No items match your search or filter.
 </div>
 ) : (
 <div className={`grid ${gridColsClass} gap-4`}>
 {filteredData.map((record, idx) => {
 const gradient = getCardGradient(idx);
 const title = titleField ? record.data?.[titleField.name] || 'Untitled' : 'Untitled';
 const subtitle = subtitleField ? record.data?.[subtitleField.name] || '' : '';

 // Varying header heights for masonry effect
 const headerHeights = ['h-28', 'h-36', 'h-24', 'h-32', 'h-28'];
 const headerHeight = headerHeights[idx % headerHeights.length];

 return (
 <div
 key={record.id}
 className="bg-card rounded-xl border-[0.5px] border-black/9 dark:border-white/8 border-primary/40 transition-all duration-300 overflow-hidden group cursor-pointer hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200"
 onClick={() => setViewRecord(record)}
 >
 {/* Gradient Header - varied heights for masonry effect */}
 <div className={`${headerHeight} bg-gradient-to-br ${gradient} relative overflow-hidden`}>
 {/* Decorative shapes */}
 <div className="absolute inset-0">
 <div className="absolute top-3 right-3 w-20 h-20 rounded-full bg-card/10 hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200" />
 <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-card/5 hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200" />
 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-xl bg-card/10 rotate-12 hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200" />
 </div>

 {/* Overlay content - title in the gradient */}
 <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/30 to-transparent">
 <h3 className="text-white font-semibold text-sm truncate ">{title}</h3>
 {subtitle && (
 <p className="text-white/80 text-xs truncate mt-0.5 tracking-[0.04em]">{subtitle}</p>
 )}
 </div>

 {/* Hover actions */}
 <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
 <button
 onClick={(e) => { e.stopPropagation(); openEdit(record);}}
 className="p-1.5 rounded-xl bg-card/90 backdrop-blur text-[#71717a] dark:text-gray-400 hover:text-amber-600 transition-colors  hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200"
 >
 <Pencil className="w-3.5 h-3.5" />
 </button>
 <button
 onClick={(e) => { e.stopPropagation(); setDeleteRecord(record);}}
 className="p-1.5 rounded-xl bg-card/90 backdrop-blur text-[#71717a] dark:text-gray-400 hover:text-red-600 transition-colors  hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 </div>

 {/* Card body */}
 <div className="p-4">
 <div className="space-y-2">
 {displayFields.map((f) => {
 const val = record.data?.[f.name];
 if (val === undefined || val === null || val === '') return null;

 const getIcon = () => {
 if (f.field_type === 'date') return Calendar;
 if (f.field_type === 'number') return Hash;
 return null;
};
 const FieldIcon = getIcon();

 return (
 <div key={f.name} className="flex items-center justify-between text-xs tracking-[0.04em]">
 <span className="text-[#71717a] dark:text-gray-400 font-medium flex items-center gap-2 truncate">
 {FieldIcon && <FieldIcon className="w-3 h-3" />}
 {f.name.replace(/_/g, ' ')}
 </span>
 <span className="font-medium text-foreground truncate max-w-[50%] text-right">
 {f.field_type === 'boolean' ? (
 <span className={`px-2 py-0.5 rounded-full text-[10px] ${val ? 'bg-primary/10 text-primary' : 'bg-muted text-[#71717a] dark:text-gray-400'}`}>
 {val ? 'Yes' : 'No'}
 </span>
 ) : f.field_type === 'select' ? (
 <Badge variant="secondary" className="text-[10px] px-2 py-0">{val}</Badge>
 ) : f.field_type === 'date' ? (
 (() => { try { return format(new Date(val), 'MMM d, yyyy');} catch { return String(val);}})()
 ) : (
 String(val)
 )}
 </span>
 </div>
 );
})}
 </div>

 <div className="mt-3 pt-2 border-t border-primary/40 text-[10px] text-[#71717a] dark:text-gray-400">
 {record.created_at ? format(new Date(record.created_at), 'MMM d, yyyy') : ''}
 </div>
 </div>
 </div>
 );
})}
 </div>
 )}

 {/* View Record Dialog */}
 <Dialog open={!!viewRecord} onOpenChange={(open) => !open && setViewRecord(null)}>
 <DialogContent className="sm:max-w-[520px]">
 {viewRecord && (() => {
 const gradient = getCardGradient(data.indexOf(viewRecord));
 return (
 <>
 <div className={`-mx-6 -mt-6 h-28 bg-gradient-to-br ${gradient} rounded-t-lg relative overflow-hidden`}>
 <div className="absolute top-4 right-4 w-16 h-16 rounded-full bg-card/10 hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200" />
 <div className="absolute -bottom-3 -left-3 w-20 h-20 rounded-full bg-card/5 hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200" />
 </div>
 <DialogHeader className="mt-2">
 <DialogTitle>{getRecordTitle(viewRecord, fieldDefinitions)}</DialogTitle>
 <DialogDescription>Full details for this record.</DialogDescription>
 </DialogHeader>
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
 <DialogFooter className="mt-4">
 <Button variant="outline" onClick={() => setViewRecord(null)}>Close</Button>
 <Button onClick={() => { openEdit(viewRecord); setViewRecord(null);}} className="gap-2">
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
