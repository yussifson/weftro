import React, { useState} from 'react';
import { ChevronDown, ChevronUp, Search, Filter, Download, MoreHorizontal} from 'lucide-react';

function cn(...classes) {
 return classes.filter(Boolean).join(' ');
}

export default function OrbitTable({ 
 columns, 
 data, 
 title,
 showToolbar = true,
 onRowClick
}) {
 const [sortCol, setSortCol] = useState(null);
 const [sortDir, setSortDir] = useState('asc'); // 'asc' or 'desc'
 const [search, setSearch] = useState('');

 const handleSort = (colId) => {
 if (sortCol === colId) {
 setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
} else {
 setSortCol(colId);
 setSortDir('asc');
}
};

 return (
 <div className="w-full flex flex-col bg-[var(--color-surface-1)] border-[0.5px] border-black/9 dark:border-white/8 border-primary/40 rounded-md-[var(--radius-lg)] overflow-hidden">
 
 {showToolbar && (
 <div className="p-4 border-b border-primary/40 bg-[var(--color-surface-0)] flex items-center justify-between">
 <div className="flex items-center gap-4">
 {title && <h3 className="font-semibold text-[var(--color-text-primary)]">{title}</h3>}
 <div className="relative group">
 <Search className="w-4 h-4 text-[var(--color-text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
 <input 
 type="text" 
 placeholder="Search..." 
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-64 focus:w-80 transition-all duration-200 bg-[var(--color-surface-2)] border-[0.5px] border-black/9 dark:border-white/8 border-primary/40 rounded-md-[var(--radius-md)] pl-9 pr-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-accent-primary)] focus:ring-1 focus:ring-[var(--color-accent-primary)] font-body"
 />
 </div>
 </div>
 
 <div className="flex items-center gap-2">
 <button className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-4)] text-[var(--color-text-primary)] text-sm font-medium rounded-md-[var(--radius-md)] transition-colors">
 <Filter className="w-4 h-4" /> Filter
 </button>
 <button className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-4)] text-[var(--color-text-primary)] text-sm font-medium rounded-md-[var(--radius-md)] transition-colors">
 <Download className="w-4 h-4" /> Export
 </button>
 </div>
 </div>
 )}

 <div className="overflow-x-auto custom-scrollbar">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="bg-[var(--color-surface-0)] sticky top-0 z-10 border-b border-primary/40">
 {columns.map((col, idx) => (
 <th 
 key={col.id || idx}
 onClick={() => col.sortable !== false && handleSort(col.id)}
 className={cn(
 "px-4 py-3 text-[var(--text-xs)] uppercase tracking-[var(--tracking-widest)] text-[var(--color-text-tertiary)] font-semibold select-none",
 col.sortable !== false && "cursor-pointer hover:text-[var(--color-text-primary)] transition-colors",
 col.align === 'right' && "text-right"
 )}
 >
 <div className={cn("flex items-center gap-2", col.align === 'right' && "justify-end")}>
 {col.header}
 {col.sortable !== false && (
 <div className="flex flex-col opacity-0 group-hover:opacity-100 data-[active=true]:opacity-100 transition-opacity" data-active={sortCol === col.id}>
 {sortCol === col.id ? (
 sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-[var(--color-accent-primary)]" /> : <ChevronDown className="w-3 h-3 text-[var(--color-accent-primary)]" />
 ) : (
 <ChevronDown className="w-3 h-3" />
 )}
 </div>
 )}
 </div>
 </th>
 ))}
 <th className="px-4 py-3 w-10"></th>
 </tr>
 </thead>
 <tbody>
 {data.length === 0 ? (
 <tr>
 <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-[var(--color-text-tertiary)] text-sm">
 No records found.
 </td>
 </tr>
 ) : (
 data.map((row, rIdx) => (
 <tr 
 key={row.id || rIdx}
 onClick={() => onRowClick && onRowClick(row)}
 className={cn(
 "group border-b border-primary/40 last:border-0 hover:bg-[var(--color-surface-3)] transition-colors duration-100",
 onRowClick && "cursor-pointer"
 )}
 >
 {columns.map((col, cIdx) => (
 <td 
 key={cIdx} 
 className={cn(
 "px-4 py-3 text-[var(--text-sm)] text-[var(--color-text-primary)]",
 col.align === 'right' && "text-right"
 )}
 >
 {col.render ? col.render(row[col.id], row) : row[col.id]}
 </td>
 ))}
 <td className="px-4 py-3 text-right opacity-0 group-hover:opacity-100 transition-opacity">
 <button className="p-1 hover:bg-[var(--color-surface-4)] rounded-md text-[var(--color-text-secondary)] transition-colors">
 <MoreHorizontal className="w-4 h-4" />
 </button>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 
 {/* Pagination Footer */}
 <div className="p-3 border-t border-primary/40 bg-[var(--color-surface-0)] flex items-center justify-between text-xs text-[var(--color-text-tertiary)] tracking-[0.04em]">
 <span>Showing {data.length > 0 ? 1 : 0} to {data.length} of {data.length} results</span>
 <div className="flex items-center gap-2">
 <button className="px-2 py-1 rounded-md hover:bg-[var(--color-surface-3)] disabled:opacity-50 transition-colors" disabled>Previous</button>
 <button className="px-2 py-1 rounded-md bg-[var(--color-accent-subtle)] text-[var(--color-accent-primary)] font-medium">1</button>
 <button className="px-2 py-1 rounded-md hover:bg-[var(--color-surface-3)] disabled:opacity-50 transition-colors">Next</button>
 </div>
 </div>
 </div>
 );
}
