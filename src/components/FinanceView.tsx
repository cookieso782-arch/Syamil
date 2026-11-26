import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { Transaction, TransactionType, MosqueProfile } from '../types/index.ts';
import { formatCurrencyIDR, maskSensitiveName, getStoredMosqueProfile, getDefaultOfficerName } from '../services/storage.ts';
import { exportTransactionsToExcel, downloadTemplate } from '../services/excelService.ts';
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Search,
  Filter,
  Plus,
  FileSpreadsheet,
  Upload,
  Download,
  Edit2,
  Trash2,
  ShieldCheck,
  Eye,
  EyeOff,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  CheckSquare,
  Printer,
} from 'lucide-react';
import { Pagination } from './common/Pagination.tsx';
import { MultiDeleteBar } from './common/MultiDeleteBar.tsx';
import { ConfirmDeleteModal } from './common/ConfirmDeleteModal.tsx';
import { ReportPrintModal } from './common/ReportPrintModal.tsx';

interface FinanceViewProps {
  transactions: Transaction[];
  onAddTransaction: () => void;
  onEditTransaction: (trx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onDeleteMultipleTransactions?: (ids: string[]) => void;
  onOpenImport: () => void;
  initialFilter?: {
    type: 'all' | 'in' | 'out';
    category: string;
    nonce: number;
  } | null;
}

export const FinanceView: React.FC<FinanceViewProps> = ({
  transactions,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onDeleteMultipleTransactions,
  onOpenImport,
  initialFilter,
}) => {
  const { can, user } = useAuth();
  const { themeConfig } = useTheme();

  // Filters
  const [filterType, setFilterType] = useState<'all' | 'in' | 'out'>(initialFilter?.type || 'all');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialFilter?.category || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hideSensitive, setHideSensitive] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isMultiDeleteModalOpen, setIsMultiDeleteModalOpen] = useState(false);
  const [isReportPrintOpen, setIsReportPrintOpen] = useState(false);

  // Pagination & Multi-Delete States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);

  const [summaryMode, setSummaryMode] = useState<'filter' | 'all'>('filter');
  const [mosqueProfile, setMosqueProfile] = useState<MosqueProfile>(() => getStoredMosqueProfile());
  const [, setOfficerTick] = useState(0);

  useEffect(() => {
    const syncProfileAndOfficers = () => {
      setMosqueProfile(getStoredMosqueProfile());
      setOfficerTick((t) => t + 1);
    };
    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key === 'sabiluna_mosque_profile' || e.key === 'sabiluna_managed_users') {
        syncProfileAndOfficers();
      }
    };
    window.addEventListener('mosque-profile-updated', syncProfileAndOfficers);
    window.addEventListener('managed-users-updated', syncProfileAndOfficers);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('mosque-profile-updated', syncProfileAndOfficers);
      window.removeEventListener('managed-users-updated', syncProfileAndOfficers);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  React.useEffect(() => {
    if (initialFilter) {
      setFilterType(initialFilter.type);
      setSelectedCategory(initialFilter.category);
      setSearchQuery('');
      setStartDate('');
      setEndDate('');
    }
  }, [initialFilter]);

  // Filtered list
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchDesc = t.description.toLowerCase().includes(query);
        const matchDonor = (t.donorName || '').toLowerCase().includes(query);
        const matchReceipt = t.receiptNumber.toLowerCase().includes(query);
        const matchCat = t.category.toLowerCase().includes(query);
        return matchDesc || matchDonor || matchReceipt || matchCat;
      }
      return true;
    });
  }, [transactions, filterType, selectedCategory, startDate, endDate, searchQuery]);

  // Check if any filter is active
  const isFilterActive = useMemo(() => {
    return (
      filterType !== 'all' ||
      selectedCategory !== 'all' ||
      searchQuery.trim() !== '' ||
      startDate !== '' ||
      endDate !== ''
    );
  }, [filterType, selectedCategory, searchQuery, startDate, endDate]);

  // Overall Database Aggregations
  const overallTotalIn = useMemo(
    () => transactions.filter((t) => t.type === 'in').reduce((acc, t) => acc + t.amount, 0),
    [transactions]
  );
  const overallTotalOut = useMemo(
    () => transactions.filter((t) => t.type === 'out').reduce((acc, t) => acc + t.amount, 0),
    [transactions]
  );
  const overallSaldo = overallTotalIn - overallTotalOut;
  const overallInCount = useMemo(
    () => transactions.filter((t) => t.type === 'in').length,
    [transactions]
  );
  const overallOutCount = useMemo(
    () => transactions.filter((t) => t.type === 'out').length,
    [transactions]
  );

  // Filtered / Active Aggregations (Real-Time based on active filters)
  const filteredTotalIn = useMemo(
    () => filteredTransactions.filter((t) => t.type === 'in').reduce((acc, t) => acc + t.amount, 0),
    [filteredTransactions]
  );
  const filteredTotalOut = useMemo(
    () => filteredTransactions.filter((t) => t.type === 'out').reduce((acc, t) => acc + t.amount, 0),
    [filteredTransactions]
  );
  const filteredSaldo = filteredTotalIn - filteredTotalOut;
  const filteredInCount = useMemo(
    () => filteredTransactions.filter((t) => t.type === 'in').length,
    [filteredTransactions]
  );
  const filteredOutCount = useMemo(
    () => filteredTransactions.filter((t) => t.type === 'out').length,
    [filteredTransactions]
  );

  // Active Displayed Values
  const useFilteredStats = isFilterActive && summaryMode === 'filter';
  const displaySaldo = useFilteredStats ? filteredSaldo : overallSaldo;
  const displayTotalIn = useFilteredStats ? filteredTotalIn : overallTotalIn;
  const displayTotalOut = useFilteredStats ? filteredTotalOut : overallTotalOut;
  const displayInCount = useFilteredStats ? filteredInCount : overallInCount;
  const displayOutCount = useFilteredStats ? filteredOutCount : overallOutCount;

  // Quick period filter presets (local timezone safe)
  const toLocalYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const today = new Date();
  const thisMonthStart = toLocalYMD(new Date(today.getFullYear(), today.getMonth(), 1));
  const thisMonthEnd = toLocalYMD(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  const last7Past = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
  const last7Start = toLocalYMD(last7Past);
  const todayYMD = toLocalYMD(today);
  const thisYearStart = `${today.getFullYear()}-01-01`;
  const thisYearEnd = `${today.getFullYear()}-12-31`;

  const handleQuickPeriod = (period: 'all' | 'this_month' | 'last_7_days' | 'this_year') => {
    if (period === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (period === 'this_month') {
      setStartDate(thisMonthStart);
      setEndDate(thisMonthEnd);
    } else if (period === 'last_7_days') {
      setStartDate(last7Start);
      setEndDate(todayYMD);
    } else if (period === 'this_year') {
      setStartDate(thisYearStart);
      setEndDate(thisYearEnd);
    }
  };

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTransactions = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, safePage, pageSize]);

  // Reset pagination & selection when filters change
  React.useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [filterType, selectedCategory, startDate, endDate, searchQuery]);

  // Multi-delete handlers
  const handleToggleSelectAll = () => {
    const pageIds = paginatedTransactions.map((t) => t.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleConfirmMultiDelete = () => {
    if (selectedIds.length === 0) return;
    if (onDeleteMultipleTransactions) {
      onDeleteMultipleTransactions(selectedIds);
    } else {
      selectedIds.forEach((id) => onDeleteTransaction(id));
    }
    setSelectedIds([]);
    setIsSelectMode(false);
    setIsMultiDeleteModalOpen(false);
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(t => set.add(t.category));
    return Array.from(set);
  }, [transactions]);

  const handleExport = () => {
    exportTransactionsToExcel(filteredTransactions, mosqueProfile.name);
  };

  return (
    <div className="space-y-6">
      {/* Page Header with Tab Navigation */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-emerald-950 text-white border border-teal-800/40 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 flex-shrink-0" />
            <span>Buku Kas &amp; Keuangan Masjid</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Pencatatan infaq, zakat, wakaf tunai, dan pengeluaran operasional yang transparan
          </p>
        </div>

        {/* Sub-tab Navigation Selector */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-700/60 shadow-inner shrink-0 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-700/30 ring-1 ring-emerald-400/50'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Wallet className="w-4 h-4 text-emerald-300" />
            <span>Semua Kas</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                filterType === 'all' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {transactions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('in')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === 'in'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-700/30 ring-1 ring-emerald-400/50'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ArrowDownRight className="w-4 h-4 text-emerald-300" />
            <span>Pemasukan</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                filterType === 'in' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {overallInCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('out')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterType === 'out'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-700/30 ring-1 ring-emerald-400/50'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-teal-300" />
            <span>Pengeluaran</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                filterType === 'out' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {overallOutCount}
            </span>
          </button>
        </div>
      </div>

      {/* Quick Period Control Strip */}
      <div className="flex flex-wrap items-center justify-end gap-3 px-1">
        {/* Quick Period & Mode Selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="inline-flex flex-wrap gap-0.5 rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800 text-xs">
            <button
              onClick={() => handleQuickPeriod('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                !startDate && !endDate
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Semua Periode
            </button>
            <button
              onClick={() => handleQuickPeriod('this_month')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                startDate === thisMonthStart && endDate === thisMonthEnd
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Bulan Ini
            </button>
            <button
              onClick={() => handleQuickPeriod('last_7_days')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                startDate === last7Start && endDate === todayYMD
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              7 Hari Terakhir
            </button>
            <button
              onClick={() => handleQuickPeriod('this_year')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                startDate === thisYearStart && endDate === thisYearEnd
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Tahun {today.getFullYear()}
            </button>
          </div>

          {isFilterActive && (
            <button
              onClick={() => setSummaryMode(summaryMode === 'filter' ? 'all' : 'filter')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer"
              title="Ganti tampilan antara data filter aktif atau akumulasi keseluruhan"
            >
              {summaryMode === 'filter' ? 'Tampilkan Total Kumulatif' : 'Tampilkan Data Filter'}
            </button>
          )}
        </div>
      </div>

      {/* Top Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Saldo Kas */}
        <div className={`p-4 sm:p-5 rounded-2xl border ${themeConfig.cardBg} relative overflow-hidden transition-all shadow-xs sm:col-span-2 lg:col-span-1 min-w-0`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5">
              <span>{useFilteredStats ? 'Saldo Kas (Filter Aktif)' : 'Saldo Akhir Kas Masjid'}</span>
              {useFilteredStats && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                  Live Filter
                </span>
              )}
            </span>
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <p className={`text-xl sm:text-2xl lg:text-3xl font-extrabold mt-2 tracking-tight transition-all break-words font-mono ${
            displaySaldo < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
          }`}>
            {formatCurrencyIDR(displaySaldo)}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            {useFilteredStats ? (
              <span>Arus Bersih Filter • Total Kas Kumulatif: {formatCurrencyIDR(overallSaldo)}</span>
            ) : (
              <span>Kondisi Likuid & Siap Digunakan</span>
            )}
          </div>
        </div>

        {/* Total Inflow */}
        <div className={`p-4 sm:p-5 rounded-2xl border ${themeConfig.cardBg} transition-all shadow-xs min-w-0`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5">
              <span>Total Pemasukan (Infaq/Zakat)</span>
              {useFilteredStats && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                  Live Filter
                </span>
              )}
            </span>
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 shrink-0">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2 tracking-tight transition-all break-words font-mono">
            +{formatCurrencyIDR(displayTotalIn)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Dari {displayInCount} transaksi penerimaan{useFilteredStats ? ' (filter aktif)' : ''}
          </p>
        </div>

        {/* Total Outflow */}
        <div className={`p-4 sm:p-5 rounded-2xl border ${themeConfig.cardBg} transition-all shadow-xs min-w-0`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5">
              <span>Total Pengeluaran (Operasional)</span>
              {useFilteredStats && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold">
                  Live Filter
                </span>
              )}
            </span>
            <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 shrink-0">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-2 tracking-tight transition-all break-words font-mono">
            -{formatCurrencyIDR(displayTotalOut)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Dari {displayOutCount} transaksi pengeluaran{useFilteredStats ? ' (filter aktif)' : ''}
          </p>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className={`p-4 rounded-2xl border ${themeConfig.cardBg} space-y-4`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari transaksi, nomor kwitansi, atau donatur..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Action Buttons: Add, Export, Import */}
          <div className="flex flex-wrap items-center gap-2">
            {can('create') && (
              <button
                onClick={onAddTransaction}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Catat Transaksi</span>
              </button>
            )}

            <button
              onClick={() => setIsReportPrintOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-300 dark:border-slate-700 transition-all cursor-pointer shadow-xs"
              title="Cetak Laporan Buku Kas Resmi Berkop DKM"
            >
              <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Cetak Laporan</span>
            </button>

            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 rounded-xl border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer"
              title="Unduh Laporan Format Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel</span>
            </button>

            {can('import') && (
              <button
                onClick={onOpenImport}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-xl border border-blue-200 dark:border-blue-800 transition-all cursor-pointer"
                title="Unggah Data dari Berkas Excel"
              >
                <Upload className="w-4 h-4" />
                <span>Import Excel</span>
              </button>
            )}

            <button
              onClick={() => downloadTemplate('kas')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-xl border border-amber-200 dark:border-amber-800 transition-all cursor-pointer"
              title="Unduh Format Template Excel untuk Import Kas"
            >
              <Download className="w-4 h-4" />
              <span>Template Import</span>
            </button>

            {/* Privacy toggle */}
            <button
              onClick={() => setHideSensitive(!hideSensitive)}
              className="p-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
              title={hideSensitive ? 'Tampilkan Nama Lengkap Donatur' : 'Samarkan Nama Donatur (Privasi Islami)'}
            >
              {hideSensitive ? <EyeOff className="w-4 h-4 text-emerald-600" /> : <Eye className="w-4 h-4" />}
            </button>

            {/* Selection Mode Toggle Button */}
            {can('delete') && (
              <button
                onClick={() => {
                  if (isSelectMode) {
                    setIsSelectMode(false);
                    setSelectedIds([]);
                  } else {
                    setIsSelectMode(true);
                  }
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer shadow-xs ${
                  isSelectMode
                    ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-400 text-emerald-800 dark:text-emerald-300'
                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title={isSelectMode ? 'Keluar dari mode pemilihan' : 'Aktifkan mode pemilihan untuk menghapus banyak transaksi'}
              >
                <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{isSelectMode ? 'Batal' : 'Pilih Data'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Row: Type, Category, Date range */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Type tabs */}
          <div className="inline-flex flex-wrap gap-0.5 rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                filterType === 'all'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Semua ({transactions.length})
            </button>
            <button
              onClick={() => setFilterType('in')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                filterType === 'in'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Pemasukan
            </button>
            <button
              onClick={() => setFilterType('out')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                filterType === 'out'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Pengeluaran
            </button>
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none"
          >
            <option value="all">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Date Range Inputs */}
          <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto lg:ml-auto text-xs text-slate-500 dark:text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Dari:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              title="Pilih tanggal awal rentang kas"
              className="flex-1 min-w-[115px] sm:flex-none px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            />
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              title="Pilih tanggal akhir rentang kas"
              className="flex-1 min-w-[115px] sm:flex-none px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-[10px] text-rose-500 font-semibold hover:underline cursor-pointer ml-1"
                title="Hapus filter rentang tanggal"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Multi Delete Action Bar */}
      {can('delete') && isSelectMode && (
        <MultiDeleteBar
          selectedCount={selectedIds.length}
          onDeleteSelected={() => setIsMultiDeleteModalOpen(true)}
          onClearSelection={() => {
            setSelectedIds([]);
            setIsSelectMode(false);
          }}
          onToggleSelectAll={handleToggleSelectAll}
          isAllSelected={paginatedTransactions.length > 0 && paginatedTransactions.every(t => selectedIds.includes(t.id))}
          itemName="transaksi kas"
        />
      )}

      {/* Transactions Table & Mobile Cards */}
      <div className={`rounded-2xl border ${themeConfig.cardBg} overflow-hidden shadow-sm`}>
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
              <tr>
                {can('delete') && isSelectMode && (
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={paginatedTransactions.length > 0 && paginatedTransactions.every(t => selectedIds.includes(t.id))}
                      onChange={handleToggleSelectAll}
                      className="rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                      title="Pilih Semua di Halaman Ini"
                    />
                  </th>
                )}
                <th className="py-3 px-4">Kwitansi / Tgl</th>
                <th className="py-3 px-4">Tipe & Kategori</th>
                <th className="py-3 px-4">Uraian Transaksi</th>
                <th className="py-3 px-4">Donatur / Penerima</th>
                <th className="py-3 px-4 text-right">Nominal</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={can('delete') && isSelectMode ? 7 : 6} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold">Tidak ada transaksi ditemukan.</p>
                    <p className="text-[11px] mt-1">Coba sesuaikan kata kunci pencarian atau tanggal filter.</p>
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((trx) => {
                  const isIncome = trx.type === 'in';
                  const isSelected = selectedIds.includes(trx.id);
                  return (
                    <tr
                      key={trx.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/40'
                          : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {can('delete') && isSelectMode && (
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectOne(trx.id)}
                            className="rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {trx.receiptNumber}
                        </div>
                        <div className="text-[11px] text-slate-400">{trx.date}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            isIncome
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                          }`}>
                            {isIncome ? 'Masuk' : 'Keluar'}
                          </span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{trx.category}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{trx.paymentMethod}</div>
                      </td>

                      <td className="py-3 px-4 max-w-[280px]">
                        <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {trx.description}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          Dicatat: {trx.createdBy}
                        </p>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`text-xs ${trx.isAnonymous || hideSensitive ? 'italic text-slate-500' : 'font-medium text-slate-800 dark:text-slate-200'}`}>
                          {hideSensitive ? 'Hamba Allah (Privasi)' : maskSensitiveName(trx.donorName || '', trx.isAnonymous)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className={`font-bold font-mono text-sm ${
                          isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {isIncome ? '+' : '-'}{formatCurrencyIDR(trx.amount)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {can('edit') && (
                            <button
                              onClick={() => onEditTransaction(trx)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Edit Transaksi"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {can('delete') && (
                            <button
                              onClick={() => setDeleteConfirmId(trx.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Transaksi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {!can('edit') && !can('delete') && (
                            <span className="text-[11px] text-slate-400 italic">Hanya Baca</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {paginatedTransactions.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <p className="font-semibold text-sm">Tidak ada transaksi ditemukan.</p>
            </div>
          ) : (
            paginatedTransactions.map((trx) => {
              const isIncome = trx.type === 'in';
              const isSelected = selectedIds.includes(trx.id);
              return (
                <div
                  key={trx.id}
                  className={`p-3.5 sm:p-4 space-y-2 ${
                    isSelected ? 'bg-emerald-50/70 dark:bg-emerald-950/40' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      {can('delete') && isSelectMode && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(trx.id)}
                          className="mt-1 rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer flex-shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isIncome ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {isIncome ? 'Masuk' : 'Keluar'}
                          </span>
                          <span className="font-mono text-[11px] font-semibold text-slate-500 truncate">
                            {trx.receiptNumber}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1 break-words">
                          {trx.description}
                        </h4>
                      </div>
                    </div>

                    <p className={`font-mono font-bold text-xs sm:text-sm shrink-0 text-right ${
                      isIncome ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {isIncome ? '+' : '-'}{formatCurrencyIDR(trx.amount)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400 pt-1">
                    <span>
                      {trx.category} • {trx.date}
                    </span>
                    <span className="truncate max-w-full">
                      {hideSensitive ? 'Hamba Allah' : maskSensitiveName(trx.donorName || '', trx.isAnonymous)}
                    </span>
                  </div>

                  {(can('edit') || can('delete')) && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {can('edit') && (
                        <button
                          onClick={() => onEditTransaction(trx)}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"
                        >
                          Edit
                        </button>
                      )}
                      {can('delete') && (
                        <button
                          onClick={() => setDeleteConfirmId(trx.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Controls */}
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          totalItems={filteredTransactions.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemName="transaksi"
        />
      </div>

      {/* Single Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) {
            onDeleteTransaction(deleteConfirmId);
            setDeleteConfirmId(null);
          }
        }}
        title="Hapus Transaksi Kas?"
        itemName={
          transactions.find((t) => t.id === deleteConfirmId)?.receiptNumber
            ? `Kwitansi ${transactions.find((t) => t.id === deleteConfirmId)?.receiptNumber} (${transactions.find((t) => t.id === deleteConfirmId)?.description})`
            : 'transaksi kas ini'
        }
        confirmText="Ya, Hapus Transaksi"
      />

      {/* Multi Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={isMultiDeleteModalOpen}
        onClose={() => setIsMultiDeleteModalOpen(false)}
        onConfirm={handleConfirmMultiDelete}
        title="Konfirmasi Hapus Massal Transaksi"
        count={selectedIds.length}
        itemName="transaksi kas"
        confirmText={`Hapus ${selectedIds.length} Transaksi`}
      />

      {/* Official Printable Report Modal */}
      <ReportPrintModal
        isOpen={isReportPrintOpen}
        onClose={() => setIsReportPrintOpen(false)}
        title="LAPORAN RESMI BUKU KAS KEUANGAN MASJID"
        subtitle="Rekapitulasi Arus Kas Penerimaan Infaq/Zakat & Pengeluaran Operasional"
        periodText={
          startDate && endDate
            ? `${startDate} s/d ${endDate}`
            : isFilterActive
            ? `Filter Aktif (${filteredTransactions.length} dari ${transactions.length} Transaksi)`
            : `Semua Transaksi Terdata (${transactions.length} Catatan)`
        }
        categoryName={selectedCategory !== 'all' ? selectedCategory : undefined}
        summaryCards={[
          { label: 'Total Pemasukan', value: `+${formatCurrencyIDR(filteredTotalIn)}`, sublabel: `${filteredInCount} Transaksi` },
          { label: 'Total Pengeluaran', value: `-${formatCurrencyIDR(filteredTotalOut)}`, sublabel: `${filteredOutCount} Transaksi` },
          { label: 'Saldo Kas Akhir', value: formatCurrencyIDR(filteredSaldo), sublabel: `${filteredTransactions.length} Total Catatan` },
        ]}
        tableHeaders={['Tanggal', 'No. Kwitansi', 'Kategori', 'Keterangan', 'Donatur / Penerima', 'Tipe', 'Nominal']}
        tableAligns={['center', 'center', 'left', 'left', 'left', 'center', 'right']}
        tableRows={filteredTransactions.map((t) => [
          t.date,
          t.receiptNumber,
          t.category,
          t.description,
          t.isAnonymous && hideSensitive ? maskSensitiveName(t.donorName || 'Hamba Allah') : t.donorName || '-',
          t.type === 'in' ? 'Pemasukan' : 'Pengeluaran',
          formatCurrencyIDR(t.amount),
        ])}
        footerNotes="Laporan kas ini telah diverifikasi dan disetujui oleh Bendahara serta Ketua DKM untuk kepentingan transparansi dan pertanggungjawaban kepada jamaah."
        signatures={[
          { role: 'Ketua DKM (Admin)', name: getDefaultOfficerName('admin', 'Drs. KH. Ahmad Muzammil'), position: `Ketua DKM ${mosqueProfile.name}` },
          { role: 'Bendahara Keuangan', name: getDefaultOfficerName('bendahara', 'H. Ahmad Sobari, SE, Ak.'), position: 'Bendahara Umum' },
        ]}
      />
    </div>
  );
};
