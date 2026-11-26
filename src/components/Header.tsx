import React from 'react';
import { useTheme } from '../context/ThemeContext.tsx';
import {
  Menu,
  Clock,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface HeaderProps {
  activeTab: string;
  onOpenMobileSidebar: () => void;
  nextPrayer: { name: string; time: string; minutesRemaining: number };
  hijriDate: string;
  onQuickAdd?: () => void;
  mosqueName?: string;
}

const TAB_TITLES: Record<string, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Beranda & Sholat',
    subtitle: 'Ikhtisar keuangan, waktu sholat, dan agenda masjid terkini',
  },
  finance: {
    title: 'Buku Kas Keuangan',
    subtitle: 'Pencatatan kas masuk, kas keluar, zakat, infaq & laporan Excel',
  },
  zakat: {
    title: 'Zakat & Mustahik',
    subtitle: 'Pencatatan penerimaan zakat fitrah & maal, muzakki, serta penyaluran 8 asnaf',
  },
  inventory: {
    title: 'Inventaris & Aset',
    subtitle: 'Pengelolaan sarana, kondisi fisik, dan valuasi aset tetap',
  },
  friday_kajian: {
    title: "Jum'at & Kajian",
    subtitle: 'Roster khotib Jumat, imam rawatib, muadzin, dan kajian rutin',
  },
  letters: {
    title: 'Surat & Administrasi',
    subtitle: 'Pembuatan surat resmi DKM, penomoran otomatis, dan cetak kop surat',
  },
  users: {
    title: 'Manajemen Pengguna',
    subtitle: 'Hak akses pengurus DKM, pembagian peran RBAC, dan izin akun',
  },
  settings: {
    title: 'Profil & Pengaturan',
    subtitle: 'Identitas legal SIMAS, rekening BSI, QRIS masjid, tema, dan backup',
  },
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onOpenMobileSidebar,
  nextPrayer,
  hijriDate,
  onQuickAdd,
  mosqueName,
}) => {
  const { user, logout } = useAuth();
  const { themeConfig } = useTheme();

  const currentTabInfo = TAB_TITLES[activeTab] || {
    title: 'SYAMIL',
    subtitle: 'Sistem Informasi Manajemen Masjid',
  };

  return (
    <header className={`sticky top-0 z-20 border-b backdrop-blur-md transition-colors ${themeConfig.navStyle}`}>
      {/* Top micro prayer banner */}
      <div className="bg-slate-900 text-slate-200 text-[11px] py-1.5 px-3 sm:px-6 flex flex-wrap justify-between items-center gap-x-3 gap-y-0.5">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <Clock className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span className="truncate">
            Sholat Berikutnya: <strong className="text-white">{nextPrayer.name} ({nextPrayer.time} WIB)</strong>
          </span>
          <span className="text-slate-400 hidden sm:inline whitespace-nowrap">
            • {nextPrayer.minutesRemaining > 0 ? `${nextPrayer.minutesRemaining} menit lagi` : 'Waktu Sholat'}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="font-serif text-amber-300 font-bold hidden sm:inline truncate">
            {hijriDate}
          </span>
          <span className="text-slate-400 hidden md:inline">|</span>
          <span className="text-slate-300 hidden md:inline truncate max-w-[200px] lg:max-w-xs">
            {mosqueName || "Masjid Jami' Al-Barkah"}
          </span>
        </div>
      </div>

      {/* Main Bar */}
      <div className="px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Mobile hamburger & Page Title */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0 cursor-pointer"
            title="Buka Menu Navigasi"
            aria-label="Buka Menu Navigasi"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white truncate leading-tight">
              {currentTabInfo.title}
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate hidden sm:block">
              {currentTabInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Active User Role Badge & Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {user && (
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex items-center text-[10px] font-bold px-2 sm:px-2.5 py-0.5 rounded-full border max-w-[100px] sm:max-w-none truncate ${
                user.role === 'admin' || user.role === 'super_admin'
                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                  : user.role === 'sekretaris'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                  : user.role === 'bendahara'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800'
              }`}>
                <span className="truncate">{user.roleLabel.split('(')[0].trim()}</span>
              </span>

              <button
                onClick={logout}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-xs font-semibold transition-colors cursor-pointer"
                title="Keluar dari sesi ini"
                aria-label="Keluar dari sesi ini"
              >
                <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="hidden md:inline text-[11px]">Keluar</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
