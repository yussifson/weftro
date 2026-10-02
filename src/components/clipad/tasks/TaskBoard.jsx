import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Plus, MoreVertical, Calendar as CalendarIcon, CheckCircle, Clock, Trash2, Edit3, Circle, User } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const DEFAULT_STAGES = [
  { id: 'todo', label: 'To Do', color: 'bg-slate-500' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-indigo-500' },
  { id: 'done', label: 'Done', color: 'bg-emerald-500' }
];

export default function TaskBoard({ spaceId }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [boardId, setBoardId] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingToStage, setAddingToStage] = useState(null);
  
  // Custom Stages
  const [stages, setStages] = useState(DEFAULT_STAGES);
  const [showAddStage, setShowAddStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');

  useEffect(() => {
    if (spaceId) fetchBoardAndTasks();
  }, [spaceId]);

  useEffect(() => {
    if (boardId) {
      const saved = localStorage.getItem(`clipad_stages_${boardId}`);
      if (saved) setStages(JSON.parse(saved));
    }
  }, [boardId]);

  const saveStages = (newStages) => {
    setStages(newStages);
    if (boardId) localStorage.setItem(`clipad_stages_${boardId}`, JSON.stringify(newStages));
  };

  const fetchBoardAndTasks = async () => {
    setLoading(true);
    try {
      // Find or create default board for this space
      let { data: board } = await supabase.from('clipad_task_boards').select('*').eq('space_id', spaceId).limit(1).single();
      
      if (!board) {
        const { data: newBoard, error } = await supabase.from('clipad_task_boards').insert({ space_id: spaceId, name: 'Main Board' }).select().single();
        if (error) throw error;
        board = newBoard;
      }
      setBoardId(board.id);

      const { data: tasksData, error: tasksError } = await supabase
        .from('clipad_tasks')
        .select('*, assignee:assignee_id(full_name, avatar_url)')
        .eq('board_id', board.id)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (e, stageId) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !boardId) return;

    try {
      const { data, error } = await supabase.from('clipad_tasks').insert({
        board_id: boardId,
        title: newTaskTitle.trim(),
        status: stageId,
        assignee_id: user.id
      }).select('*, assignee:assignee_id(full_name, avatar_url)').single();

      if (error) throw error;
      setTasks(prev => [data, ...prev]);
      setNewTaskTitle('');
      setAddingToStage(null);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to add task.', variant: 'destructive' });
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      await supabase.from('clipad_tasks').update({ status: newStatus }).eq('id', taskId);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      await supabase.from('clipad_tasks').delete().eq('id', taskId);
    } catch (err) {
      console.error(err);
    }
  };

  const addStage = (e) => {
    e.preventDefault();
    if (!newStageName.trim()) return;
    const id = newStageName.trim().toLowerCase().replace(/\s+/g, '_');
    if (stages.find(s => s.id === id)) {
      toast({ title: 'Error', description: 'Column already exists', variant: 'destructive' });
      return;
    }
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500', 'bg-teal-500'];
    const color = colors[stages.length % colors.length];
    
    saveStages([...stages, { id, label: newStageName.trim(), color }]);
    setNewStageName('');
    setShowAddStage(false);
  };

  const deleteStage = (stageId) => {
    if (tasks.some(t => t.status === stageId)) {
      toast({ title: 'Error', description: 'Cannot delete column with tasks in it. Move tasks first.', variant: 'destructive' });
      return;
    }
    saveStages(stages.filter(s => s.id !== stageId));
  };

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDrop = (e, stageId) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      updateTaskStatus(taskId, stageId);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading tasks...</div>;

  return (
    <div className="h-full flex flex-col font-sans">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2 tracking-tight">
          <CheckCircle className="w-5 h-5 text-primary" /> Action Board
        </h2>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex items-start gap-4 pb-4 h-full md:min-w-max max-md:snap-x max-md:snap-mandatory">
          {stages.map(stage => (
            <div 
              key={stage.id} 
              className="w-[85vw] md:w-[320px] shrink-0 max-md:snap-center h-full flex flex-col bg-card/40 backdrop-blur rounded-2xl border border-border shadow-sm overflow-hidden"
              onDrop={(e) => handleDrop(e, stage.id)}
              onDragOver={handleDragOver}
            >
              <div className="p-4 flex items-center justify-between border-b border-border/50 bg-card/60">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${stage.color} shadow-sm`} />
                  <h3 className="font-semibold text-foreground text-sm tracking-tight">{stage.label}</h3>
                  <span className="text-xs bg-secondary/50 text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                    {tasks.filter(t => t.status === stage.id).length}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => { setAddingToStage(stage.id); setNewTaskTitle(''); }}
                    className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                    title="Add Task"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="text-destructive" onClick={() => deleteStage(stage.id)}>
                        <Trash2 className="w-4 h-4 mr-2" /> Delete Column
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="p-3 flex-1 flex flex-col gap-3 min-h-[150px] overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                {addingToStage === stage.id && (
                  <form onSubmit={(e) => handleAddTask(e, stage.id)} className="bg-background p-3 rounded-xl border border-primary/40 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <input
                      
                      type="text"
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      placeholder="What needs to be done?"
                      className="w-full bg-transparent text-sm text-foreground placeholder-muted-foreground outline-none mb-2"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button type="button" onClick={() => setAddingToStage(null)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                      <button type="submit" className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-lg font-medium">Add</button>
                    </div>
                  </form>
                )}

                {tasks.filter(t => t.status === stage.id).map(task => (
                  <div 
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    className="bg-white dark:bg-[#1A232C] p-4 sm:p-5 rounded-2xl border border-black/5 dark:border-white/5 hover:border-primary/30 shadow-sm cursor-grab active:cursor-grabbing active:scale-[0.98] group transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <p className={`text-base font-semibold leading-snug ${task.status === 'done' ? 'line-through text-slate-400 dark:text-muted-foreground' : 'text-slate-900 dark:text-white'}`}>
                        {task.title}
                      </p>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all shrink-0">
                          <MoreVertical className="w-4 h-4 text-slate-400" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 rounded-xl">
                          {stages.filter(s => s.id !== task.status).map(s => (
                            <DropdownMenuItem key={s.id} onClick={() => updateTaskStatus(task.id, s.id)}>
                              <Circle className={`w-3 h-3 mr-2 ${s.color.replace('bg-', 'text-')}`} /> Move to {s.label}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuItem onClick={() => deleteTask(task.id)} className="text-xs text-rose-500">
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    {task.source === 'ai_generated' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-pink-500/10 text-pink-500 text-[10px] font-bold uppercase tracking-wider mb-3">
                        ✨ AI Generated
                      </span>
                    )}

                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-black/5 dark:border-white/5 mt-3">
                      <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 dark:text-muted-foreground">
                        {task.due_date && <span className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md"><CalendarIcon className="w-3 h-3 text-indigo-400" /> {new Date(task.due_date).toLocaleDateString()}</span>}
                      </div>
                      {task.assignee && (
                        <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-secondary flex items-center justify-center overflow-hidden border border-white dark:border-slate-800 shadow-sm" title={task.assignee.full_name}>
                          {task.assignee.avatar_url ? (
                            <img src={task.assignee.avatar_url} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Add Column Button */}
          <div className="w-[85vw] md:w-[320px] shrink-0 max-md:snap-center h-full flex flex-col">
            {!showAddStage ? (
              <button 
                onClick={() => setShowAddStage(true)}
                className="w-full h-14 flex items-center justify-center gap-2 border border-dashed border-border rounded-2xl text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-card/50 transition-all font-medium"
              >
                <Plus className="w-5 h-5" /> Add Column
              </button>
            ) : (
              <form onSubmit={addStage} className="bg-card/60 backdrop-blur rounded-2xl border border-primary/50 shadow-sm p-3 animate-in fade-in slide-in-from-left-2">
                <input
                  
                  type="text"
                  value={newStageName}
                  onChange={e => setNewStageName(e.target.value)}
                  placeholder="Column name"
                  className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-3 py-2 text-sm mb-3 text-foreground"
                />
                <div className="flex gap-2 justify-end">
                  <button 
                    type="button"
                    onClick={() => { setShowAddStage(false); setNewStageName(''); }}
                    className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={!newStageName.trim()}
                    className="px-3 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-md disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
