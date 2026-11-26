import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { InventoryItem, ItemCondition, MosqueProfile } from '../types/index.ts';
import { formatCurrencyIDR, getStoredMosqueProfile, getDefaultOfficerName } from '../services/storage.ts';
import { exportInventoryToExcel, downloadTemplate } from '../services/excelService.ts';
import { Pagination } from './common/Pagination.tsx';
import { MultiDeleteBar } from './common/MultiDeleteBar.tsx';
import { ConfirmDeleteModal } from './common/ConfirmDeleteModal.tsx';
import { ReportPrintModal } from './common/ReportPrintModal.tsx';
import {
  Boxes,
  Plus,
  FileSpreadsheet,
  Upload,
  Download,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Package,
  CheckSquare,
  Printer,
} from 'lucide-react';

interface InventoryViewProps {
  items: InventoryItem[];
  onAddItem: () => void;
  onEditItem: (item: InventoryItem) => void;
  onDeleteItem: (id: string) => void;
  onDeleteMultipleItems?: (ids: string[]) => void;
  onOpenImport: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  items,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onDeleteMultipleItems,
  onOpenImport,
}) => {
  const { can } = useAuth();
  const { themeConfig } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCondition, setSelectedCondition] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
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

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedCondition === 'repair') {
        if (item.condition === 'Baik') return false;
      } else if (selectedCondition !== 'all' && item.condition !== selectedCondition) {
        return false;
      }
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.code.toLowerCase().includes(q) ||
          item.location.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, selectedCondition, selectedCategory, searchQuery]);

  const isFilterActive = useMemo(() => {
    return selectedCondition !== 'all' || selectedCategory !== 'all' || searchQuery.trim() !== '';
  }, [selectedCondition, selectedCategory, searchQuery]);

  // Overall Database Stats (Seluruh Aset)
  const overallValuation = useMemo(
    () => items.reduce((acc, i) => acc + i.estimatedValue * i.quantity, 0),
    [items]
  );
  const overallUnits = useMemo(
    () => items.reduce((acc, i) => acc + i.quantity, 0),
    [items]
  );
  const overallTypesCount = items.length;
  const overallGoodCount = useMemo(
    () => items.filter((i) => i.condition === 'Baik').length,
    [items]
  );
  const overallNeedRepairCount = useMemo(
    () => items.filter((i) => i.condition !== 'Baik').length,
    [items]
  );

  // Filtered Active Stats (Real-Time based on active filters & search)
  const filteredValuation = useMemo(
    () => filteredItems.reduce((acc, i) => acc + i.estimatedValue * i.quantity, 0),
    [filteredItems]
  );
  const filteredUnits = useMemo(
    () => filteredItems.reduce((acc, i) => acc + i.quantity, 0),
    [filteredItems]
  );
  const filteredTypesCount = filteredItems.length;
  const filteredGoodCount = useMemo(
    () => filteredItems.filter((i) => i.condition === 'Baik').length,
    [filteredItems]
  );
  const filteredNeedRepairCount = useMemo(
    () => filteredItems.filter((i) => i.condition !== 'Baik').length,
    [filteredItems]
  );

  // Active Displayed Values
  const useFilteredStats = isFilterActive && summaryMode === 'filter';
  const displayValuation = useFilteredStats ? filteredValuation : overallValuation;
  const displayUnits = useFilteredStats ? filteredUnits : overallUnits;
  const displayTypesCount = useFilteredStats ? filteredTypesCount : overallTypesCount;
  const displayGoodCount = useFilteredStats ? filteredGoodCount : overallGoodCount;
  const displayNeedRepairCount = useFilteredStats ? filteredNeedRepairCount : overallNeedRepairCount;

  // Quick condition filter handler
  const handleQuickCondition = (cond: 'all' | 'Baik' | 'repair') => {
    setSelectedCondition(cond);
  };

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, safePage, pageSize]);

  // Reset pagination & selection when filters change
  React.useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [selectedCondition, selectedCategory, searchQuery]);

  // Multi-delete handlers
  const handleToggleSelectAll = () => {
    const pageIds = paginatedItems.map((item) => item.id);
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
    if (onDeleteMultipleItems) {
      onDeleteMultipleItems(selectedIds);
    } else {
      selectedIds.forEach((id) => onDeleteItem(id));
    }
    setSelectedIds([]);
    setIsSelectMode(false);
    setIsMultiDeleteModalOpen(false);
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => set.add(i.category));
    return Array.from(set);
  }, [items]);

  const conditionBadges: Record<ItemCondition, { label: string; style: string; icon: any }> = {
    Baik: {
      label: 'Kondisi Baik',
      style: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300',
      icon: CheckCircle2,
    },
    'Rusak Ringan': {
      label: 'Rusak Ringan',
      style: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300',
      icon: AlertTriangle,
    },
    'Rusak Berat': {
      label: 'Rusak Berat',
      style: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300',
      icon: XCircle,
    },
  };

  return (
    <div className="space-y-6">
      {/* Page Header with Tab Navigation */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-emerald-950 text-white border border-teal-800/40 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2">
            <Boxes className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 shrink-0" />
            <span>Inventaris &amp; Aset Masjid</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Daftar barang, perlengkapan ibadah, multimedia, kendaraan operasional, serta pemantauan kondisi.
          </p>
        </div>

        {/* Sub-tab Navigation Selector */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-700/60 shadow-inner shrink-0 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => handleQuickCondition('all')}
            className={`flex-1 lg:flex-none justify-center flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedCondition === 'all'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-700/30 ring-1 ring-emerald-400/50'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Boxes className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>Semua Aset</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 ${
                selectedCondition === 'all' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {overallTypesCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickCondition('Baik')}
            className={`flex-1 lg:flex-none justify-center flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedCondition === 'Baik'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-700/30 ring-1 ring-emerald-400/50'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>Kondisi Baik</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 ${
                selectedCondition === 'Baik' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {overallGoodCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickCondition('repair')}
            className={`flex-1 lg:flex-none justify-center flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedCondition === 'repair' || selectedCondition === 'Rusak Ringan' || selectedCondition === 'Rusak Berat'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-700/30 ring-1 ring-emerald-400/50'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-teal-300 shrink-0" />
            <span>Perlu Servis</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 ${
                selectedCondition === 'repair' || selectedCondition === 'Rusak Ringan' || selectedCondition === 'Rusak Berat'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {overallNeedRepairCount}
            </span>
          </button>
        </div>
      </div>

      {/* Quick Filter Strip */}
      <div className="flex flex-wrap items-center justify-end gap-3 px-1">
        {/* Quick Condition & Mode Selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="inline-flex flex-wrap gap-0.5 rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800 text-xs">
            <button
              onClick={() => handleQuickCondition('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                selectedCondition === 'all'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Semua Aset
            </button>
            <button
              onClick={() => handleQuickCondition('Baik')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                selectedCondition === 'Baik'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Kondisi Prima (Baik)
            </button>
            <button
              onClick={() => handleQuickCondition('repair')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                selectedCondition === 'repair' || selectedCondition === 'Rusak Ringan' || selectedCondition === 'Rusak Berat'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Perlu Servis
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

      {/* Top Asset Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 sm:p-5 rounded-2xl border ${themeConfig.cardBg} transition-all shadow-xs min-w-0`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Taksiran Nilai Aset
            </span>
            {useFilteredStats && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                Live Filter
              </span>
            )}
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1.5 font-mono">
            {formatCurrencyIDR(displayValuation)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Dari {displayUnits} unit barang {useFilteredStats ? 'terfilter' : 'terdata'}
            {useFilteredStats && ` • Kumulatif: ${formatCurrencyIDR(overallValuation)}`}
          </p>
        </div>

        <div className={`p-4 sm:p-5 rounded-2xl border ${themeConfig.cardBg} transition-all shadow-xs min-w-0`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Item Aset
            </span>
            {useFilteredStats && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
                Live Filter
              </span>
            )}
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1.5">
            {displayTypesCount} <span className="text-sm font-normal text-slate-500">Jenis Barang</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {useFilteredStats ? `Dari ${displayUnits} unit fisik aktif` : 'Tersimpan di berbagai ruangan'}
          </p>
        </div>

        <div className={`p-4 sm:p-5 rounded-2xl border ${themeConfig.cardBg} transition-all shadow-xs min-w-0`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Kondisi Prima (Baik)
            </span>
            {useFilteredStats && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                Live Filter
              </span>
            )}
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1.5">
            {displayGoodCount} <span className="text-sm font-normal text-slate-500">Item</span>
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
            Siap pakai untuk operasional
          </p>
        </div>

        <div className={`p-4 sm:p-5 rounded-2xl border ${themeConfig.cardBg} transition-all shadow-xs min-w-0`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Perlu Perbaikan / Servis
            </span>
            {useFilteredStats && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold">
                Live Filter
              </span>
            )}
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1.5">
            {displayNeedRepairCount} <span className="text-sm font-normal text-slate-500">Item</span>
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            Prioritas pemeliharaan marbot
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className={`p-4 rounded-2xl border ${themeConfig.cardBg} space-y-3`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode aset, nama barang, atau lokasi..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {can('create') && (
              <button
                onClick={onAddItem}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Aset</span>
              </button>
            )}

            <button
              onClick={() => setIsReportPrintOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-300 dark:border-slate-700 transition-all cursor-pointer shadow-xs"
              title="Cetak Laporan Rekapitulasi Inventaris Berkop DKM"
            >
              <Printer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Cetak Laporan</span>
            </button>

            <button
              onClick={() => exportInventoryToExcel(filteredItems)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 rounded-xl border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel</span>
            </button>

            {can('import') && (
              <button
                onClick={onOpenImport}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-xl border border-blue-200 dark:border-blue-800 transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Import Excel</span>
              </button>
            )}

            <button
              onClick={() => downloadTemplate('inventaris')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-xl border border-amber-200 dark:border-amber-800 transition-all cursor-pointer"
              title="Unduh Format Template Excel untuk Import Inventaris"
            >
              <Download className="w-4 h-4" />
              <span>Template Import</span>
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
                    ? 'bg-blue-100 dark:bg-blue-950 border-blue-400 text-blue-800 dark:text-blue-300'
                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title={isSelectMode ? 'Keluar dari mode pemilihan' : 'Aktifkan mode pemilihan untuk menghapus banyak aset'}
              >
                <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{isSelectMode ? 'Batal' : 'Pilih Data'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="inline-flex flex-wrap gap-0.5 rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800">
            <button
              onClick={() => setSelectedCondition('all')}
              className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${
                selectedCondition === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              Semua Kondisi
            </button>
            <button
              onClick={() => setSelectedCondition('Baik')}
              className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${
                selectedCondition === 'Baik'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              Baik
            </button>
            <button
              onClick={() => setSelectedCondition('Rusak Ringan')}
              className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${
                selectedCondition === 'Rusak Ringan'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              Rusak Ringan
            </button>
            <button
              onClick={() => setSelectedCondition('Rusak Berat')}
              className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${
                selectedCondition === 'Rusak Berat'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              Rusak Berat
            </button>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 outline-none"
          >
            <option value="all">Semua Kategori Aset</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
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
          isAllSelected={paginatedItems.length > 0 && paginatedItems.every((i) => selectedIds.includes(i.id))}
          itemName="barang aset"
        />
      )}

      {/* Table & Mobile Cards */}
      <div className={`rounded-2xl border ${themeConfig.cardBg} overflow-hidden shadow-sm`}>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
              <tr>
                {can('delete') && isSelectMode && (
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={paginatedItems.length > 0 && paginatedItems.every((i) => selectedIds.includes(i.id))}
                      onChange={handleToggleSelectAll}
                      className="rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                      title="Pilih Semua di Halaman Ini"
                    />
                  </th>
                )}
                <th className="py-3 px-4">Kode Aset</th>
                <th className="py-3 px-4">Nama Barang</th>
                <th className="py-3 px-4">Kategori & Lokasi</th>
                <th className="py-3 px-4">Jumlah</th>
                <th className="py-3 px-4">Kondisi</th>
                <th className="py-3 px-4 text-right">Taksiran Nilai</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={can('delete') && isSelectMode ? 8 : 7} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold">Tidak ada data inventaris.</p>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => {
                  const badge = conditionBadges[item.condition];
                  const Icon = badge.icon;
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
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
                            onChange={() => handleToggleSelectOne(item.id)}
                            className="rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {item.code}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
                        {item.notes && <p className="text-[11px] text-slate-400 truncate max-w-xs">{item.notes}</p>}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium">{item.category}</p>
                        <p className="text-[11px] text-slate-400">{item.location}</p>
                      </td>
                      <td className="py-3 px-4 font-semibold">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badge.style}`}>
                          <Icon className="w-3 h-3" />
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold">
                        {formatCurrencyIDR(item.estimatedValue * item.quantity)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {can('edit') && (
                            <button
                              onClick={() => onEditItem(item)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg cursor-pointer"
                              title="Edit Aset"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {can('delete') && (
                            <button
                              onClick={() => setDeleteConfirmId(item.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                              title="Hapus Aset"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

        {/* Mobile Card View for Inventory */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {paginatedItems.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-semibold text-sm">Tidak ada data inventaris.</p>
            </div>
          ) : (
            paginatedItems.map((item) => {
              const badge = conditionBadges[item.condition];
              const Icon = badge.icon;
              const isSelected = selectedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  className={`p-3.5 sm:p-4 space-y-2.5 ${
                    isSelected ? 'bg-emerald-50/70 dark:bg-emerald-950/40' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      {can('delete') && isSelectMode && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(item.id)}
                          className="mt-1 rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer flex-shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            {item.code}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.style}`}>
                            <Icon className="w-3 h-3" />
                            {badge.label}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1 break-words">
                          {item.name}
                        </h4>
                        {item.notes && (
                          <p className="text-[11px] text-slate-400 mt-0.5 break-words">{item.notes}</p>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {formatCurrencyIDR(item.estimatedValue * item.quantity)}
                      </p>
                      <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                        {item.quantity} {item.unit}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>{item.category}</span>
                    <span>Lokasi: {item.location}</span>
                  </div>

                  {(can('edit') || can('delete')) && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {can('edit') && (
                        <button
                          onClick={() => onEditItem(item)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      )}
                      {can('delete') && (
                        <button
                          onClick={() => setDeleteConfirmId(item.id)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
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
          totalItems={filteredItems.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemName="aset inventaris"
        />
      </div>

      {/* Single Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) {
            onDeleteItem(deleteConfirmId);
            setDeleteConfirmId(null);
          }
        }}
        title="Hapus Aset Inventaris?"
        itemName={
          items.find((i) => i.id === deleteConfirmId)?.name
            ? `${items.find((i) => i.id === deleteConfirmId)?.name} (${items.find((i) => i.id === deleteConfirmId)?.code})`
            : 'aset inventaris ini'
        }
        confirmText="Ya, Hapus Aset"
      />

      {/* Multi Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={isMultiDeleteModalOpen}
        onClose={() => setIsMultiDeleteModalOpen(false)}
        onConfirm={handleConfirmMultiDelete}
        title="Konfirmasi Hapus Massal Aset"
        count={selectedIds.length}
        itemName="barang aset inventaris"
        confirmText={`Hapus ${selectedIds.length} Aset`}
      />

      {/* Official Printable Report Modal */}
      <ReportPrintModal
        isOpen={isReportPrintOpen}
        onClose={() => setIsReportPrintOpen(false)}
        title="LAPORAN REKAPITULASI INVENTARIS & FASILITAS ASET MASJID"
        subtitle="Daftar Logistik, Sarana Prasarana & Taksiran Nilai Kekayaan Masjid"
        periodText={isFilterActive ? `Filter Aktif (${filteredItems.length} dari ${items.length} Item)` : `Semua Aset Terdata (${items.length} Item)`}
        categoryName={selectedCategory !== 'all' ? selectedCategory : undefined}
        summaryCards={[
          { label: 'Total Taksiran Nilai', value: formatCurrencyIDR(filteredValuation), sublabel: `${filteredUnits} Total Unit` },
          { label: 'Total Jenis Barang', value: `${filteredTypesCount} Item`, sublabel: 'Barang Fisik' },
          { label: 'Kondisi Prima (Baik)', value: `${filteredGoodCount} Item`, sublabel: 'Siap Pakai' },
          { label: 'Perlu Servis / Rusak', value: `${filteredNeedRepairCount} Item`, sublabel: 'Prioritas Marbot' },
        ]}
        tableHeaders={['Kode Aset', 'Nama Barang / Fasilitas', 'Kategori', 'Jumlah / Satuan', 'Kondisi', 'Lokasi Simpan', 'Taksiran Nilai']}
        tableAligns={['center', 'left', 'left', 'center', 'center', 'left', 'right']}
        tableRows={filteredItems.map((i) => [
          i.code,
          i.name,
          i.category,
          `${i.quantity} ${i.unit}`,
          i.condition,
          i.location,
          formatCurrencyIDR(i.estimatedValue * i.quantity),
        ])}
        footerNotes="Laporan inventaris dan sarana ibadah ini telah diaudit dan diperiksa fisiknya oleh Pengurus Bidang Sarana & Prasarana DKM."
        signatures={[
          { role: 'Ketua DKM (Admin)', name: getDefaultOfficerName('admin', 'Drs. KH. Ahmad Muzammil'), position: `Ketua DKM ${mosqueProfile.name}` },
          { role: 'Sekretaris DKM', name: getDefaultOfficerName('sekretaris', 'Ust. Farhan Basalamah, S.Kom'), position: 'Tata Usaha & Sarana Aset' },
        ]}
      />
    </div>
  );
};
