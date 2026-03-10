import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import {
  LayoutDashboard, Users, Briefcase, FileText, AlertCircle, ShieldCheck,
  Settings, Bell, Search, LogOut, Menu, X, ChevronRight, Globe, ClipboardList, User as UserIcon, Sparkles, Workflow, Calendar, Link2, BookOpen, BarChart3, History
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Role, isInternalRole } from '../types';
import { Button } from '@/components/ui/UIComponents';
import { DateTimeDisplay } from './DateTimeDisplay';
import { SearchResults } from './SearchResults';
import { NotificationsDrawer } from './NotificationsDrawer';
import { OnboardingWizard } from './OnboardingWizard';
import { ChangelogModal } from './ChangelogModal';
import { useAI } from '../contexts/AIContext';
import { api } from '../services/api';

const API_WS_URL = import.meta.env.VITE_API_URL || '';

const SidebarItem = ({ to, icon: Icon, label, onClick }: any) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) => `
      flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group
      ${isActive
        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)]'
        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}
    `}
  >
    <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
    <span className="font-medium text-sm">{label}</span>
    <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity rtl:rotate-180" />
  </NavLink>
);

export const Layout: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, logout, impersonateUser } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { openAI } = useAI();
  const navigate = useNavigate();
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [orgBranding, setOrgBranding] = useState<{ logo?: string | null; primaryColor?: string | null; accentColor?: string | null } | null>(null);

  useEffect(() => {
    const theme = localStorage.getItem('arena360_theme') || 'dark';
    document.documentElement.classList.toggle('theme-light', theme === 'light');
  }, []);

  useEffect(() => {
    if (!user) return;
    api.org.get().then((o: any) => {
      setOrgBranding({ logo: o.logo, primaryColor: o.primaryColor, accentColor: o.accentColor });
      const root = document.documentElement.style;
      if (o.primaryColor) root.setProperty('--brand-primary', o.primaryColor);
      if (o.accentColor) root.setProperty('--brand-accent', o.accentColor);
    }).catch(() => { });
  }, [user]);

  const loadNotificationCount = async () => {
    try {
      const res = await api.notifications.count();
      setNotificationUnreadCount((res as { count: number }).count ?? 0);
    } catch {
      // ignore
    }
  };

  const socketRef = useRef<Socket | null>(null);
  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    // Defer connection so React StrictMode's double-mount doesn't trigger "closed before connection established"
    const t = window.setTimeout(() => {
      const socket = io(API_WS_URL, {
        path: '/ws',
        auth: { token },
        transports: ['websocket', 'polling'],
      });
      socketRef.current = socket;
      socket.on('notification', () => {
        setNotificationUnreadCount((c) => c + 1);
      });
      socket.on('connect_error', () => {
        // Fallback to polling only; count is already loaded
      });
    }, 150);
    return () => {
      window.clearTimeout(t);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user]);

  useEffect(() => {
    loadNotificationCount();
    const interval = setInterval(loadNotificationCount, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);


  const toggleLang = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
    document.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleImpersonate = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    await impersonateUser(e.target.value);
    navigate('/app/dashboard');
  };

  const menuItems = [
    { to: '/app/dashboard', icon: LayoutDashboard, label: t('dashboard') },
  ];

  if (user && isInternalRole(user.role)) {
    menuItems.push({ to: '/app/my-work', icon: ClipboardList, label: t('my_work') });
    menuItems.push({ to: '/app/calendar', icon: Calendar, label: t('calendar') || 'Calendar' });
  }

  menuItems.push(
    { to: '/app/clients', icon: Users, label: t('clients') },
    { to: '/app/projects', icon: Briefcase, label: t('projects') },
    { to: '/app/reports', icon: FileText, label: t('reports') },
    { to: '/app/findings', icon: AlertCircle, label: t('findings') },
    ...(user && isInternalRole(user.role) ? [
      { to: '/app/wiki', icon: BookOpen, label: t('wiki') || 'Wiki' },
      { to: '/app/analytics', icon: BarChart3, label: t('analytics') || 'Analytics' },
      { to: '/app/automations', icon: Workflow, label: t('automations') || 'Automations' },
      { to: '/app/integrations', icon: Link2, label: t('integrations') || 'Integrations' },
    ] : [])
  );

  if (user?.role === Role.SUPER_ADMIN) {
    menuItems.push({ to: '/app/admin/users', icon: ShieldCheck, label: t('admin') });
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans selection:bg-cyan-500/30">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyan-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/10 rounded-full blur-[120px]" />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 bg-slate-900/80 backdrop-blur-xl border-r border-slate-800
        transform transition-transform duration-300 lg:transform-none flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 rtl:translate-x-full rtl:lg:translate-x-0'}
      `}>
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="h-[38px] flex items-center justify-center">
            {orgBranding?.logo ? (
              <img src={orgBranding.logo} alt="Logo" className="h-full object-contain max-w-[140px]" />
            ) : (
              <img
                src="/arenalogo.png"
                alt="Arena logo"
                className="h-full object-contain"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
            )}
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-slate-400">
            <X />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <SidebarItem key={item.to} {...item} onClick={() => setSidebarOpen(false)} />
          ))}

          <div className="mt-8 pt-4 border-t border-slate-800">
            <SidebarItem to="/app/settings" icon={Settings} label={t('settings')} onClick={() => setSidebarOpen(false)} />
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-700/50 bg-slate-800/30">
            <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}&background=0d9488&color=fff`} className="w-10 h-10 rounded-full border-2 border-slate-600" alt="Profile" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate capitalize">{user?.role.replace(/_/g, ' ')}</p>
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-400 mr-4">
            <Menu />
          </button>

          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="relative w-full max-w-md hidden md:flex items-center gap-2 bg-slate-950/50 border border-slate-700 rounded-full py-2 pl-4 pr-4 text-sm text-slate-400 hover:border-slate-600"
            >
              <Search className="w-4 h-4 shrink-0 rtl:order-2" />
              <span>{t('search')}</span>
              <kbd className="ml-auto hidden sm:inline px-2 py-0.5 text-xs bg-slate-800 rounded">Ctrl+K</kbd>
            </button>
          </div>
          <SearchResults open={searchOpen} onClose={() => setSearchOpen(false)} />

          <div className="flex items-center gap-4 flex-1 justify-center">
            <DateTimeDisplay />
          </div>

          <div className="flex items-center gap-4">


            <button type="button" onClick={() => openAI()} className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-full transition-all" title="AI Assistant">
              <Sparkles className="w-5 h-5" />
            </button>
            <button onClick={toggleLang} className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-full transition-all">
              <span className="font-bold text-xs flex items-center gap-2">
                <Globe className="w-4 h-4" />
                {i18n.language.toUpperCase()}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setNotificationDrawerOpen(true)}
              className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-full transition-all relative"
              title={t('notifications')}
            >
              <Bell className="w-5 h-5" />
              {notificationUnreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-medium bg-rose-500 text-white rounded-full">
                  {notificationUnreadCount > 99 ? '99+' : notificationUnreadCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setChangelogOpen(true)}
              className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-full transition-all"
              title="Changelog"
            >
              <History className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 w-full min-w-0 overflow-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          <div className="w-full px-6 py-6 space-y-8 animate-in fade-in duration-500">
            <Outlet />
          </div>
        </main>
      </div>
      {user?.role === Role.SUPER_ADMIN && <OnboardingWizard />}
      {/* Portals: rendered at top-level to avoid z-index / stacking context issues */}
      <ChangelogModal open={changelogOpen} onClose={() => setChangelogOpen(false)} />
      <NotificationsDrawer
        open={notificationDrawerOpen}
        onClose={() => { setNotificationDrawerOpen(false); loadNotificationCount(); }}
      />
    </div>
  );
};
