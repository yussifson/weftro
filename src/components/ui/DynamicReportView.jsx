import React, { useState, useMemo} from 'react';
import { format} from 'date-fns';
import { Button} from '@/components/ui/button';
import { Badge} from '@/components/ui/badge';
import {
 BarChart3,
 TrendingUp,
 TrendingDown,
 Hash,
 Calendar,
 PieChart,
 Printer,
 FileText,
 ArrowUpRight,
 ArrowDownRight,
 Activity,
 Database,
 Layers,
 ChevronDown,
 ChevronUp} from 'lucide-react';

const CHART_COLORS = [
 '#6366f1', '#8b5cf6', '#a78bfa', '#c084fc',
 '#818cf8', '#7c3aed', '#6d28d9', '#5b21b6',
 '#4f46e5', '#4338ca', '#3730a3', '#312e81',
 '#fad503', '#06b6d4', '#14b8a6', '#10b981',
 '#22c55e', '#84cc16', '#eab308', '#f97316',
 '#ef4444', '#ec4899', '#f43f5e', '#e11d48',
];

function StatCard({ icon: Icon, label, value, subtitle, gradient, delay}) {
 return (
 <div
 className="relative overflow-hidden rounded-2xl border-[0.5px] border-black/9 dark:border-white/8 border-white/20 p-5 transition-all duration-300 hover:-translate-y-0.5"
 style={{
 background: gradient,
 animationDelay: `${delay}ms`}}
 >
 <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 -mr-8 -mt-8 bg-card hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200" />
 <div className="relative z-10">
 <div className="flex items-center justify-between mb-3">
 <div className="p-2 rounded-xl bg-card/20 backdrop-blur-sm hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200">
 <Icon className="w-5 h-5 text-white" />
 </div>
 {subtitle && (
 <span className="text-xs text-white/70 font-medium tracking-[0.04em]">{subtitle}</span>
 )}
 </div>
 <p className="text-2xl font-semibold text-white tracking-tight tracking-[-0.02em]">{value}</p>
 <p className="text-sm text-white/80 mt-1 font-medium">{label}</p>
 </div>
 </div>
 );
}

function HorizontalBarChart({ title, data, icon: Icon, maxVal}) {
 const [collapsed, setCollapsed] = useState(false);
 const total = data.reduce((sum, d) => sum + d.value, 0);

 return (
 <div className="bg-card rounded-2xl border-[0.5px] border-black/9 dark:border-white/8 border-primary/40 overflow-hidden transition-all duration-300  hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200">
 <button
 onClick={() => setCollapsed(!collapsed)}
 className="w-full flex items-center justify-between p-5 pb-4 hover:bg-muted/50/50 transition-colors"
 >
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-xl bg-gradient-to-br from-primary/5 to-primary/5 border-[0.5px] border-black/9 dark:border-white/8 border-primary/40">
 <Icon className="w-4 h-4 text-primary" />
 </div>
 <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
 <Badge variant="secondary" className="text-xs font-medium tracking-[0.04em]">
 {data.length} categories
 </Badge>
 </div>
 {collapsed ? (
 <ChevronDown className="w-4 h-4 text-[#71717a] dark:text-gray-400" />
 ) : (
 <ChevronUp className="w-4 h-4 text-[#71717a] dark:text-gray-400" />
 )}
 </button>

 {!collapsed && (
 <div className="px-5 pb-5 space-y-3">
 {data.map((item, idx) => {
 const pct = maxVal > 0 ? (item.value / maxVal) * 100 : 0;
 const color = CHART_COLORS[idx % CHART_COLORS.length];
 return (
 <div key={item.label} className="group">
 <div className="flex items-center justify-between mb-1.5">
 <div className="flex items-center gap-2">
 <div
 className="w-2.5 h-2.5 rounded-full flex-shrink-0"
 style={{ backgroundColor: color}}
 />
 <span className="text-sm text-foreground font-medium truncate max-w-[200px]">
 {item.label || '(empty)'}
 </span>
 </div>
 <div className="flex items-center gap-2">
 <span className="text-sm font-semibold text-foreground">{item.value}</span>
 <span className="text-xs text-[#71717a] dark:text-gray-400 tracking-[0.04em]">
 ({total > 0 ? Math.round((item.value / total) * 100) : 0}%)
 </span>
 </div>
 </div>
 <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
 <div
 className="h-full rounded-full transition-all duration-700 ease-out"
 style={{
 width: `${pct}%`,
 background: `linear-gradient(90deg, ${color}, ${color}dd)`}}
 />
 </div>
 </div>
 );
})}
 </div>
 )}
 </div>
 );
}

