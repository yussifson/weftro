import { supabase} from '@/api/supabaseClient';
import React, { useState, useMemo} from 'react';
import { format} from 'date-fns';
import {
 ChevronLeft,
 ChevronRight,
 Calendar as CalendarIcon,
 Clock,
 Eye,
 Pencil,
 X,
 Layers} from 'lucide-react';
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

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EVENT_COLORS = [
 { bg: 'bg-primary', light: 'bg-orange-100 text-orange-700', ring: 'ring-primary/20'},
 { bg: 'bg-primary', light: 'bg-primary/10 text-primary', ring: 'ring-primary/20'},
 { bg: 'bg-primary', light: 'bg-primary/10 text-primary', ring: 'ring-primary/20'},
 { bg: 'bg-amber-500', light: 'bg-amber-100 text-amber-700', ring: 'ring-amber-200'},
 { bg: 'bg-rose-500', light: 'bg-rose-100 text-rose-700', ring: 'ring-rose-200'},
 { bg: 'bg-primary', light: 'bg-primary/10 text-primary', ring: 'ring-primary/20'},
];

function getRecordTitle(record, fieldDefinitions) {
 const textFields = fieldDefinitions.filter((f) => f.field_type === 'text');
 if (textFields.length > 0) return record.data?.[textFields[0].name] || 'Untitled';
 const first = Object.values(record.data || {})[0];
 return first ? String(first) : 'Untitled';
}

