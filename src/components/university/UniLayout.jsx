import React, { useState, useEffect} from 'react';
import { useTranslation} from 'react-i18next';
import { Link, useLocation} from 'react-router-dom';
import { 
 Search, Bell, Plus, Users, GraduationCap, BookOpen, 
 LayoutGrid, Calendar, FileText, CheckSquare, Building, 
 FlaskConical, Library, Home, DollarSign, Briefcase, 
 Network, BarChart2, Zap, Menu, X, ChevronRight, Settings, HelpCircle 
} from 'lucide-react';
import { useAuth} from '@/lib/AuthContext';
// import CommandPalette from './CommandPalette';
// import OrbitAIPanel from './OrbitAIPanel';

// Utility for classes
function cn(...classes) {
 return classes.filter(Boolean).join(' ');
}

const MODULES = [
 { id: 'dashboard', path: '/u/', name: 'Dashboard', icon: LayoutGrid, color: 'var(--primary)'},
 { id: 'students', path: '/u/students', name: 'Students', icon: Users, color: 'var(--primary)'},
 { id: 'admissions', path: '/u/admissions', name: 'Admissions', icon: CheckSquare, color: 'var(--primary)'},
 { id: 'academic', path: '/u/academic-structure', name: 'Academic Records', icon: FileText, color: 'var(--primary)'},
 { id: 'courses', path: '/u/courses', name: 'Courses', icon: Calendar, color: 'var(--primary)'},
 { id: 'lms', path: '/u/lms', name: 'Learning (LMS)', icon: BookOpen, color: 'var(--primary)'},
 { id: 'exams', path: '/u/exams', name: 'Examinations', icon: FileText, color: 'var(--primary)'},
 { id: 'faculty', path: '/u/faculties', name: 'Faculty', icon: GraduationCap, color: 'var(--primary)'},
 { id: 'research', path: '/u/research-activity', name: 'Research', icon: FlaskConical, color: 'var(--primary)'},
 { id: 'library', path: '/u/library', name: 'Library', icon: Library, color: 'var(--primary)'},
 { id: 'hostel', path: '/u/hostel', name: 'Hostel', icon: Home, color: 'var(--primary)'},
 { id: 'finance', path: '/u/finance', name: 'Finance', icon: DollarSign, color: 'var(--primary)'},
 { id: 'career', path: '/u/career-alumni', name: 'Career & Alumni', icon: Briefcase, color: 'var(--primary)'},
];

