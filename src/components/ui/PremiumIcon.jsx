import React from 'react';
import * as LucideIcons from 'lucide-react';

export function PremiumIcon({ name, className = ""}) {
 const IconComp = LucideIcons[name] || LucideIcons.Blocks;

 // Render specific premium SVG shapes for certain categories to make it look high-end
 const renderSvgBackground = () => {
 switch (name) {
 case 'Users':
 case 'User':
 return (
 <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-20">
 <defs>
 <linearGradient id="grad-users" x1="0%" y1="0%" x2="100%" y2="100%">
 <stop offset="0%" stopColor="#3b82f6" />
 <stop offset="100%" stopColor="#8b5cf6" />
 </linearGradient>
 </defs>
 <circle cx="50" cy="50" r="40" fill="url(#grad-users)" />
 </svg>
 );
 case 'Database':
 case 'Server':
 return (
 <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-20">
 <defs>
 <linearGradient id="grad-db" x1="0%" y1="0%" x2="100%" y2="100%">
 <stop offset="0%" stopColor="#10b981" />
 <stop offset="100%" stopColor="#059669" />
 </linearGradient>
 </defs>
 <rect x="20" y="20" width="60" height="60" rx="10" fill="url(#grad-db)" />
 </svg>
 );
 case 'Settings':
 case 'Tool':
 return (
 <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-20">
 <defs>
 <linearGradient id="grad-settings" x1="0%" y1="0%" x2="100%" y2="100%">
 <stop offset="0%" stopColor="#64748b" />
 <stop offset="100%" stopColor="#334155" />
 </linearGradient>
 </defs>
 <polygon points="50,10 90,30 90,70 50,90 10,70 10,30" fill="url(#grad-settings)" />
 </svg>
 );
 case 'Activity':
 case 'BarChart':
 case 'PieChart':
 case 'TrendingUp':
 return (
 <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-20">
 <defs>
 <linearGradient id="grad-chart" x1="0%" y1="0%" x2="100%" y2="100%">
 <stop offset="0%" stopColor="#f59e0b" />
 <stop offset="100%" stopColor="#ef4444" />
 </linearGradient>
 </defs>
 <path d="M10 90 L30 50 L50 70 L90 10" stroke="url(#grad-chart)" strokeWidth="20" fill="none" strokeLinecap="round" strokeLinejoin="round" />
 </svg>
 );
 case 'Book':
 case 'FileText':
 case 'Folder':
 return (
 <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-20">
 <defs>
 <linearGradient id="grad-doc" x1="0%" y1="0%" x2="100%" y2="100%">
 <stop offset="0%" stopColor="#06b6d4" />
 <stop offset="100%" stopColor="#3b82f6" />
 </linearGradient>
 </defs>
 <rect x="25" y="15" width="50" height="70" rx="5" fill="url(#grad-doc)" />
 </svg>
 );
 default:
 // Default glowing orb background
 return (
 <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-20 blur-sm">
 <defs>
 <linearGradient id="grad-default" x1="0%" y1="0%" x2="100%" y2="100%">
 <stop offset="0%" stopColor="#8b5cf6" />
 <stop offset="100%" stopColor="#ec4899" />
 </linearGradient>
 </defs>
 <circle cx="50" cy="50" r="35" fill="url(#grad-default)" />
 </svg>
 );
}
};

 const getGradientColors = () => {
 switch (name) {
 case 'Users': case 'User': return "from-primary to-primary";
 case 'Database': case 'Server': return "from-primary/70 to-primary";
 case 'Settings': case 'Tool': return "from-slate-500 to-slate-700";
 case 'Activity': case 'BarChart': case 'PieChart': case 'TrendingUp': return "from-amber-400 to-rose-500";
 case 'Book': case 'FileText': case 'Folder': return "from-primary/70 to-primary";
 default: return "from-primary to-primary";
}
};

 return (
 <div className={`relative flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${getGradientColors()} ${className}`}>
 {renderSvgBackground()}
 {/* Glossy overlay effect */}
 <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-50 mix-blend-overlay pointer-events-none"></div>
 
 {/* Icon itself */}
 <IconComp className="w-1/2 h-1/2 text-white relative z-10" strokeWidth={2.5} />
 </div>
 );
}