function NumberAggCard({ fieldName, stats}) {
 const label = fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
 return (
 <div className="bg-card rounded-2xl border-[0.5px] border-black/9 dark:border-white/8 border-primary/40 p-5 transition-all duration-300  hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-shadow duration-200">
 <div className="flex items-center gap-3 mb-4">
 <div className="p-2 rounded-xl bg-gradient-to-br from-primary/5 to-primary/5 border-[0.5px] border-black/9 dark:border-white/8 border-primary/40">
 <Hash className="w-4 h-4 text-primary" />
 </div>
 <h3 className="text-sm font-semibold text-slate-800">{label}</h3>
 </div>
 <div className="grid grid-cols-2 gap-3">
 {[
 { k: 'Sum', v: stats.sum, icon: TrendingUp, color: 'text-primary bg-muted/50'},
 { k: 'Average', v: stats.avg, icon: Activity, color: 'text-primary bg-muted/50'},
 { k: 'Min', v: stats.min, icon: ArrowDownRight, color: 'text-amber-600 bg-amber-50'},
 { k: 'Max', v: stats.max, icon: ArrowUpRight, color: 'text-primary bg-muted/50'},
 ].map(({ k, v, icon: Ic, color}) => (
 <div
 key={k}
 className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/50/80 border-[0.5px] border-black/9 dark:border-white/8 border-primary/40"
 >
 <div className={`p-1.5 rounded-xl ${color}`}>
 <Ic className="w-3.5 h-3.5" />
 </div>
 <div>
 <p className="text-[10px] uppercase tracking-wider text-[#71717a] dark:text-gray-400 font-semibold tracking-[0.04em]">{k}</p>
 <p className="text-sm font-semibold text-foreground">
 {typeof v === 'number' ? (Number.isInteger(v) ? v.toLocaleString() : v.toFixed(2)) : '-'}
 </p>
 </div>
 </div>
 ))}
 </div>
 </div>
 );
}

function DateDistribution({ fieldName, data}) {
 const label = fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

 const monthly = useMemo(() => {
 const months = {};
 data.forEach(d => {
 const val = d.data?.[fieldName];
 if (!val) return;
 try {
 const key = format(new Date(val), 'MMM yyyy');
 months[key] = (months[key] || 0) + 1;
} catch {}
});
 return Object.entries(months)
 .map(([label, value]) => ({ label, value}))
 .sort((a, b) => a.label.localeCompare(b.label));
}, [data, fieldName]);

 if (monthly.length === 0) return null;
 const max = Math.max(...monthly.map(m => m.value));

 return (
 <HorizontalBarChart
 title={`${label} Distribution`}
 data={monthly}
 icon={Calendar}
 maxVal={max}
 />
 );
}