export default function DynamicCalendarView({ data = [], fieldDefinitions = [], onRefresh, moduleDef}) {
 const { toast} = useToast();
 const [currentDate, setCurrentDate] = useState(new Date());
 const [selectedDay, setSelectedDay] = useState(null);
 const [viewRecord, setViewRecord] = useState(null);
 const [editRecord, setEditRecord] = useState(null);
 const [editData, setEditData] = useState({});
 const [isSaving, setIsSaving] = useState(false);

 // Find all date fields
 const dateFields = useMemo(
 () => fieldDefinitions.filter((f) => f.field_type === 'date'),
 [fieldDefinitions]
 );

 // Build a map of date -> events
 const eventMap = useMemo(() => {
 const map = {};
 data.forEach((record) => {
 // Use date fields from records
 dateFields.forEach((df, idx) => {
 const dateVal = record.data?.[df.name];
 if (dateVal) {
 try {
 const d = new Date(dateVal);
 if (!isNaN(d.getTime())) {
 const key = format(d, 'yyyy-MM-dd');
 if (!map[key]) map[key] = [];
 map[key].push({
 record,
 fieldName: df.name,
 colorIdx: idx % EVENT_COLORS.length});
}
} catch {
 // skip invalid dates
}
}
});
 // Also use created_at as fallback if no date fields
 if (dateFields.length === 0 && record.created_at) {
 try {
 const d = new Date(record.created_at);
 const key = format(d, 'yyyy-MM-dd');
 if (!map[key]) map[key] = [];
 map[key].push({ record, fieldName: 'created_at', colorIdx: 0});
} catch {
 // skip
}
}
});
 return map;
}, [data, dateFields]);

 // Calendar math
 const year = currentDate.getFullYear();
 const month = currentDate.getMonth();
 const firstDay = new Date(year, month, 1);
 const lastDay = new Date(year, month + 1, 0);
 const startPad = firstDay.getDay();
 const totalDays = lastDay.getDate();
 const prevMonthLastDay = new Date(year, month, 0).getDate();

 const calendarCells = useMemo(() => {
 const cells = [];
 // Previous month padding
 for (let i = startPad - 1; i >= 0; i--) {
 cells.push({ day: prevMonthLastDay - i, inMonth: false, date: null});
}
 // Current month days
 for (let d = 1; d <= totalDays; d++) {
 const dateObj = new Date(year, month, d);
 const key = format(dateObj, 'yyyy-MM-dd');
 cells.push({ day: d, inMonth: true, date: dateObj, key, events: eventMap[key] || []});
}
 // Next month padding
 const remaining = 42 - cells.length;
 for (let i = 1; i <= remaining; i++) {
 cells.push({ day: i, inMonth: false, date: null});
}
 return cells;
}, [year, month, startPad, totalDays, prevMonthLastDay, eventMap]);

 const today = format(new Date(), 'yyyy-MM-dd');

 const goToPrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
 const goToNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
 const goToToday = () => setCurrentDate(new Date());

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
 setSelectedDay(null);
 if (onRefresh) onRefresh();
} catch (err) {
 toast({ title: 'Error', description: err.message || 'Failed to save.', variant: 'destructive'});
} finally {
 setIsSaving(false);
}
};

 // Count total events this month
 const totalEventsThisMonth = useMemo(() => {
 return calendarCells.filter((c) => c.inMonth).reduce((sum, c) => sum + (c.events?.length || 0), 0);
}, [calendarCells]);

 if (!data || data.length === 0) {
 return (
 <div className="flex flex-col items-center justify-center py-20 bg-gradient-to-br from-slate-50 to-primary/30 rounded-2xl border-[0.5px] border-black/9 dark:border-white/8 border-primary/40">
 <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary flex items-center justify-center mb-4 -emerald-500/20">
 <CalendarIcon className="w-8 h-8 text-white" />
 </div>
 <h3 className="text-lg font-semibold text-slate-800 mb-1">No Events Yet</h3>
 <p className="text-sm text-[#71717a] dark:text-gray-400 max-w-sm text-center">
 Add records with date fields to see them plotted on the calendar.
 </p>
 </div>
 );
}

 return (
 <>
 <div className="bg-card rounded-2xl border-[0.5px] border-black/9 dark:border-white/8 border-primary/40 overflow-hidden hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200">
 {/* Calendar Header */}
 <div className="bg-gradient-to-r from-primary via-primary to-primary px-6 py-5">
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-2xl font-semibold text-white tracking-tight tracking-[-0.02em]">
 {format(currentDate, 'MMMM yyyy')}
 </h2>
 <p className="text-primary/10 text-sm mt-0.5">
 {totalEventsThisMonth} event{totalEventsThisMonth !== 1 ? 's' : ''} this month
 </p>
 </div>
 <div className="flex items-center gap-2">
 <Button
 variant="ghost"
 size="sm"
 onClick={goToToday}
 className="text-white hover:bg-card/20 text-xs font-medium tracking-[0.04em] hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200"
 >
 Today
 </Button>
 <div className="flex items-center bg-card/10 rounded-xl backdrop-blur-sm hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200">
 <Button
 variant="ghost"
 size="sm"
 onClick={goToPrevMonth}
 className="text-white hover:bg-card/20 rounded-md-r-none hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200"
 >
 <ChevronLeft className="w-4 h-4" />
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={goToNextMonth}
 className="text-white hover:bg-card/20 rounded-md-l-none hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200"
 >
 <ChevronRight className="w-4 h-4" />
 </Button>
 </div>
 </div>
 </div>
 </div>

 {/* Day Headers */}
 <div className="grid grid-cols-7 border-b border-primary/40 bg-muted/50/80">
 {DAYS_OF_WEEK.map((day) => (
 <div key={day} className="px-2 py-3 text-center text-xs font-semibold text-[#71717a] dark:text-gray-400 uppercase tracking-wider tracking-[0.04em]">
 {day}
 </div>
 ))}
 </div>

 {/* Calendar Grid */}
 <div className="grid grid-cols-7">
 {calendarCells.map((cell, idx) => {
 const isToday = cell.key === today;
 const hasEvents = cell.events && cell.events.length > 0;
 return (
 <div
 key={idx}
 onClick={() => hasEvents && setSelectedDay(cell)}
 className={`
 min-h-[100px] p-2 border-b border-r border-primary/40 relative transition-all duration-150
 ${cell.inMonth ? 'bg-card' : 'bg-muted/50/50'}
 ${hasEvents ? 'cursor-pointer hover:bg-muted/500 ' : ''}
 ${isToday ? 'ring-2 ring-inset ring-primary/40 bg-primary/30' : ''}
 `}
 >
 {/* Day Number */}
 <div className="flex items-center justify-between mb-1">
 <span
 className={`
 text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
 ${!cell.inMonth ? 'text-slate-300' : 'text-foreground'}
 ${isToday ? 'bg-primary text-white font-semibold ' : ''}
 `}
 >
 {cell.day}
 </span>
 {hasEvents && (
 <span className="text-[10px] font-semibold text-[#71717a] dark:text-gray-400 bg-muted rounded-full px-1.5 py-0.5">
 {cell.events.length}
 </span>
 )}
 </div>

 {/* Event Dots / Labels */}
 {hasEvents && (
 <div className="space-y-1">
 {cell.events.slice(0, 3).map((ev, evIdx) => {
 const color = EVENT_COLORS[ev.colorIdx];
 return (
 <div
 key={evIdx}
 className={`flex items-center gap-2.5 px-1.5 py-0.5 rounded-lg text-[10px] font-medium truncate ${color.light}`}
 >
 <span className={`w-1.5 h-1.5 rounded-full ${color.bg} flex-shrink-0`} />
 <span className="truncate">{getRecordTitle(ev.record, fieldDefinitions)}</span>
 </div>
 );
})}
 {cell.events.length > 3 && (
 <span className="text-[10px] text-[#71717a] dark:text-gray-400 pl-1.5 font-medium">
 +{cell.events.length - 3} more
 </span>
 )}
 </div>
 )}
 </div>
 );
})}
 </div>

 {/* Date field legend */}
 {dateFields.length > 0 && (
 <div className="px-6 py-3 bg-muted/50/80 border-t border-primary/40 flex items-center gap-4 flex-wrap">
 <span className="text-xs font-medium text-[#71717a] dark:text-gray-400 uppercase tracking-wider tracking-[0.04em]">Fields:</span>
 {dateFields.map((df, idx) => {
 const color = EVENT_COLORS[idx % EVENT_COLORS.length];
 return (
 <div key={df.name} className="flex items-center gap-2.5">
 <span className={`w-2.5 h-2.5 rounded-full ${color.bg}`} />
 <span className="text-xs text-[#71717a] dark:text-gray-400 font-medium tracking-[0.04em]">
 {df.name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
 </span>
 </div>
 );
})}
 </div>
 )}
 </div>

 {/* Day Detail Dialog */}
 <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
 <DialogContent className="sm:max-w-[520px] max-h-[80vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2">
 <CalendarIcon className="w-5 h-5 text-primary" />
 {selectedDay?.date && format(selectedDay.date, 'EEEE, MMMM d, yyyy')}
 </DialogTitle>
 <DialogDescription>
 {selectedDay?.events?.length || 0} event{(selectedDay?.events?.length || 0) !== 1 ? 's' : ''} on this day
 </DialogDescription>
 </DialogHeader>
 <div className="mt-2 space-y-3">
 {selectedDay?.events?.map((ev, idx) => {
 const color = EVENT_COLORS[ev.colorIdx];
 return (
 <div
 key={idx}
 className={`p-4 rounded-xl border-[0.5px] border-black/9 dark:border-white/8 border-primary/40 bg-card transition-all group ring-1 ${color.ring}`}
 >
 <div className="flex items-start justify-between">
 <div className="flex-1 min-w-0">
 <h4 className="font-semibold text-slate-800 text-sm truncate">
 {getRecordTitle(ev.record, fieldDefinitions)}
 </h4>
 <p className="text-xs text-[#71717a] dark:text-gray-400 mt-0.5 flex items-center gap-2 tracking-[0.04em]">
 <Clock className="w-3 h-3" />
 {ev.fieldName.replace(/_/g, ' ')}
 </p>
 </div>
 <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
 <button
 onClick={() => { setViewRecord(ev.record); setSelectedDay(null);}}
 className="p-1.5 rounded-xl bg-muted text-[#71717a] dark:text-gray-400 hover:text-primary hover:bg-muted/50 transition-colors"
 >
 <Eye className="w-3.5 h-3.5" />
 </button>
 <button
 onClick={() => { openEdit(ev.record); setSelectedDay(null);}}
 className="p-1.5 rounded-xl bg-muted text-[#71717a] dark:text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
 >
 <Pencil className="w-3.5 h-3.5" />
 </button>
 </div>
 </div>
 <div className="mt-2 flex flex-wrap gap-2.5">
 {fieldDefinitions.slice(0, 4).map((f) => {
 const val = ev.record.data?.[f.name];
 if (!val || f.field_type === 'date') return null;
 return (
 <span key={f.name} className="text-[10px] bg-muted text-[#71717a] dark:text-gray-400 px-2 py-0.5 rounded-lg truncate max-w-[140px]">
 {String(val)}
 </span>
 );
})}
 </div>
 </div>
 );
})}
 </div>
 <DialogFooter className="mt-4">
 <Button variant="outline" onClick={() => setSelectedDay(null)}>Close</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

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
 </>
 );
}
