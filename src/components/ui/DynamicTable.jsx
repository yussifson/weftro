import { supabase } from '@/api/supabaseClient';
import React, { useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel} from '@tanstack/react-table';
import { ArrowUpDown, Search, ChevronLeft, ChevronRight, Eye, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { powerSync } from "@/api/PowerSyncConnector";
import { useToast } from '@/components/ui/use-toast';

export default function DynamicTable({ data = [], fieldDefinitions = [], moduleDef, onRefresh }) {
  const { toast } = useToast();
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editRecord, setEditRecord] = useState(null);
  const [editData, setEditData] = useState({});
  const [deleteRecord, setDeleteRecord] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const columns = React.useMemo(() => {
    return fieldDefinitions.map((field) => ({
      accessorFn: (row) => row.data?.[field.name],
      id: field.name,
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4 hover:bg-muted/50"
        >
          {field.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const val = row.original.data?.[field.name];
        if (field.field_type === 'boolean') {
          return val ? (
            <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full tracking-[0.04em]">Yes</span>
          ) : (
            <span className="px-2 py-1 bg-muted text-[#71717a] dark:text-gray-400 text-xs rounded-full tracking-[0.04em]">No</span>
          );
        }
        return <div className="text-sm max-w-[200px] truncate" title={val}>{val || '-'}</div>;
      }}));
  }, [fieldDefinitions]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    state: { sorting, globalFilter }});

  const openEdit = (record) => {
    setEditRecord(record);
    setEditData({ ...record.data });
  };

  const handleSaveEdit = async () => {
    if (!editRecord) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('dynamic_records')
        .update({ data: editData })
        .eq('id', editRecord.id);
      if (error) throw error;
      toast({ title: 'Record updated', description: 'Changes saved successfully.' });
      setEditRecord(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      toast({ title: 'Error', description: err.message || 'Failed to save.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRecord) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('dynamic_records')
        .delete()
        .eq('id', deleteRecord.id);
      if (error) throw error;
      toast({ title: 'Record deleted', description: 'The record has been removed.' });
      setDeleteRecord(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      toast({ title: 'Error', description: err.message || 'Failed to delete.', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const renderEditField = (field) => {
    const label = field.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const val = editData[field.name] ?? '';

    if (field.field_type === 'boolean') {
      return (
        <div key={field.name} className="flex items-center justify-between py-2 border-b border-primary/40 last:border-0">
          <label className="text-sm font-medium text-foreground">{label}</label>
          <input
            type="checkbox"
            checked={!!val}
            onChange={e => setEditData({ ...editData, [field.name]: e.target.checked })}
            className="h-4 w-4 rounded-md border-primary/40"
          />
        </div>
      );
    }
    if (field.field_type === 'select') {
      let options = [];
      try { options = typeof field.options === 'string' ? JSON.parse(field.options) : (field.options || []); } catch { options = []; }
      return (
        <div key={field.name} className="space-y-1">
          <label className="text-xs font-semibold text-[#71717a] dark:text-gray-400 uppercase tracking-wide tracking-[0.04em]">{label}</label>
          <select
            value={val}
            onChange={e => setEditData({ ...editData, [field.name]: e.target.value })}
            className="w-full rounded-xl border-[0.5px] border-black/9 dark:border-white/8 border-primary/40 bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200"
          >
            <option value="">Select...</option>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      );
    }
    if (field.field_type === 'date') {
      return (
        <div key={field.name} className="space-y-1">
          <label className="text-xs font-semibold text-[#71717a] dark:text-gray-400 uppercase tracking-wide tracking-[0.04em]">{label}</label>
          <Input
            type="date"
            value={val}
            onChange={e => setEditData({ ...editData, [field.name]: e.target.value })}
          />
        </div>
      );
    }
    if (field.field_type === 'number') {
      return (
        <div key={field.name} className="space-y-1">
          <label className="text-xs font-semibold text-[#71717a] dark:text-gray-400 uppercase tracking-wide tracking-[0.04em]">{label}</label>
          <Input
            type="number"
            value={val}
            onChange={e => setEditData({ ...editData, [field.name]: e.target.value })}
          />
        </div>
      );
    }
    return (
      <div key={field.name} className="space-y-1">
        <label className="text-xs font-semibold text-[#71717a] dark:text-gray-400 uppercase tracking-wide tracking-[0.04em]">{label}</label>
        <Input
          type="text"
          value={val}
          onChange={e => setEditData({ ...editData, [field.name]: e.target.value })}
        />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#71717a] dark:text-gray-400" />
          <Input
            placeholder="Search all columns..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-xs text-[#71717a] dark:text-gray-400 tracking-[0.04em]">{data.length} record{data.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="rounded-lg border-[0.5px] border-black/9 dark:border-white/8 border-primary/40 bg-card hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200">
        
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] text-[#71717a] dark:text-gray-400 bg-muted/50 border-b border-primary/40 uppercase tracking-[0.06em]">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-4 py-3 font-medium text-[11px]">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                  <th className="px-4 py-3 font-medium text-right text-[11px]">Actions</th>
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border">
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="group hover:bg-muted/50 transition-colors h-12">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 align-middle text-foreground">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-120">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#71717a] dark:text-gray-400 hover:text-primary" title="View" onClick={() => setSelectedRecord(row.original)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#71717a] dark:text-gray-400 hover:text-amber-600" title="Edit" onClick={() => openEdit(row.original)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#71717a] dark:text-gray-400 hover:text-red-600" title="Delete" onClick={() => setDeleteRecord(row.original)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length + 1} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="w-8 h-8 text-[#71717a] dark:text-gray-400 opacity-30" />
                      <p className="text-sm font-medium text-foreground">No records found</p>
                      <p className="text-xs text-[#71717a] dark:text-gray-400">Add your first record using the button above.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Stacked Cards */}
        <div className="md:hidden flex flex-col divide-y divide-border">
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <div key={row.id} className="flex flex-col p-4 gap-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-sm truncate pr-2">
                    {row.getVisibleCells()[0] ? flexRender(row.getVisibleCells()[0].column.columnDef.cell, row.getVisibleCells()[0].getContext()) : ''}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#71717a] dark:text-gray-400" onClick={() => openEdit(row.original)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#71717a] dark:text-gray-400" onClick={() => setDeleteRecord(row.original)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {row.getVisibleCells().length > 1 && (
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {row.getVisibleCells().slice(1, 5).map((cell) => (
                      <div key={cell.id} className="flex flex-col">
                        <span className="text-[10px] font-medium uppercase text-[#71717a] dark:text-gray-400 truncate">
                          {cell.column.id.replace(/_/g, ' ')}
                        </span>
                        <div className="text-xs truncate">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
              <Search className="w-8 h-8 text-[#71717a] dark:text-gray-400 opacity-30" />
              <p className="text-sm font-medium text-foreground">No records found</p>
            </div>
          )}
        </div>

      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        <span className="text-xs text-[#71717a] dark:text-gray-400 px-2 tracking-[0.04em]">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
        </span>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* View Dialog */}
      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Record Details</DialogTitle>
            <DialogDescription>Full data for this record.</DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="mt-2 space-y-2">
              {fieldDefinitions.map(f => (
                <div key={f.name} className="flex justify-between items-center py-2 border-b border-primary/40 last:border-0">
                  <span className="text-xs font-semibold text-[#71717a] dark:text-gray-400 uppercase tracking-wide tracking-[0.04em]">{f.name.replace(/_/g, ' ')}</span>
                  <span className="text-sm font-medium text-foreground max-w-[60%] text-right break-words">{String(selectedRecord.data[f.name] ?? '-')}</span>
                </div>
              ))}
              <p className="text-[11px] text-[#71717a] dark:text-gray-400 pt-2">Created: {new Date(selectedRecord.created_at).toLocaleString()}</p>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setSelectedRecord(null)}>Close</Button>
            <Button onClick={() => { openEdit(selectedRecord); setSelectedRecord(null); }} className="gap-2">
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
            {fieldDefinitions.map(f => renderEditField(f))}
          </div>
          <DialogFooter className="mt-6 pt-4 border-t border-primary/40">
            <Button variant="outline" onClick={() => setEditRecord(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-white">
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteRecord} onOpenChange={(open) => !open && setDeleteRecord(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteRecord(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
