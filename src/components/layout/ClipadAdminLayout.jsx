import React, { useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Building2, Tags, ShieldAlert, BrainCircuit, ArrowLeft, LogOut, Headset, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function ClipadAdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  useEffect(() => {
    if (user && user.role !== 'super_admin') {
      navigate('/');
    }
  }, [user, navigate]);

  if (!user || user.role !== 'super_admin') {
    return null;
  }

  const basePath = window.location.pathname.startsWith('/clipad') ? '/clipad/admin' : '/admin';
  
  const menuItems = [
    { name: 'Overview', icon: LayoutDashboard, path: basePath },
    { name: 'Live Support', icon: Headset, path: `${basePath}/support` },
    { name: 'Companies', icon: Building2, path: `${basePath}/companies` },
    { name: 'Pricing & Plans', icon: Tags, path: `${basePath}/pricing` },
    { name: 'Custom Requests', icon: Sparkles, path: `${basePath}/custom-requests` },
    { name: 'Audit Monitor', icon: ShieldAlert, path: `${basePath}/audit` },
    { name: 'Admin AI', icon: BrainCircuit, path: `${basePath}/ai` },
  ];

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[#f8fafc] text-[#0f172a]">
      
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-[#006065] text-white flex flex-col hidden md:flex shadow-xl">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-black text-white">CliPad Super Admin</h2>
          <p className="text-xs text-[#fad503] font-bold uppercase tracking-wider mt-1">Management Console</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === basePath}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-[#00beac] text-white shadow-md'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <button 
            onClick={() => navigate('/clipad')}
            className="flex items-center w-full gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Exit Admin
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center w-full gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-rose-300 hover:bg-rose-500/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto relative z-30 page-enter bg-[#f8fafc] text-[#0f172a] scrollbar-thin">
        <div className="md:hidden p-4 border-b border-slate-800 bg-[#006065] text-white flex items-center justify-between">
            <h2 className="text-lg font-black text-white">CliPad Admin</h2>
            <button onClick={() => navigate('/dashboard')}><ArrowLeft className="w-5 h-5 text-white"/></button>
        </div>
        <div className={`flex-1 w-full ${location.pathname.endsWith('/ai') ? 'p-0' : 'p-6 md:p-8 max-w-7xl mx-auto'}`}>
            <Outlet />
        </div>
      </main>
    </div>
  );
}
