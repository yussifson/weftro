import React, { useState, useEffect, useMemo} from 'react';
import { Button} from '@/components/ui/button';
import { Input} from '@/components/ui/input';
import { Badge} from '@/components/ui/badge';
import { powerSync} from "@/api/PowerSyncConnector";
import { useToast} from '@/components/ui/use-toast';
import { AlertCircle, CheckCircle2, ChevronRight, ChevronLeft, Package, PackageX, TrendingDown} from 'lucide-react';

export default function DynamicInventoryView({ data = [], fieldDefinitions = [], onRefresh}) {
 const { toast} = useToast();
 const [quantities, setQuantities] = useState({});

 // Find the primary number field (usually quantity/stock)
 const numberFields = fieldDefinitions.filter(f => f.field_type === 'number');
 const qtyField = numberFields.find(f => f.name.toLowerCase().includes('qty') || f.name.toLowerCase().includes('stock') || f.name.toLowerCase().includes('quantity')) || numberFields[0];
 
 // Find name field
 const textFields = fieldDefinitions.filter(f => f.field_type === 'text');
 const nameField = textFields.find(f => f.name.toLowerCase().includes('name') || f.name.toLowerCase().includes('title')) || textFields[0];

 useEffect(() => {
 const initial = {};
 data.forEach(item => {
 initial[item.id] = qtyField ? (item.data[qtyField.name] || 0) : 0;
});
 setQuantities(initial);
}, [data, qtyField]);

 const totalItems = data.length;
 const outOfStock = data.filter(d => (qtyField ? (d.data[qtyField.name] || 0) : 0) <= 0).length;
 const lowStock = data.filter(d => {
 const q = qtyField ? (d.data[qtyField.name] || 0) : 0;
 return q > 0 && q < 10;
}).length;

 const handleAdjust = async (id, delta) => {
 if (!qtyField) return;
 const current = quantities[id] || 0;
 const next = Math.max(0, current + delta);
 setQuantities(prev => ({ ...prev, [id]: next}));

 try {
 const record = data.find(d => d.id === id);
 const updatedData = { ...record.data, [qtyField.name]: next};
 await (async () => { const _payload = {data: updatedData}; const _keys = Object.keys(_payload); const _vals = Object.values(_payload).map(v => typeof v === 'object' ? JSON.stringify(v) : v); await powerSync.execute(`UPDATE industry_records SET ${_keys.map(k => k+' = ?').join(', ')} WHERE id = ?`, [..._vals, id]);})();
 if (onRefresh) onRefresh();
} catch (e) {
 toast({ title: 'Error updating inventory', description: e.message, variant: 'destructive'});
 setQuantities(prev => ({ ...prev, [id]: current})); // rollback
}
};

 if (!qtyField) {
 return <div className="p-8 text-center text-[#71717a] dark:text-gray-400 border-[0.5px] border-black/9 dark:border-white/8 rounded-xl border-dashed">No number fields found to track inventory. Please add a "Quantity" or "Stock" number field.</div>;
}

 return (
 <div className="space-y-6">
 {/* Stats Bar */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="bg-card border-[0.5px] border-black/9 dark:border-white/8 rounded-xl p-4 flex items-center gap-4  hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200">
 <div className="w-12 h-12 rounded-full bg-muted dark:bg-primary/30 flex items-center justify-center text-primary">
 <Package className="w-6 h-6" />
 </div>
 <div>
 <p className="text-sm font-medium text-[#71717a] dark:text-gray-400">Total SKUs</p>
 <p className="text-2xl font-semibold tracking-[-0.02em]">{totalItems}</p>
 </div>
 </div>
 <div className="bg-card border-[0.5px] border-black/9 dark:border-white/8 rounded-xl p-4 flex items-center gap-4  hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200">
 <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600">
 <TrendingDown className="w-6 h-6" />
 </div>
 <div>
 <p className="text-sm font-medium text-[#71717a] dark:text-gray-400">Low Stock (&lt;10)</p>
 <p className="text-2xl font-semibold tracking-[-0.02em]">{lowStock}</p>
 </div>
 </div>
 <div className="bg-card border-[0.5px] border-black/9 dark:border-white/8 rounded-xl p-4 flex items-center gap-4  hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200">
 <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600">
 <PackageX className="w-6 h-6" />
 </div>
 <div>
 <p className="text-sm font-medium text-[#71717a] dark:text-gray-400">Out of Stock</p>
 <p className="text-2xl font-semibold tracking-[-0.02em]">{outOfStock}</p>
 </div>
 </div>
 </div>

 {/* Inventory Table */}
 <div className="bg-card border-[0.5px] border-black/9 dark:border-white/8 rounded-xl overflow-hidden hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200">
 <table className="w-full text-left text-sm">
 <thead className="bg-muted/50 text-[#71717a] dark:text-gray-400">
 <tr>
 <th className="px-4 py-3 font-medium">Item</th>
 <th className="px-4 py-3 font-medium">Stock Level</th>
 <th className="px-4 py-3 font-medium">Quantity</th>
 <th className="px-4 py-3 font-medium text-right">Adjust</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {data.map(item => {
 const q = quantities[item.id] || 0;
 const name = nameField ? item.data[nameField.name] : 'Unnamed Item';
 
 let statusColor = 'bg-primary';
 let statusBg = 'bg-muted dark:bg-primary/30 text-primary/90 dark:text-primary/70';
 let statusLabel = 'In Stock';
 
 if (q === 0) {
 statusColor = 'bg-red-500/10';
 statusBg = 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
 statusLabel = 'Out of Stock';
} else if (q < 10) {
 statusColor = 'bg-yellow-500/10';
 statusBg = 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
 statusLabel = 'Low Stock';
}

 return (
 <tr key={item.id} className="hover:bg-muted/30 transition-colors">
 <td className="px-4 py-3 font-medium">{name}</td>
 <td className="px-4 py-3">
 <div className="flex items-center gap-3 max-w-[200px]">
 <Badge className={statusBg} variant="secondary">{statusLabel}</Badge>
 <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
 <div className={`h-full ${statusColor} transition-all duration-500`} style={{ width: `${Math.min(100, (q / 50) * 100)}%`}} />
 </div>
 </div>
 </td>
 <td className="px-4 py-3 font-mono text-lg">{q}</td>
 <td className="px-4 py-3">
 <div className="flex items-center justify-end gap-2">
 <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleAdjust(item.id, -1)} disabled={q <= 0}>-</Button>
 <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleAdjust(item.id, 1)}>+</Button>
 </div>
 </td>
 </tr>
 );
})}
 {data.length === 0 && (
 <tr>
 <td colSpan={4} className="px-4 py-8 text-center text-[#71717a] dark:text-gray-400">No items in inventory.</td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>
 );
}
