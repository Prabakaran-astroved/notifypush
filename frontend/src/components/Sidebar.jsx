import React from 'react';
import { 
  Bell, 
  Send, 
  Layers, 
  Settings, 
  BarChart2, 
  Users, 
  ChevronRight, 
  Sparkles,
  ExternalLink,
  LogOut,
  User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ currentView, setCurrentView }) {
  const { user, logout } = useAuth();
  const menuItems = [
    {
      id: 'campaigns',
      name: 'Subscriber ID Campaigns',
      icon: Send,
      parent: 'Webpushr',
      badge: 'Active'
    },
    {
      id: 'create',
      name: 'Create Campaign',
      icon: Sparkles,
      parent: 'Webpushr'
    },
    {
      id: 'segment',
      name: 'Notification Test Studio',
      icon: Users,
      parent: 'Webpushr',
      badge: 'Test'
    },
    {
      id: 'settings',
      name: 'Settings & Config',
      icon: Settings,
      parent: 'Webpushr'
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center space-x-3 bg-slate-950">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 font-bold text-xl">
          AV
        </div>
        <div>
          <h1 className="font-bold text-white text-base tracking-tight leading-tight">AstroVed PushHub</h1>
          <p className="text-xs text-orange-400 font-medium">Notification Studio</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-6 px-3 space-y-6">
        <div>
          <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Webpushr Module
          </div>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id || (item.id === 'campaigns' && (currentView === 'details' || currentView === 'edit'));
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/10'
                      : 'hover:bg-slate-800 hover:text-white text-slate-400'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 font-semibold border border-amber-500/20">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div>
          <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Platform Info
          </div>
          <div className="px-3.5 py-3 rounded-lg bg-slate-800/60 border border-slate-700/50 text-xs text-slate-400 space-y-2">
            <div className="flex justify-between items-center text-slate-300">
              <span className="font-medium">Webpushr API</span>
              <span className="inline-flex items-center text-emerald-400 font-semibold text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                Connected
              </span>
            </div>
            <div className="text-[11px] text-slate-400 leading-relaxed">
              Targeting individual subscriber IDs via official SID endpoints.
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info & User */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        {user && (
          <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <div className="flex items-center space-x-2 truncate">
              <div className="w-7 h-7 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-white truncate">{user.name}</div>
                <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="text-[11px] text-slate-400 text-center">
          AstroVed PushHub v2.0 • 2026
        </div>
      </div>
    </aside>
  );
}