export default function DynamicReportView({ data = [], fieldDefinitions = [], onRefresh, moduleDef}) {
 const [isPrintMode, setIsPrintMode] = useState(false);

 const selectFields = useMemo(
 () => fieldDefinitions.filter(f => f.field_type === 'select'),
 [fieldDefinitions]
 );
 const numberFields = useMemo(
 () => fieldDefinitions.filter(f => f.field_type === 'number'),
 [fieldDefinitions]
 );
 const dateFields = useMemo(
 () => fieldDefinitions.filter(f => f.field_type === 'date'),
 [fieldDefinitions]
 );
 const booleanFields = useMemo(
 () => fieldDefinitions.filter(f => f.field_type === 'boolean'),
 [fieldDefinitions]
 );

 // Select field breakdowns
 const selectBreakdowns = useMemo(() => {
 return selectFields.map(f => {
 const counts = {};
 data.forEach(r => {
 const val = r.data?.[f.name] || '(empty)';
 counts[val] = (counts[val] || 0) + 1;
});
 const items = Object.entries(counts)
 .map(([label, value]) => ({ label, value}))
 .sort((a, b) => b.value - a.value);
 const max = items.length > 0 ? Math.max(...items.map(i => i.value)) : 0;
 return { field: f, items, max};
});
}, [selectFields, data]);

 // Number field aggregations
 const numberAggs = useMemo(() => {
 return numberFields.map(f => {
 const vals = data
 .map(r => parseFloat(r.data?.[f.name]))
 .filter(v => !isNaN(v));
 if (vals.length === 0) {
 return { field: f, stats: { sum: 0, avg: 0, min: 0, max: 0, count: 0}};
}
 return {
 field: f,
 stats: {
 sum: vals.reduce((a, b) => a + b, 0),
 avg: vals.reduce((a, b) => a + b, 0) / vals.length,
 min: Math.min(...vals),
 max: Math.max(...vals),
 count: vals.length}};
});
}, [numberFields, data]);

 // Boolean field stats
 const booleanStats = useMemo(() => {
 return booleanFields.map(f => {
 let trueCount = 0;
 let falseCount = 0;
 data.forEach(r => {
 const val = r.data?.[f.name];
 if (val === true || val === 'true') trueCount++;
 else falseCount++;
});
 return {
 field: f,
 items: [
 { label: 'Yes', value: trueCount},
 { label: 'No', value: falseCount},
 ],
 max: Math.max(trueCount, falseCount)};
});
}, [booleanFields, data]);

 // Date range
 const dateRange = useMemo(() => {
 if (data.length === 0) return null;
 const dates = data
 .map(r => new Date(r.created_at))
 .filter(d => !isNaN(d.getTime()))
 .sort((a, b) => a - b);
 if (dates.length === 0) return null;
 return {
 earliest: dates[0],
 latest: dates[dates.length - 1]};
}, [data]);

 const handlePrint = () => {
 setIsPrintMode(true);
 setTimeout(() => {
 window.print();
 setIsPrintMode(false);
}, 300);
};

 if (!data || data.length === 0) {
 return (
 <div className="flex flex-col items-center justify-center py-20 text-center">
 <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border-[0.5px] border-black/9 dark:border-white/8 border-primary/40 mb-5">
 <BarChart3 className="w-12 h-12 text-slate-300" />
 </div>
 <h3 className="text-lg font-semibold text-foreground mb-2">No Data to Analyze</h3>
 <p className="text-sm text-[#71717a] dark:text-gray-400 max-w-sm">
 Add some records to see auto-generated statistics, breakdowns, and distribution charts.
 </p>
 </div>
 );
}

 const moduleName = moduleDef?.name || 'Module';

 return (
 <div className={`space-y-6 ${isPrintMode ? 'print-mode' : ''}`}>
 {/* Header */}
 <div className="flex items-center justify-between flex-wrap gap-4">
 <div className="flex items-center gap-3">
 <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary -indigo-200">
 <BarChart3 className="w-5 h-5 text-white" />
 </div>
 <div>
 <h2 className="text-xl font-semibold text-foreground tracking-tight">
 {moduleName} Report
 </h2>
 <p className="text-xs text-[#71717a] dark:text-gray-400 mt-0.5 tracking-[0.04em]">
 Auto-generated analytics •{' '}
 {dateRange
 ? `${format(dateRange.earliest, 'MMM d, yyyy')} — ${format(dateRange.latest, 'MMM d, yyyy')}`
 : 'All time'}
 </p>
 </div>
 </div>
 <Button
 variant="outline"
 onClick={handlePrint}
 className="gap-2 text-[#71717a] dark:text-gray-400 border-primary/40 hover:bg-muted/50 "
 >
 <Printer className="w-4 h-4" />
 Print Report
 </Button>
 </div>

 {/* Summary Stats */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 <StatCard
 icon={Database}
 label="Total Records"
 value={data.length.toLocaleString()}
 subtitle="All time"
 gradient="linear-gradient(135deg, #6366f1, #8b5cf6)"
 delay={0}
 />
 <StatCard
 icon={Layers}
 label="Data Fields"
 value={fieldDefinitions.length}
 subtitle={`${selectFields.length} categorical`}
 gradient="linear-gradient(135deg, #fad503, #06b6d4)"
 delay={50}
 />
 <StatCard
 icon={FileText}
 label="Fill Rate"
 value={(() => {
 const totalSlots = data.length * fieldDefinitions.length;
 if (totalSlots === 0) return '0%';
 let filled = 0;
 data.forEach(r => {
 fieldDefinitions.forEach(f => {
 const v = r.data?.[f.name];
 if (v !== null && v !== undefined && v !== '') filled++;
});
});
 return Math.round((filled / totalSlots) * 100) + '%';
})()}
 subtitle="Data completeness"
 gradient="linear-gradient(135deg, #10b981, #14b8a6)"
 delay={100}
 />
 <StatCard
 icon={Calendar}
 label="Latest Entry"
 value={
 dateRange
 ? format(dateRange.latest, 'MMM d')
 : '-'
}
 subtitle={dateRange ? format(dateRange.latest, 'yyyy') : ''}
 gradient="linear-gradient(135deg, #f97316, #ef4444)"
 delay={150}
 />
 </div>

 {/* Select Field Breakdowns */}
 {selectBreakdowns.length > 0 && (
 <div>
 <h3 className="text-sm font-semibold text-[#71717a] dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2 tracking-[0.04em]">
 <PieChart className="w-4 h-4" />
 Categorical Breakdowns
 </h3>
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
 {selectBreakdowns.map(sb => (
 <HorizontalBarChart
 key={sb.field.name}
 title={sb.field.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
 data={sb.items}
 icon={PieChart}
 maxVal={sb.max}
 />
 ))}
 </div>
 </div>
 )}

 {/* Boolean Breakdowns */}
 {booleanStats.length > 0 && (
 <div>
 <h3 className="text-sm font-semibold text-[#71717a] dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2 tracking-[0.04em]">
 <Activity className="w-4 h-4" />
 Boolean Fields
 </h3>
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
 {booleanStats.map(bs => (
 <HorizontalBarChart
 key={bs.field.name}
 title={bs.field.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
 data={bs.items}
 icon={Activity}
 maxVal={bs.max}
 />
 ))}
 </div>
 </div>
 )}

 {/* Number Aggregations */}
 {numberAggs.length > 0 && (
 <div>
 <h3 className="text-sm font-semibold text-[#71717a] dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2 tracking-[0.04em]">
 <TrendingUp className="w-4 h-4" />
 Numeric Summaries
 </h3>
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
 {numberAggs.map(na => (
 <NumberAggCard
 key={na.field.name}
 fieldName={na.field.name}
 stats={na.stats}
 />
 ))}
 </div>
 </div>
 )}

 {/* Date Distributions */}
 {dateFields.length > 0 && (
 <div>
 <h3 className="text-sm font-semibold text-[#71717a] dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2 tracking-[0.04em]">
 <Calendar className="w-4 h-4" />
 Date Distributions
 </h3>
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
 {dateFields.map(f => (
 <DateDistribution key={f.name} fieldName={f.name} data={data} />
 ))}
 </div>
 </div>
 )}

 {/* Print Stylesheet */}
 <style>{`
 @media print {
 body * { visibility: hidden;}
 .print-mode, .print-mode * { visibility: visible;}
 .print-mode { position: absolute; left: 0; top: 0; width: 100%;}
 button { display: none !important;}
}
 `}</style>
 </div>
 );
}
