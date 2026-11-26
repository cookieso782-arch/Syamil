import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import {
  Landmark,
  LayoutDashboard,
  Wallet,
  Boxes,
  CalendarCheck,
  HeartHandshake,
  FileText,
  UserCog,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  ChevronDown,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  nextPrayer: { name: string; time: string; minutesRemaining: number };
  hijriDate: string;
  mosqueName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
  mosqueName,
}) => {
  const { user, logout, allowedMenus } = useAuth();
  const { themeConfig } = useTheme();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isUserMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

  useEffect(() => {
    if (!isMobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileOpen(false);
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileOpen, setIsMobileOpen]);

  interface NavItem {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }

  const ALL_NAV_ITEMS: NavItem[] = [
    { id: 'dashboard', label: 'Beranda & Sholat', icon: LayoutDashboard },
    { id: 'users', label: 'Manajemen Pengguna', icon: UserCog },
    { id: 'letters', label: 'Surat & Administrasi', icon: FileText },
    { id: 'inventory', label: 'Inventaris & Aset', icon: Boxes },
    { id: 'finance', label: 'Buku Kas Keuangan', icon: Wallet },
    { id: 'zakat', label: 'Zakat & Mustahik', icon: HeartHandshake },
    { id: 'friday_kajian', label: "Jum'at & Kajian", icon: CalendarCheck },
    { id: 'settings', label: 'Profil & Pengaturan', icon: Settings },
  ];

  // Dynamic menu filtering strictly adhering to user role specifications:
  // - sekretaris: dashboard, surat & administrasi, inventaris & aset
  // - bendahara: dashboard, buku kas keuangan, zakat & mustahik
  // - humas: dashboard, jum'at dan kajian
  // - admin: full access to all menus
  const navItems = ALL_NAV_ITEMS.filter((item) => allowedMenus.includes(item.id));

  const roleColors: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300',
    super_admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300',
    bendahara: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300',
    sekretaris: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300',
    humas: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
    marbot: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
    jamaah: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
  };

  const renderSidebarContent = (collapsed: boolean) => (
    <div className="flex flex-col h-full select-none">
      {/* Brand Header */}
      <div className={`p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center ${
        collapsed ? 'justify-center' : 'justify-between'
      }`}>
        <button
          onClick={() => {
            setActiveTab('dashboard');
            setIsMobileOpen(false);
          }}
          className="flex items-center gap-3 text-left focus:outline-none group overflow-hidden min-w-0"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white shadow-md shadow-emerald-700/20 group-hover:scale-105 transition-transform flex-shrink-0">
            <Landmark className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-emerald-600 to-teal-700 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
                  SYAMIL
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate -mt-0.5">
                {mosqueName || "Masjid Jami' Al-Barkah"}
              </p>
            </div>
          )}
        </button>

        {/* Mobile close button */}
        <button
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0 cursor-pointer"
          aria-label="Tutup Menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Menu List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {!collapsed && (
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 pb-1">
            Menu Utama
          </div>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsMobileOpen(false);
              }}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left font-medium transition-all group relative cursor-pointer ${
                isActive
                  ? `${themeConfig.buttonPrimary} shadow-md`
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
              } ${collapsed ? 'justify-center px-2' : ''}`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${
                isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'
              }`} />

              {!collapsed && (
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <span className="text-sm font-semibold truncate leading-tight">{item.label}</span>
                  {item.badge && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </div>
              )}

              {/* Active Indicator Bar on Collapsed */}
              {collapsed && isActive && (
                <div className="absolute right-0 top-2 bottom-2 w-1 bg-white rounded-l-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* User Profile Card & Desktop Collapse Toggle */}
      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2 pb-safe">
        {/* User Card */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className={`w-full flex items-center gap-2.5 p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer ${
              collapsed ? 'justify-center p-1.5' : ''
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center ring-2 ring-emerald-500/20 flex-shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>

            {!collapsed && (
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                  {user?.name || 'Tamu'}
                </p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold truncate">
                  {user?.roleLabel.split('(')[0] || 'Jamaah'}
                </p>
              </div>
            )}

            {!collapsed && (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            )}
          </button>

          {/* Quick Role Switcher Popover */}
          {isUserMenuOpen && (
            <div className={`absolute bottom-full mb-2 ${
              collapsed ? 'left-14 w-64' : 'left-0 right-0'
            } rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95`}>
              <div className="border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Login Aktif:</p>
                <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 truncate">{user?.name}</p>
                <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${user ? roleColors[user.role] : ''}`}>
                  {user?.roleLabel}
                </span>
              </div>

              <div className="pt-1">
                <button
                  onClick={() => {
                    logout();
                    setIsUserMenuOpen(false);
                    setIsMobileOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 p-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors font-semibold cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Keluar Sesi
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Collapse / Expand Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex w-full items-center justify-center gap-2 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
          title={collapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-[11px]">Ciutkan Menu</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Sticky left) */}
      <aside
        className={`hidden lg:flex flex-col sticky top-0 h-screen border-r transition-all duration-300 z-30 ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${themeConfig.navStyle}`}
      >
        {renderSidebarContent(isCollapsed)}
      </aside>

      {/* Mobile & Tablet Sidebar Overlay Drawer */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
          />

          <div className={`relative w-72 max-w-[85vw] h-full shadow-2xl z-50 flex flex-col ${themeConfig.navStyle} animate-in slide-in-from-left duration-200`}>
            {renderSidebarContent(false)}
          </div>
        </div>
      )}
    </>
  );
};
