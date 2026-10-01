import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as CalendarIcon, Clock, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
import SchedulingLinkManager from './SchedulingLinkManager';

export default function SpaceCalendar({ spaceId, user }) {
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (spaceId) {
      fetchCalendarData();
    }
  }, [spaceId]);

  const fetchCalendarData = async () => {
    setLoading(true);
    
    // Fetch events
    const { data: eventsData } = await supabase
      .from('clipad_calendar_events')
      .select('*')
      .eq('space_id', spaceId)
      .order('start_time', { ascending: true });
      
    // Fetch tasks with due dates (requires finding the board first since tasks don't have space_id directly)
    const { data: board } = await supabase
      .from('clipad_task_boards')
      .select('id')
      .eq('space_id', spaceId)
      .limit(1)
      .single();
      
    let tasksData = [];
    if (board && board.id) {
      const { data } = await supabase
        .from('clipad_tasks')
        .select('*')
        .eq('board_id', board.id)
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true });
      tasksData = data;
    }
      
    setEvents(eventsData || []);
    setTasks(tasksData || []);
    setLoading(false);
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatDate = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-full h-full flex flex-col p-6 overflow-hidden bg-background">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Calendar & Scheduling</h2>
        <p className="text-muted-foreground">Manage your upcoming events, tasks, and booking links.</p>
      </div>

      <Tabs defaultValue="upcoming" className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full max-w-md grid grid-cols-2 mb-6">
          <TabsTrigger value="upcoming">
            <CalendarIcon className="w-4 h-4 mr-2" />
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="links">
            <LinkIcon className="w-4 h-4 mr-2" />
            Scheduling Links
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="flex-1 overflow-y-auto pr-2 pb-10">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="text-sm text-muted-foreground">Loading calendar...</div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8">
              {/* Events Column */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-primary" />
                  Upcoming Events
                </h3>
                
                {events.length === 0 ? (
                  <div className="p-6 border rounded-lg bg-muted/20 text-center">
                    <p className="text-muted-foreground text-sm">No upcoming events scheduled.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {events.map(event => (
                      <div key={event.id} className="p-4 border rounded-lg bg-card shadow-sm flex flex-col transition-all hover:shadow-md">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium leading-none">{event.title}</h4>
                          <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded">
                            {formatDate(event.start_time)}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center mt-1">
                          <Clock className="w-3.5 h-3.5 mr-1.5" />
                          {formatTime(event.start_time)} - {formatTime(event.end_time)}
                        </div>
                        {event.description && (
                          <p className="text-sm mt-3 line-clamp-2 text-muted-foreground">{event.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tasks Column */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center">
                  <CheckCircle2 className="w-5 h-5 mr-2 text-primary" />
                  Due Tasks
                </h3>
                
                {tasks.length === 0 ? (
                  <div className="p-6 border rounded-lg bg-muted/20 text-center">
                    <p className="text-muted-foreground text-sm">No tasks with upcoming due dates.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tasks.map(task => (
                      <div key={task.id} className="p-4 border rounded-lg bg-card shadow-sm transition-all hover:shadow-md">
                        <div className="flex justify-between items-start">
                          <div className="flex items-start space-x-3">
                            <div className={`mt-0.5 w-4 h-4 rounded-full border flex-shrink-0 ${task.status === 'completed' ? 'bg-primary border-primary' : 'border-muted-foreground'}`} />
                            <div>
                              <h4 className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                                {task.title}
                              </h4>
                              <p className="text-sm text-muted-foreground mt-1 flex items-center">
                                <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
                                {formatDate(task.due_date)} {formatTime(task.due_date)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="links" className="flex-1 overflow-y-auto">
          <div className="max-w-3xl">
            <SchedulingLinkManager spaceId={spaceId} user={user} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
