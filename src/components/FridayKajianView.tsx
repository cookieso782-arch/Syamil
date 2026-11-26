import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { FridayKajianItem, MosqueProfile } from '../types/index.ts';
import { getStoredFridaySchedules, saveStoredFridaySchedules, getStoredMosqueProfile, getDefaultOfficerName } from '../services/storage.ts';
import {
  CalendarCheck,
  BookOpen,
  Clock,
  User,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  MapPin,
  FileText,
  Printer,
  X,
  CheckSquare,
  Edit2,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import { Pagination } from './common/Pagination.tsx';
import { MultiDeleteBar } from './common/MultiDeleteBar.tsx';
import { ConfirmDeleteModal } from './common/ConfirmDeleteModal.tsx';
import { ReportPrintModal } from './common/ReportPrintModal.tsx';

export const FridayKajianView: React.FC = () => {
  const { can } = useAuth();
  const { themeConfig } = useTheme();

  const [schedules, setSchedules] = useState<FridayKajianItem[]>(() => getStoredFridaySchedules());
  const [mosqueProfile, setMosqueProfile] = useState<MosqueProfile>(() => getStoredMosqueProfile());
  const [, setOfficerTick] = useState(0);

  useEffect(() => {
    const syncSchedules = () => {
      const latest = getStoredFridaySchedules();
      setSchedules(latest);
      setDetailItem((prev) => (prev ? latest.find((s) => s.id === prev.id) || null : null));
    };
    const syncProfileAndOfficers = () => {
      setMosqueProfile(getStoredMosqueProfile());
      setOfficerTick((t) => t + 1);
    };
    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key === 'sabiluna_friday_schedules') {
        syncSchedules();
      }
      if (!e.key || e.key === 'sabiluna_mosque_profile' || e.key === 'sabiluna_managed_users') {
        syncProfileAndOfficers();
      }
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('friday-schedules-updated', syncSchedules);
    window.addEventListener('mosque-profile-updated', syncProfileAndOfficers);
    window.addEventListener('managed-users-updated', syncProfileAndOfficers);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('friday-schedules-updated', syncSchedules);
      window.removeEventListener('mosque-profile-updated', syncProfileAndOfficers);
      window.removeEventListener('managed-users-updated', syncProfileAndOfficers);
    };
  }, []);

  const [filterType, setFilterType] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FridayKajianItem | null>(null);
  const [detailItem, setDetailItem] = useState<FridayKajianItem | null>(null);
  const [isReportPrintOpen, setIsReportPrintOpen] = useState(false);

  // Pagination & Multi-delete state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isMultiDeleteOpen, setIsMultiDeleteOpen] = useState(false);

  useEffect(() => {
    if (!detailItem) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDetailItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [detailItem]);

  const [formData, setFormData] = useState({
    type: 'Khutbah Jumat' as FridayKajianItem['type'],
    title: '',
    speaker: '',
    imam: '',
    muadzin: '',
    date: new Date().toISOString().slice(0, 10),
    time: '11:45 - 12:45 WIB',
    location: "Masjid Jami' Al-Barkah",
    status: 'Akan Datang' as FridayKajianItem['status'],
    notes: '',
  });

  const saveSchedules = (items: FridayKajianItem[]) => {
    setSchedules(items);
    saveStoredFridaySchedules(items);
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      type: 'Khutbah Jumat',
      title: '',
      speaker: '',
      imam: '',
      muadzin: '',
      date: new Date().toISOString().slice(0, 10),
      time: '11:45 - 12:45 WIB',
      location: "Masjid Jami' Al-Barkah",
      status: 'Akan Datang',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: FridayKajianItem) => {
    setEditingItem(item);
    setFormData({
      type: item.type,
      title: item.title,
      speaker: item.speaker,
      imam: item.imam || '',
      muadzin: item.muadzin || '',
      date: item.date,
      time: item.time,
      location: item.location || "Masjid Jami' Al-Barkah",
      status: item.status || 'Akan Datang',
      notes: item.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleToggleStatus = (item: FridayKajianItem) => {
    const nextStatus: FridayKajianItem['status'] = item.status === 'Selesai' ? 'Akan Datang' : 'Selesai';
    const updatedList = schedules.map((s) => (s.id === item.id ? { ...s, status: nextStatus } : s));
    saveSchedules(updatedList);
    if (detailItem?.id === item.id) {
      setDetailItem({ ...item, status: nextStatus });
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.speaker.trim()) return;

    if (editingItem) {
      const updatedItem: FridayKajianItem = {
        ...editingItem,
        type: formData.type,
        title: formData.title.trim(),
        speaker: formData.speaker.trim(),
        imam: formData.type === 'Khutbah Jumat' ? (formData.imam.trim() || undefined) : undefined,
        muadzin: formData.type === 'Khutbah Jumat' ? (formData.muadzin.trim() || undefined) : undefined,
        date: formData.date,
        time: formData.time.trim() || '11:45 - 12:45 WIB',
        location: formData.location.trim() || getStoredMosqueProfile().name,
        status: formData.status,
        notes: formData.notes.trim() || undefined,
      };
      const updated = schedules.map((s) => (s.id === editingItem.id ? updatedItem : s));
      saveSchedules(updated);
      if (detailItem?.id === editingItem.id) {
        setDetailItem(updatedItem);
      }
    } else {
      const newItem: FridayKajianItem = {
        id: `FK-${Date.now().toString().slice(-4)}`,
        type: formData.type,
        title: formData.title.trim(),
        speaker: formData.speaker.trim(),
        imam: formData.type === 'Khutbah Jumat' ? (formData.imam.trim() || undefined) : undefined,
        muadzin: formData.type === 'Khutbah Jumat' ? (formData.muadzin.trim() || undefined) : undefined,
        date: formData.date,
        time: formData.time.trim() || '11:45 - 12:45 WIB',
        location: formData.location.trim() || getStoredMosqueProfile().name,
        status: formData.status,
        notes: formData.notes.trim() || undefined,
      };
      saveSchedules([newItem, ...schedules]);
    }

    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleConfirmDeleteSingle = () => {
    if (!deleteConfirmId) return;
    saveSchedules(schedules.filter((s) => s.id !== deleteConfirmId));
    setSelectedIds((prev) => prev.filter((id) => id !== deleteConfirmId));
    if (detailItem?.id === deleteConfirmId) {
      setDetailItem(null);
    }
    setDeleteConfirmId(null);
  };

  const handleConfirmDeleteMulti = () => {
    if (selectedIds.length === 0) return;
    const remaining = schedules.filter((s) => !selectedIds.includes(s.id));
    saveSchedules(remaining);
    setSelectedIds([]);
    setIsSelectMode(false);
    setIsMultiDeleteOpen(false);
  };

  const filtered = schedules.filter(s => filterType === 'all' || s.type === filterType);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedSchedules = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleToggleSelectAll = () => {
    const pageIds = paginatedSchedules.map((s) => s.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-900 text-white border border-emerald-800/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Sholat Jum'at & Kajian Ilmiah
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Penjadwalan khotib, imam rawatib, muadzin jumat, serta kalender majelis taklim rutin untuk syiar masjid.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => setIsReportPrintOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 shadow-md transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-emerald-300" />
            <span>Cetak Jadwal Dakwah</span>
          </button>

          {can('create') && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Jadwalkan Khotib / Kajian</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Select All */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800 text-xs flex-wrap gap-0.5">
          <button
            onClick={() => { setFilterType('all'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer ${
              filterType === 'all' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm' : 'text-slate-500'
            }`}
          >
            Semua Jadwal ({schedules.length})
          </button>
          <button
            onClick={() => { setFilterType('Khutbah Jumat'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer ${
              filterType === 'Khutbah Jumat' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500'
            }`}
          >
            Sholat Jum'at
          </button>
          <button
            onClick={() => { setFilterType('Kajian Rutin'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer ${
              filterType === 'Kajian Rutin' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500'
            }`}
          >
            Kajian Rutin
          </button>
          <button
            onClick={() => { setFilterType('Kajian Akhwat'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer ${
              filterType === 'Kajian Akhwat' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500'
            }`}
          >
            Kajian Akhwat
          </button>
          <button
            onClick={() => { setFilterType('Tahsin Al-Quran'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer ${
              filterType === 'Tahsin Al-Quran' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500'
            }`}
          >
            Tahsin Al-Qur&apos;an
          </button>
        </div>

        <div className="flex items-center gap-2">
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
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                isSelectMode
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title="Pilih data untuk multi hapus"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{isSelectMode ? 'Batal' : 'Pilih Data'}</span>
            </button>
          )}

          {can('delete') && isSelectMode && paginatedSchedules.length > 0 && (
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={paginatedSchedules.length > 0 && paginatedSchedules.every((s) => selectedIds.includes(s.id))}
                onChange={handleToggleSelectAll}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600 cursor-pointer"
              />
              <span>Pilih Semua di Halaman ({paginatedSchedules.length})</span>
            </label>
          )}
        </div>
      </div>

      {/* Multi-Delete Bar */}
      {can('delete') && isSelectMode && (
        <MultiDeleteBar
          selectedCount={selectedIds.length}
          onDeleteSelected={() => setIsMultiDeleteOpen(true)}
          onClearSelection={() => {
            setSelectedIds([]);
            setIsSelectMode(false);
          }}
          label="Jadwal Kegiatan"
        />
      )}

      {/* Row Table */}
      <div className={`rounded-2xl border ${themeConfig.cardBg} shadow-sm overflow-hidden`}>
        {paginatedSchedules.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <CalendarCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="font-semibold text-sm">Tidak ada jadwal kegiatan ditemukan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {can('delete') && isSelectMode && (
                    <th className="py-3 px-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          paginatedSchedules.length > 0 &&
                          paginatedSchedules.every((s) => selectedIds.includes(s.id))
                        }
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                        aria-label="Pilih semua di halaman ini"
                      />
                    </th>
                  )}
                  <th className="py-3 px-4">Tanggal &amp; Waktu</th>
                  <th className="py-3 px-4">Jenis Kegiatan</th>
                  <th className="py-3 px-4">Tema / Materi Dakwah</th>
                  <th className="py-3 px-4">Khotib / Pemateri</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {paginatedSchedules.map((item) => {
                  const isChecked = selectedIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setDetailItem(item)}
                      className={`group cursor-pointer transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-950/25 ${
                        isChecked ? 'bg-emerald-50/40 dark:bg-emerald-950/30' : ''
                      }`}
                    >
                      {can('delete') && isSelectMode && (
                        <td
                          className="py-3.5 px-4 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelect(item.id)}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                            aria-label={`Pilih ${item.title}`}
                          />
                        </td>
                      )}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                          <span>{item.date}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          <span>{item.time}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            item.type === 'Khutbah Jumat'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {item.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{item.location}</span>
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                          <span className="truncate max-w-[180px]">{item.speaker}</span>
                        </div>
                        {item.type === 'Khutbah Jumat' && (item.imam || item.muadzin) && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[200px]">
                            Imam: {item.imam || '-'} • Muadzin: {item.muadzin || '-'}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            item.status === 'Selesai'
                              ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setDetailItem(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 dark:text-slate-400 dark:hover:text-emerald-300 transition-colors cursor-pointer"
                            title="Lihat detail jadwal"
                            aria-label={`Detail ${item.title}`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {can('edit') && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(item)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  item.status === 'Selesai'
                                    ? 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                                }`}
                                title={item.status === 'Selesai' ? 'Buka kembali agenda' : 'Tandai selesai'}
                                aria-label={item.status === 'Selesai' ? 'Buka kembali agenda' : 'Tandai selesai'}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(item)}
                                className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                                title="Edit jadwal"
                                aria-label={`Edit ${item.title}`}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {can('delete') && (
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Hapus jadwal"
                              aria-label={`Hapus ${item.title}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Bar */}
      {filtered.length > 0 && (
        <div className={`p-4 rounded-2xl border ${themeConfig.cardBg} shadow-sm`}>
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={pageSize}
            pageSizeOptions={[5, 10, 20, 50]}
            onPageChange={setCurrentPage}
            onPageSizeChange={(sz) => {
              setPageSize(sz);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

      {/* Detail Popup Modal */}
      {detailItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => setDetailItem(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 max-w-lg w-full space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      detailItem.type === 'Khutbah Jumat'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    {detailItem.type}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      detailItem.status === 'Selesai'
                        ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    }`}
                  >
                    {detailItem.status}
                  </span>
                </div>
                <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white leading-snug">
                  {detailItem.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex-shrink-0"
                title="Tutup"
                aria-label="Tutup Detail"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Tanggal Pelaksanaan
                  </span>
                  <p className="font-bold text-slate-900 dark:text-white mt-1 text-sm">
                    {detailItem.date}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Waktu
                  </span>
                  <p className="font-bold text-slate-900 dark:text-white mt-1 text-sm">
                    {detailItem.time}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 space-y-2.5">
                <div>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 font-semibold">
                    <User className="w-3.5 h-3.5" />
                    {detailItem.type === 'Khutbah Jumat' ? 'Khotib Jum\'at' : 'Pemateri / Ustadz'}
                  </span>
                  <p className="font-bold text-slate-900 dark:text-white mt-0.5 text-sm">
                    {detailItem.speaker}
                  </p>
                </div>

                {detailItem.type === 'Khutbah Jumat' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/50">
                    <div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                        Imam Sholat
                      </span>
                      <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                        {detailItem.imam || '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                        Muadzin
                      </span>
                      <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                        {detailItem.muadzin || '-'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-semibold">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Lokasi / Ruangan
                </span>
                <p className="font-semibold text-slate-900 dark:text-white mt-1">
                  {detailItem.location}
                </p>
              </div>

              {detailItem.notes && (
                <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                  <span className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1.5 font-semibold">
                    <FileText className="w-3.5 h-3.5" />
                    Catatan Tambahan
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                    {detailItem.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {can('edit') && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(detailItem)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        detailItem.status === 'Selesai'
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                          : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{detailItem.status === 'Selesai' ? 'Buka Kembali' : 'Tandai Selesai'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(detailItem)}
                      className="px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </>
                )}
                {can('delete') && (
                  <button
                    type="button"
                    onClick={() => handleDelete(detailItem.id)}
                    className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer ml-auto"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 max-w-md w-full space-y-4 shadow-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {editingItem ? 'Edit Jadwal Khotib / Kajian' : 'Tambah Jadwal Khotib / Kajian'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingItem(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Jenis Kegiatan</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                  >
                    <option value="Khutbah Jumat">Khutbah & Sholat Jumat</option>
                    <option value="Kajian Rutin">Kajian Rutin Ba&apos;da Shubuh / Maghrib</option>
                    <option value="Kajian Akhwat">Kajian Khusus Akhwat</option>
                    <option value="Tahsin Al-Quran">Kelas Tahsin & Tahfidz</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Status Agenda</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as FridayKajianItem['status'] })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                  >
                    <option value="Akan Datang">Akan Datang</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Judul Khutbah / Tema Kajian</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Contoh: Meneladani Akhlak Mulia Rasulullah"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Nama Khotib / Penceramah
                </label>
                <input
                  type="text"
                  required
                  value={formData.speaker}
                  onChange={(e) => setFormData({ ...formData, speaker: e.target.value })}
                  placeholder="Contoh: Ust. Dr. H. Khalid M."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                />
              </div>

              {formData.type === 'Khutbah Jumat' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Imam Sholat</label>
                    <input
                      type="text"
                      value={formData.imam}
                      onChange={(e) => setFormData({ ...formData, imam: e.target.value })}
                      placeholder="Nama imam"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Muadzin</label>
                    <input
                      type="text"
                      value={formData.muadzin}
                      onChange={(e) => setFormData({ ...formData, muadzin: e.target.value })}
                      placeholder="Nama muadzin"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Waktu</label>
                  <input
                    type="text"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Lokasi / Ruang Masjid</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Contoh: Ruang Sholat Utama Masjid Jami' Al-Barkah"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Catatan Tambahan (Opsional)</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Contoh: Disertai sesi tanya jawab & sarapan jamaah"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                >
                  {editingItem ? 'Simpan Perubahan' : 'Simpan Jadwal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modals for Delete */}
      <ConfirmDeleteModal
        isOpen={deleteConfirmId !== null}
        title="Hapus Jadwal Kegiatan"
        itemName={schedules.find((s) => s.id === deleteConfirmId)?.title || 'Jadwal Kegiatan'}
        message="Jadwal agenda dakwah/sholat ini akan dihapus dari papan informasi dan kalender masjid. Apakah Anda yakin?"
        confirmText="Hapus Jadwal"
        onConfirm={handleConfirmDeleteSingle}
        onCancel={() => setDeleteConfirmId(null)}
      />

      <ConfirmDeleteModal
        isOpen={isMultiDeleteOpen}
        title="Hapus Massal Jadwal Kegiatan"
        count={selectedIds.length}
        message={`Sebanyak ${selectedIds.length} jadwal kegiatan terpilih akan dihapus permanen dari kalender kegiatan masjid.`}
        confirmText={`Hapus ${selectedIds.length} Jadwal`}
        onConfirm={handleConfirmDeleteMulti}
        onCancel={() => setIsMultiDeleteOpen(false)}
      />

      {/* Printable Report Modal: Jadwal Jum'at & Kajian */}
      <ReportPrintModal
        isOpen={isReportPrintOpen}
        onClose={() => setIsReportPrintOpen(false)}
        title="JADWAL RESMI SHOLAT JUM'AT & KAJIAN ILMIAH"
        subtitle={`Bidang Dakwah, Peribadatan & Syiar Islam - DKM ${mosqueProfile.name}`}
        periodText={`${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}${filterType !== 'all' ? ` • Filter: ${filterType}` : ' • Semua Kegiatan'}`}
        summaryCards={[
          { label: 'Total Agenda Terjadwal', value: `${filtered.length} Kegiatan`, color: 'emerald' },
          { label: "Khutbah Jum'at", value: `${filtered.filter((s) => s.type === 'Khutbah Jumat').length} Jadwal`, color: 'blue' },
          { label: 'Kajian Rutin & Tematik', value: `${filtered.filter((s) => s.type.includes('Kajian')).length} Kajian`, color: 'purple' },
          { label: 'Agenda Mendatang', value: `${filtered.filter((s) => s.status === 'Akan Datang').length} Agenda`, color: 'amber' },
        ]}
        columns={[
          { header: 'Tanggal & Waktu', key: 'dateTime', width: '20%' },
          { header: 'Jenis Kegiatan', key: 'type', width: '15%' },
          { header: 'Tema / Materi Dakwah', key: 'title', width: '28%' },
          { header: 'Khotib / Penceramah', key: 'speaker', width: '20%' },
          { header: 'Petugas / Lokasi', key: 'officers', width: '17%' },
        ]}
        data={filtered.map((s) => ({
          dateTime: `${s.date} (${s.time})`,
          type: s.type,
          title: s.title,
          speaker: s.speaker,
          officers: s.type === 'Khutbah Jumat' ? `Imam: ${s.imam || '-'} | Muadzin: ${s.muadzin || '-'}` : (s.location || '-'),
        }))}
        notes={`Jadwal ini telah dikoordinasikan bersama para asatidz dan petugas peribadatan DKM ${mosqueProfile.name} demi ketertiban ibadah jamaah.`}
        signatures={[
          { role: 'Ketua DKM (Admin)', name: getDefaultOfficerName('admin', 'Drs. KH. Ahmad Muzammil'), position: `Ketua DKM ${mosqueProfile.name}` },
          { role: 'Humas & Syiar Dakwah', name: getDefaultOfficerName('humas', 'Ust. M. Ridwan Al-Fatih'), position: 'Koordinator Jadwal & Kajian' },
        ]}
      />
    </div>
  );
};
