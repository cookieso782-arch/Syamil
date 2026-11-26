import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import {
  Transaction,
  InventoryItem,
  MosqueEvent,
  IncomingLetter,
  OutgoingLetter,
  FridayKajianItem,
  ZakatRecord,
  Mustahik,
} from '../types/index.ts';
import {
  formatCurrencyIDR,
  getStoredIncomingLetters,
  getStoredOutgoingLetters,
  getStoredFridaySchedules,
  getStoredZakatRecords,
  getStoredMustahik,
} from '../services/storage.ts';
import { DashboardCharts } from './DashboardCharts.tsx';
import { PrayerTimeItem } from '../services/prayerTimes.ts';
import {
  ChevronRight,
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  User,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface DashboardViewProps {
  transactions: Transaction[];
  inventory: InventoryItem[];
  events: MosqueEvent[];
  prayerTimes: PrayerTimeItem[];
  nextPrayer: { name: string; time: string; minutesRemaining: number };
  hijriDate: string;
  onNavigate: (tab: string) => void;
  onSelectFinanceCategory?: (category: string, type: 'in' | 'out') => void;
  onOpenAddTransaction?: () => void;
  onOpenImport?: () => void;
  mosqueName?: string;
}

type LetterFilterTab = 'all' | 'in' | 'out';

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  inventory,
  nextPrayer,
  hijriDate,
  onNavigate,
  onSelectFinanceCategory,
  mosqueName: propMosqueName,
}) => {
  const { user, allowedMenus } = useAuth();
  const { themeConfig } = useTheme();
  const canAccessFinance = allowedMenus.includes('finance');
  const canAccessZakat = allowedMenus.includes('zakat');
  const canAccessInventory = allowedMenus.includes('inventory');
  const canAccessKajian = allowedMenus.includes('friday_kajian');
  const canAccessLetters = allowedMenus.includes('letters');

  const [incomingLetters, setIncomingLetters] = useState<IncomingLetter[]>(() => getStoredIncomingLetters());
  const [outgoingLetters, setOutgoingLetters] = useState<OutgoingLetter[]>(() => getStoredOutgoingLetters());
  const [fridaySchedules, setFridaySchedules] = useState<FridayKajianItem[]>(() => getStoredFridaySchedules());
  const [zakatRecords, setZakatRecords] = useState<ZakatRecord[]>(() => getStoredZakatRecords());
  const [mustahikList, setMustahikList] = useState<Mustahik[]>(() => getStoredMustahik());
  const [letterFilter, setLetterFilter] = useState<LetterFilterTab>('all');

  useEffect(() => {
    const syncLetters = () => {
      setIncomingLetters(getStoredIncomingLetters());
      setOutgoingLetters(getStoredOutgoingLetters());
    };
    const syncSchedules = () => {
      setFridaySchedules(getStoredFridaySchedules());
    };
    const syncZakat = () => {
      setZakatRecords(getStoredZakatRecords());
    };
    const syncMustahik = () => {
      setMustahikList(getStoredMustahik());
    };
    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key === 'sabiluna_incoming_letters' || e.key === 'sabiluna_outgoing_letters') {
        syncLetters();
      }
      if (!e.key || e.key === 'sabiluna_friday_schedules') {
        syncSchedules();
      }
      if (!e.key || e.key === 'sabiluna_zakat_records') {
        syncZakat();
      }
      if (!e.key || e.key === 'sabiluna_mustahik_records') {
        syncMustahik();
      }
    };
    window.addEventListener('letters-updated', syncLetters);
    window.addEventListener('friday-schedules-updated', syncSchedules);
    window.addEventListener('zakat_records_updated', syncZakat);
    window.addEventListener('mustahik_records_updated', syncMustahik);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('letters-updated', syncLetters);
      window.removeEventListener('friday-schedules-updated', syncSchedules);
      window.removeEventListener('zakat_records_updated', syncZakat);
      window.removeEventListener('mustahik_records_updated', syncMustahik);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // 1. Financial & Asset Summary (Real-Time)
  const inTransactions = transactions.filter((t) => t.type === 'in');
  const outTransactions = transactions.filter((t) => t.type === 'out');
  const totalIn = inTransactions.reduce((acc, t) => acc + t.amount, 0);
  const totalOut = outTransactions.reduce((acc, t) => acc + t.amount, 0);
  const saldo = totalIn - totalOut;
  const totalValuation = inventory.reduce((acc, i) => acc + i.estimatedValue * i.quantity, 0);

  // 4. Letters Summary & Unified List (Real-Time)
  const lettersOverview = useMemo(() => {
    const incomingUnprocessed = incomingLetters.filter((l) => l.status === 'Belum Diproses').length;
    const incomingInProgress = incomingLetters.filter((l) => l.status === 'Didisposisikan').length;
    const incomingDone = incomingLetters.filter(
      (l) => l.status === 'Selesai Ditindaklanjuti' || l.status === 'Diarsipkan'
    ).length;

    const outgoingUnprocessed = outgoingLetters.filter((l) => l.status === 'Konsep').length;
    const outgoingDone = outgoingLetters.filter(
      (l) => l.status === 'Diterbitkan' || l.status === 'Terkirim'
    ).length;

    const totalUnprocessed = incomingUnprocessed + outgoingUnprocessed;
    const totalProcessed = incomingInProgress + incomingDone + outgoingDone;

    const unified = [
      ...incomingLetters.map((l) => {
        const isUnprocessed = l.status === 'Belum Diproses';
        const isInProgress = l.status === 'Didisposisikan';
        return {
          id: l.id,
          direction: 'in' as const,
          letterNumber: l.letterNumber || l.agendaNumber,
          subject: l.subject,
          party: l.sender,
          date: l.receivedDate || l.letterDate,
          rawStatus: l.status,
          processCategory: isUnprocessed
            ? ('unprocessed' as const)
            : isInProgress
            ? ('in_progress' as const)
            : ('done' as const),
          processLabel: isUnprocessed
            ? 'Belum Diproses'
            : isInProgress
            ? 'Dalam Proses (Didisposisikan)'
            : `Sudah Diproses (${l.status === 'Selesai Ditindaklanjuti' ? 'Selesai' : l.status})`,
        };
      }),
      ...outgoingLetters.map((l) => {
        const isUnprocessed = l.status === 'Konsep';
        return {
          id: l.id,
          direction: 'out' as const,
          letterNumber: l.letterNumber,
          subject: l.title,
          party: l.recipient,
          date: l.date,
          rawStatus: l.status,
          processCategory: isUnprocessed ? ('unprocessed' as const) : ('done' as const),
          processLabel: isUnprocessed
            ? 'Belum Diproses (Konsep)'
            : `Sudah Diproses (${l.status})`,
        };
      }),
    ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    return {
      incomingCount: incomingLetters.length,
      outgoingCount: outgoingLetters.length,
      incomingUnprocessed,
      incomingInProgress,
      outgoingUnprocessed,
      totalUnprocessed,
      totalProcessed,
      unified,
    };
  }, [incomingLetters, outgoingLetters]);

  const filteredLetters = useMemo(() => {
    const base =
      letterFilter === 'all'
        ? lettersOverview.unified
        : lettersOverview.unified.filter((item) => item.direction === letterFilter);
    return base.slice(0, 5);
  }, [lettersOverview.unified, letterFilter]);

  // 5. Upcoming Schedules & Mosque Activities (Real-Time)
  const upcomingAgendas = useMemo(() => {
    const active = fridaySchedules
      .filter((s) => s.status !== 'Selesai')
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    if (active.length > 0) return active.slice(0, 6);
    return [...fridaySchedules]
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 6);
  }, [fridaySchedules]);

  const currentMosqueName = useMemo(() => {
    if (propMosqueName && propMosqueName.trim()) {
      return propMosqueName.trim();
    }
    try {
      const saved = localStorage.getItem('sabiluna_mosque_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.name?.trim()) return parsed.name.trim();
      }
    } catch {}
    return "Masjid Jami' Al-Barkah";
  }, [propMosqueName]);

  const getRoleWelcomeMessage = () => {
    switch (user?.role) {
      case 'admin':
      case 'super_admin':
        return `Akses penuh mengelola sistem, semua modul, dan manajemen penggunaan di ${currentMosqueName}.`;
      case 'sekretaris':
        return `Akses mengelola tata usaha, administrasi surat menyurat resmi, dan inventaris aset di ${currentMosqueName}.`;
      case 'bendahara':
        return `Akses mengelola pembukuan kas keuangan, penerimaan infaq/sedekah, dan penyaluran zakat di ${currentMosqueName}.`;
      case 'humas':
        return `Akses mengelola syiar dakwah, roster khotib Jum'at, dan agenda kajian di ${currentMosqueName}.`;
      default:
        return `Akses modul operasional dan layanan informasi jamaah di ${currentMosqueName}.`;
    }
  };

  return (
    <div className="space-y-7">
      {/* Welcome Banner */}
      <div className="relative p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white shadow-xl overflow-hidden border border-emerald-700/30">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-6">
          <Sparkles className="w-60 h-60 sm:w-80 sm:h-80 text-emerald-300" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-2 max-w-3xl min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/30">
                {hijriDate}
              </span>
              <span className="text-xs text-slate-300">
                • Waktu Sholat: <strong className="text-white">{nextPrayer.name} ({nextPrayer.time} WIB)</strong>
              </span>
            </div>

            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white break-words">
              Selamat Bertugas, {user?.name || 'Pengurus DKM'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              {getRoleWelcomeMessage()}
            </p>
          </div>
        </div>
      </div>

      {/* 1. RINGKASAN KEUANGAN (Saldo Kas, Pemasukan, Pengeluaran, Total Aset) */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Ringkasan Keuangan
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Saldo kas masjid, total pemasukan, total pengeluaran, dan valuasi aset
            </p>
          </div>
          {canAccessFinance && (
            <button
              type="button"
              onClick={() => onNavigate('finance')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
            >
              Buku Kas <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
          {/* Saldo Kas */}
          <div
            onClick={() => canAccessFinance && onNavigate('finance')}
            className={`p-5 rounded-2xl border min-w-0 ${themeConfig.cardBg} transition-all ${
              canAccessFinance
                ? 'hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm cursor-pointer'
                : ''
            }`}
          >
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
              Saldo Kas Masjid
            </p>
            <p className="text-xl sm:text-2xl xl:text-[21px] 2xl:text-2xl font-extrabold text-slate-900 dark:text-white mt-2.5 font-mono tabular-nums tracking-tight whitespace-nowrap truncate">
              {formatCurrencyIDR(saldo)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 truncate">
              Netto dari {transactions.length} transaksi kas
            </p>
          </div>

          {/* Pemasukan */}
          <div
            onClick={() => canAccessFinance && onNavigate('finance')}
            className={`p-5 rounded-2xl border min-w-0 ${themeConfig.cardBg} transition-all ${
              canAccessFinance
                ? 'hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm cursor-pointer'
                : ''
            }`}
          >
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
              Total Pemasukan
            </p>
            <p className="text-xl sm:text-2xl xl:text-[21px] 2xl:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2.5 font-mono tabular-nums tracking-tight whitespace-nowrap truncate">
              +{formatCurrencyIDR(totalIn)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 truncate">
              {inTransactions.length} transaksi kas masuk
            </p>
          </div>

          {/* Pengeluaran */}
          <div
            onClick={() => canAccessFinance && onNavigate('finance')}
            className={`p-5 rounded-2xl border min-w-0 ${themeConfig.cardBg} transition-all ${
              canAccessFinance
                ? 'hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm cursor-pointer'
                : ''
            }`}
          >
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
              Total Pengeluaran
            </p>
            <p className="text-xl sm:text-2xl xl:text-[21px] 2xl:text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-2.5 font-mono tabular-nums tracking-tight whitespace-nowrap truncate">
              -{formatCurrencyIDR(totalOut)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 truncate">
              {outTransactions.length} transaksi kas keluar
            </p>
          </div>

          {/* Total Aset */}
          <div
            onClick={() => canAccessInventory && onNavigate('inventory')}
            className={`p-5 rounded-2xl border min-w-0 ${themeConfig.cardBg} transition-all ${
              canAccessInventory
                ? 'hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm cursor-pointer'
                : ''
            }`}
          >
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
              Total Aset
            </p>
            <p className="text-xl sm:text-2xl xl:text-[21px] 2xl:text-2xl font-extrabold text-slate-900 dark:text-white mt-2.5 font-mono tabular-nums tracking-tight whitespace-nowrap truncate">
              {formatCurrencyIDR(totalValuation)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 truncate">
              {inventory.length} jenis aset terdaftar
            </p>
          </div>
        </div>
      </section>

      {/* 2. GRAFIK STATISTIK */}
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Grafik Arus Kas &amp; Kategori
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Visualisasi pemasukan, pengeluaran, dan komposisi kategori kas secara real-time
          </p>
        </div>

        <DashboardCharts
          transactions={transactions}
          inventory={inventory}
          incomingLetters={incomingLetters}
          outgoingLetters={outgoingLetters}
          zakatRecords={zakatRecords}
          mustahikList={mustahikList}
          cardBgClass={themeConfig.cardBg}
          section="charts"
          canAccessFinance={canAccessFinance}
          onSelectFinanceCategory={onSelectFinanceCategory}
        />
      </section>

      {/* 3. RINGKASAN OPERASIONAL (Aset, Zakat, dan Surat) */}
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Ringkasan Operasional
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Kondisi aset &amp; fasilitas, penyaluran zakat mustahik, dan rasio persuratan
          </p>
        </div>

        <DashboardCharts
          transactions={transactions}
          inventory={inventory}
          incomingLetters={incomingLetters}
          outgoingLetters={outgoingLetters}
          zakatRecords={zakatRecords}
          mustahikList={mustahikList}
          cardBgClass={themeConfig.cardBg}
          section="operational"
          onNavigate={onNavigate}
          canAccessInventory={canAccessInventory}
          canAccessZakat={canAccessZakat}
          canAccessLetters={canAccessLetters}
        />
      </section>

      {/* 4. ADMINISTRASI & SURAT (Surat Masuk, Surat Keluar, Status Proses) */}
      <section className={`p-4 sm:p-5 rounded-2xl border ${themeConfig.cardBg} space-y-4 min-w-0`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Administrasi &amp; Surat
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pemantauan surat masuk, surat keluar, dan status sudah atau belum diproses
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 self-start sm:self-center">
            <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setLetterFilter('all')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  letterFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setLetterFilter('in')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  letterFilter === 'in'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => setLetterFilter('out')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  letterFilter === 'out'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Keluar
              </button>
            </div>

            {canAccessLetters && (
              <button
                type="button"
                onClick={() => onNavigate('letters')}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
              >
                Kelola Surat <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Letter Status Counters */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 min-w-0">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
              Surat Masuk
            </p>
            <p className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums mt-1">
              {lettersOverview.incomingCount}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {lettersOverview.incomingInProgress} didisposisikan
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 min-w-0">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
              Surat Keluar
            </p>
            <p className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums mt-1">
              {lettersOverview.outgoingCount}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {lettersOverview.outgoingUnprocessed} konsep
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 min-w-0">
            <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300 truncate">
              Belum Diproses
            </p>
            <p className="text-lg sm:text-xl font-extrabold text-amber-700 dark:text-amber-300 font-mono tabular-nums mt-1">
              {lettersOverview.totalUnprocessed}
            </p>
            <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-0.5 truncate">
              Menunggu tindak lanjut
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/20 min-w-0">
            <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 truncate">
              Sudah Diproses
            </p>
            <p className="text-lg sm:text-xl font-extrabold text-emerald-700 dark:text-emerald-300 font-mono tabular-nums mt-1">
              {lettersOverview.totalProcessed}
            </p>
            <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5 truncate">
              Didisposisikan / terbit / selesai
            </p>
          </div>
        </div>

        {/* Recent Letters List with Clear Processing Indicator */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredLetters.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">
              Belum ada data surat pada kategori ini.
            </p>
          ) : (
            filteredLetters.map((item) => {
              const isIn = item.direction === 'in';
              const statusStyle =
                item.processCategory === 'unprocessed'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                  : item.processCategory === 'in_progress'
                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300';

              return (
                <div
                  key={`${item.direction}-${item.id}`}
                  onClick={() => canAccessLetters && onNavigate('letters')}
                  className={`py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 ${
                    canAccessLetters ? 'hover:bg-slate-50/70 dark:hover:bg-slate-800/30 rounded-xl px-2 -mx-2 cursor-pointer transition-colors' : ''
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className={`mt-0.5 px-2 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 shrink-0 ${
                        isIn
                          ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                      }`}
                    >
                      {isIn ? (
                        <ArrowDownLeft className="w-3 h-3" />
                      ) : (
                        <ArrowUpRight className="w-3 h-3" />
                      )}
                      {isIn ? 'Masuk' : 'Keluar'}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-snug break-words">
                        {item.subject}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        <span className="font-mono">{item.letterNumber}</span> • {item.party} •{' '}
                        <span className="font-mono">{item.date}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end shrink-0 pl-10 sm:pl-0">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${statusStyle}`}
                    >
                      {item.processCategory === 'unprocessed' ? (
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      ) : item.processCategory === 'in_progress' ? (
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>{item.processLabel}</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 5. JADWAL & KEGIATAN MASJID (Agenda Terdekat) */}
      <section className={`p-4 sm:p-5 rounded-2xl border ${themeConfig.cardBg} space-y-4 min-w-0`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Jadwal &amp; Kegiatan Masjid
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Agenda terdekat khutbah Jum&apos;at, kajian rutin, dan kegiatan masjid
            </p>
          </div>
          {canAccessKajian && (
            <button
              type="button"
              onClick={() => onNavigate('friday_kajian')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
            >
              Semua Agenda <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {upcomingAgendas.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">
            Belum ada jadwal Jum&apos;at atau kajian terjadwal.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {upcomingAgendas.map((evt, index) => (
              <div
                key={evt.id}
                onClick={() => canAccessKajian && onNavigate('friday_kajian')}
                className={`p-4 rounded-xl border transition-all space-y-2.5 min-w-0 ${
                  index === 0 && evt.status !== 'Selesai'
                    ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30'
                } ${canAccessKajian ? 'hover:shadow-sm cursor-pointer' : ''}`}
              >
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-bold text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 truncate">
                    {evt.type}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 font-mono shrink-0 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {evt.date}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug break-words">
                  {evt.title}
                </h3>

                <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <p className="flex items-center gap-1.5 truncate">
                    <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="truncate">{evt.speaker}</span>
                  </p>
                  <p className="flex items-center gap-1.5 truncate">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{evt.time}</span>
                  </p>
                  {evt.location && (
                    <p className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{evt.location}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
