import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/api/supabaseClient';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, TerminalSquare, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';

export default function DeveloperLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const companyId = user?.user_metadata?.company_id || user?.company_id;

  useEffect(() => {
    if (companyId) {
      loadLogs();
    } else {
      setLoading(false);
    }
  }, [companyId]);

  const loadLogs = async () => {
    if (logs.length === 0) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clipad_v3_events')
        .select('*')
        .eq('company_id', companyId)
        .eq('source_domain', 'api_gateway')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error) {
        setLogs(data || []);
      }
    } catch (e) {
      console.warn('Failed to load api gateway audit logs:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-xs border-border">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              API Gateway Audit & Request Logs
            </CardTitle>
            <CardDescription className="text-xs">
              Live audit events recorded by the Weftro API gateway with sanitized correlation IDs.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs font-mono">{logs.length} Recent Events</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {loading ? (
          <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">
            Loading gateway audit logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-xl bg-secondary/20">
            No API activity recorded yet for your organization.
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const payload = log.payload || {};
              return (
                <div key={log.id} className="p-3 rounded-xl border border-border bg-card flex items-start justify-between gap-4 text-xs">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[10px] font-bold bg-primary/5 text-primary border-primary/20">
                        {log.event_type}
                      </Badge>
                      <code className="text-xs font-mono text-muted-foreground truncate">{payload.path || '/api/v1/*'}</code>
                    </div>
                    {payload.request_id && (
                      <p className="text-[11px] text-muted-foreground font-mono">
                        Req ID: <span className="text-foreground">{payload.request_id}</span>
                        {payload.latency_ms !== undefined && ` (${payload.latency_ms} ms)`}
                      </p>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground shrink-0 font-mono">
                    {new Date(log.created_at).toLocaleTimeString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
