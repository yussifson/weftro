import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Plus, MoreVertical, Calendar as CalendarIcon, CheckCircle, Clock, Trash2, Edit3, Circle, User, Sparkles } from 'lucide-react';
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

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center text-slate-400">
      <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-4" />
      <span className="text-sm font-medium">Loading action board...</span>
    </div>
  );

  return (
    <div className="h-full flex flex-col font-sans bg-white dark:bg-slate-950 rounded-2xl overflow-hidden p-4 md:p-6 shadow-sm border border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 tracking-tight leading-none mb-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            Action Board
          </h2>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-10">Track workspace tasks</p>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-hide -mx-4 md:-mx-6 px-4 md:px-6">
        <div className="flex items-start gap-4 h-full pb-4 md:min-w-max max-md:snap-x max-md:snap-mandatory">
          {stages.map(stage => (
            <div 
              key={stage.id} 
              className="w-[85vw] md:w-[320px] shrink-0 max-md:snap-center h-full flex flex-col bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
              onDrop={(e) => handleDrop(e, stage.id)}
              onDragOver={handleDragOver}
            >
              <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900 shrink-0">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${stage.color} shadow-sm`} />
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm tracking-tight">{stage.label}</h3>
                  <span className="text-[10px] bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold border border-slate-200 dark:border-slate-700 shadow-sm">
                    {tasks.filter(t => t.status === stage.id).length}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => { setAddingToStage(stage.id); setNewTaskTitle(''); }}
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-200 rounded-md transition-colors"
                    title="Add Task"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-200 rounded-md transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 rounded-xl">
                      <DropdownMenuItem className="text-rose-500 font-medium text-xs focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-900/20" onClick={() => deleteStage(stage.id)}>
                        <Trash2 className="w-4 h-4 mr-2" /> Delete Column
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="p-3 flex-1 flex flex-col gap-3 overflow-y-auto scrollbar-thin">
                {addingToStage === stage.id && (
                  <form onSubmit={(e) => handleAddTask(e, stage.id)} className="bg-white dark:bg-slate-950 p-3 rounded-xl border-2 border-indigo-500/50 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <input
                      autoFocus
                      type="text"
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      placeholder="What needs to be done?"
                      className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none mb-3 font-medium"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button type="button" onClick={() => setAddingToStage(null)} className="px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Cancel</button>
                      <button type="submit" disabled={!newTaskTitle.trim()} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-bold transition-colors shadow-sm disabled:opacity-50">Add Task</button>
                    </div>
                  </form>
                )}

                {tasks.filter(t => t.status === stage.id).map(task => (
                  <div 
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-sm hover:shadow cursor-grab active:cursor-grabbing active:scale-[0.98] group transition-all relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className={`text-sm font-bold leading-snug ${task.status === 'done' ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                        {task.title}
                      </p>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-all shrink-0">
                          <MoreVertical className="w-4 h-4 text-slate-400" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl">
                          {stages.filter(s => s.id !== task.status).map(s => (
                            <DropdownMenuItem key={s.id} onClick={() => updateTaskStatus(task.id, s.id)} className="text-xs font-medium">
                              <Circle className={`w-3 h-3 mr-2 ${s.color.replace('bg-', 'text-')}`} /> Move to {s.label}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuItem onClick={() => deleteTask(task.id)} className="text-xs font-medium text-rose-500 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-900/20">
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete Task
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    {task.source === 'ai_generated' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500 mb-3 border border-amber-200 dark:border-amber-800/50">
                        <Sparkles className="w-2.5 h-2.5" /> AI Extracted
                      </span>
                    )}

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        {task.due_date && (
                          <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-500">
                            <CalendarIcon className="w-3 h-3 text-indigo-500" /> {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {task.assignee && (
                        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-2 border-white dark:border-slate-950 shadow-sm shrink-0" title={task.assignee.full_name}>
                          {task.assignee.avatar_url ? (
                            <img src={task.assignee.avatar_url} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[9px] font-bold text-slate-500">{task.assignee.full_name.charAt(0)}</span>
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
          <div className="w-[85vw] md:w-[320px] shrink-0 max-md:snap-center h-full flex flex-col pb-4">
            {!showAddStage ? (
              <button 
                onClick={() => setShowAddStage(true)}
                className="w-full h-12 flex items-center justify-center gap-2 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all font-bold text-sm shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Column
              </button>
            ) : (
              <form onSubmit={addStage} className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-sm p-4 animate-in fade-in slide-in-from-left-2">
                <input
                  autoFocus
                  type="text"
                  value={newStageName}
                  onChange={e => setNewStageName(e.target.value)}
                  placeholder="Column name"
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-lg px-3 py-2 text-sm mb-3 text-slate-900 dark:text-white font-medium outline-none transition-all"
                />
                <div className="flex gap-2 justify-end">
                  <button 
                    type="button"
                    onClick={() => { setShowAddStage(false); setNewStageName(''); }}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={!newStageName.trim()}
                    className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm rounded-lg disabled:opacity-50 transition-colors"
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