export default function UniLayout({ children}) {
 const { user} = useAuth();
 const location = useLocation();
 const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
 const [isCmdPaletteOpen, setCmdPaletteOpen] = useState(false);
 const [isContextPanelOpen, setContextPanelOpen] = useState(false);
 const [isOrbitAIOpen, setOrbitAIOpen] = useState(false);

 // Keyboard shortcut for Command Palette
 useEffect(() => {
 const handleKeyDown = (e) => {
 if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
 e.preventDefault();
 setCmdPaletteOpen(prev => !prev);
}
 if (e.key === 'Escape') {
 setContextPanelOpen(false);
}
};
 window.addEventListener('keydown', handleKeyDown);
 return () => window.removeEventListener('keydown', handleKeyDown);
}, []);

 const activeModule = MODULES.find(m => location.pathname === m.path) || MODULES[0];

 return (
 <div className="flex flex-col h-screen overflow-hidden bg-[var(--color-surface-1)] text-[var(--color-text-primary)] font-body">
 {/* COMMAND BAR (fixed top, 48px, blur-backdrop) */}
 <div className="h-12 shrink-0 flex items-center justify-between px-4 bg-[#0D0F12]/85 backdrop-blur-[20px] border-b border-primary/40 z-50">
 <div className="flex items-center gap-4">
 <div className="flex items-center gap-2">
 <div className="w-6 h-6 rounded-md bg-[var(--color-accent-primary)] flex items-center justify-center">
 <Building className="w-4 h-4 text-white" />
 </div>
 <span className="font-display font-semibold text-sm tracking-tight hidden md:inline">Slate</span>
 </div>
 <div className="h-4 w-px bg-[var(--color-border-strong)] mx-1" />
 <div className="flex items-center text-xs text-[var(--color-text-secondary)] tracking-[0.04em]">
 <span>University</span>
 <ChevronRight className="w-3 h-3 mx-1" />
 <span className="text-[var(--color-text-primary)]">{activeSlate.name}</span>
 </div>
 </div>

 <div className="flex-1 max-w-md mx-4">
 <button 
 onClick={() => setCmdPaletteOpen(true)}
 className="w-full flex items-center justify-between px-3 py-1.5 bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] border-[0.5px] border-black/9 dark:border-white/8 border-primary/40 rounded-lg text-sm text-[var(--color-text-secondary)] transition-colors"
 >
 <span className="flex items-center gap-2">
 <Search className="w-4 h-4" />
 <span>Search anything...</span>
 </span>
 <kbd className="hidden sm:inline-flex items-center gap-2 font-mono text-[10px] bg-[var(--color-surface-1)] px-1.5 py-0.5 rounded-md border-[0.5px] border-black/9 dark:border-white/8 border-primary/40">
 <span>⌘</span>K
 </kbd>
 </button>
 </div>

 <div className="flex items-center gap-3">
 <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-surface-3)] transition-colors text-[var(--color-text-secondary)]">
 <Plus className="w-4 h-4" />
 </button>
 <button className="relative w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-surface-3)] transition-colors text-[var(--color-text-secondary)]">
 <Bell className="w-4 h-4" />
 <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--color-danger)] rounded-full border-[0.5px] border-black/9 dark:border-white/8 border-[var(--color-surface-0)]" />
 </button>
 <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[var(--color-accent-primary)] to-[var(--primary)] flex items-center justify-center text-xs font-semibold text-white ml-2 tracking-[0.04em]">
 {user?.email?.substring(0, 2).toUpperCase() || 'AD'}
 </div>
 </div>
 </div>

 <div className="flex flex-1 overflow-hidden">
 {/* SIDEBAR */}
 <div className={cn(
 "shrink-0 bg-[var(--color-surface-0)] border-r border-primary/40 flex flex-col transition-all duration-300",
 isSidebarCollapsed ? "w-[60px]" : "w-[240px]"
 )}>
 {/* Collapse Toggle */}
 <div className="p-3 flex justify-end">
 <button 
 onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
 className="p-1 hover:bg-[var(--color-surface-2)] rounded-md text-[var(--color-text-secondary)]"
 >
 <Menu className="w-4 h-4" />
 </button>
 </div>

 <div className="flex-1 overflow-y-auto custom-scrollbar py-2 px-3 space-y-1">
 <div className={cn("text-xs tracking-widest text-[var(--color-text-tertiary)] uppercase mb-2 px-2", isSidebarCollapsed && "hidden")}>
 Modules
 </div>
 {MODULES.map(module => {
 const isActive = location.pathname === module.path || location.pathname.startsWith(module.path + '/');
 return (
 <Link
 key={module.id}
 to={module.path}
 className={cn(
 "flex items-center gap-3 px-2 py-2 rounded-lg transition-all duration-150 group",
 isActive 
 ? "bg-[var(--color-accent-subtle)] text-[var(--color-text-primary)] font-medium" 
 : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)]"
 )}
 style={{ borderLeft: isActive && !isSidebarCollapsed ? `3px solid ${module.color}` : '3px solid transparent'}}
 title={isSidebarCollapsed ? module.name : undefined}
 >
 <module.icon 
 className="w-[18px] h-[18px] shrink-0" 
 style={{ strokeWidth: 1.5, color: isActive ? module.color : 'inherit'}} 
 />
 {!isSidebarCollapsed && (
 <span className="truncate">{slate.name}</span>
 )}
 </Link>
 );
})}
 </div>

 {/* Sidebar Footer */}
 <div className="p-3 border-t border-primary/40 space-y-1">
 <button className="flex items-center gap-3 px-2 py-2 w-full rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)] transition-colors" title="Settings">
 <Settings className="w-[18px] h-[18px] shrink-0" style={{ strokeWidth: 1.5}} />
 {!isSidebarCollapsed && <span className="text-sm">Settings</span>}
 </button>
 <button className="flex items-center gap-3 px-2 py-2 w-full rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)] transition-colors" title="Help & Support">
 <HelpCircle className="w-[18px] h-[18px] shrink-0" style={{ strokeWidth: 1.5}} />
 {!isSidebarCollapsed && <span className="text-sm">Help & Support</span>}
 </button>
 <button 
 onClick={() => setOrbitAIOpen(!isOrbitAIOpen)}
 className="flex items-center gap-3 px-2 py-2 mt-2 w-full rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-3)] transition-colors border-[0.5px] border-black/9 dark:border-white/8 border-primary/40" 
 title="Orbit AI"
 >
 <div className="relative shrink-0">
 <Zap className="w-[18px] h-[18px] text-[var(--color-accent-primary)]" style={{ strokeWidth: 1.5}} />
 <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] animate-pulse" />
 </div>
 {!isSidebarCollapsed && <span className="text-sm font-medium">Orbit AI</span>}
 </button>
 </div>
 </div>

 {/* MAIN CONTENT AREA */}
 <div className="flex-1 flex flex-col relative overflow-hidden bg-[var(--color-surface-1)]">
 {/* TOPBAR (Module-specific, 56px) */}
 <div className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-primary/40 bg-[var(--color-surface-0)] z-10">
 <div className="flex items-center gap-3">
 <activeModule.icon className="w-6 h-6" style={{ color: activeModule.color}} />
 <h1 className="font-display text-xl font-semibold tracking-tight">{activeSlate.name}</h1>
 </div>
 <div className="flex items-center gap-2">
 {/* Optional module-level actions */}
 </div>
 </div>

 <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
 {children}
 </div>

 {/* CONTEXT PANEL (optional right slide-in) */}
 <div className={cn(
 "absolute top-0 right-0 bottom-0 w-[360px] bg-[var(--color-surface-2)] border-l border-primary/40 transform transition-transform duration-300 ease-out z-20",
 isContextPanelOpen ? "translate-x-0" : "translate-x-full"
 )}>
 <div className="h-14 flex items-center justify-between px-4 border-b border-primary/40">
 <h3 className="font-semibold">Context details</h3>
 <button onClick={() => setContextPanelOpen(false)} className="p-1 hover:bg-[var(--color-surface-3)] rounded-md text-[var(--color-text-secondary)]">
 <X className="w-4 h-4" />
 </button>
 </div>
 <div className="p-4">
 <p className="text-sm text-[var(--color-text-secondary)]">Details pane content will appear here.</p>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}
