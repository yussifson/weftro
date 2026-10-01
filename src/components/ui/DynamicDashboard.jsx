import React, { useMemo} from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';

export default function DynamicDashboard({ data, records, moduleDef}) {
 const items = data || records || [];
 // Simple data aggregation for charts
 const statusData = useMemo(() => {
 const counts = {};
 items.forEach(r => {
 const status = r.status || 'Active';
 counts[status] = (counts[status] || 0) + 1;
});
 return Object.keys(counts).map(key => ({ name: key, value: counts[key]}));
}, [data, records]);

 const timelineData = useMemo(() => {
 const counts = {};
 items.forEach(r => {
 const date = new Date(r.created_date || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric'});
 counts[date] = (counts[date] || 0) + 1;
});
 return Object.keys(counts).map(key => ({ date: key, count: counts[key]}));
}, [data, records]);

 return (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
 <Card className=" border-primary/40">
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-semibold text-foreground">Records by Status</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="h-[250px] w-full">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={statusData}>
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b'}} />
 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b'}} />
 <Tooltip cursor={{ fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
 <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 </CardContent>
 </Card>

 <Card className=" border-primary/40">
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-semibold text-foreground">Creation Timeline</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="h-[250px] w-full">
 <ResponsiveContainer width="100%" height="100%">
 <AreaChart data={timelineData}>
 <defs>
 <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
 <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
 <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
 </linearGradient>
 </defs>
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
 <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b'}} />
 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b'}} />
 <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
 <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
 </AreaChart>
 </ResponsiveContainer>
 </div>
 </CardContent>
 </Card>
 </div>
 );
}
