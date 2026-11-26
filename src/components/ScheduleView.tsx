import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { MosqueEvent } from '../types/index.ts';
import { PrayerTimeItem } from '../services/prayerTimes.ts';
import {
  CalendarCheck,
  Clock,
  MapPin,
  User,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { ConfirmDeleteModal } from './common/ConfirmDeleteModal.tsx';

interface ScheduleViewProps {
  events: MosqueEvent[];
  prayerTimes: PrayerTimeItem[];
  onAddEvent: (evt: Omit<MosqueEvent, 'id'>) => void;
  onDeleteEvent: (id: string) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  events,
  prayerTimes,
  onAddEvent,
  onDeleteEvent,
}) => {
  const { can } = useAuth();
  const { themeConfig } = useTheme();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [speaker, setSpeaker] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('04:45 - 06:15 WIB');
  const [location, setLocation] = useState('Ruang Sholat Utama');
  const [category, setCategory] = useState<MosqueEvent['category']>('Kajian Rutin');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddEvent({
      title: title.trim(),
      speaker: speaker.trim() || 'DKM Masjid',
      date,
      time,
      location,
      category,
      status: 'Akan Datang',
    });

    setIsModalOpen(false);
    setTitle('');
    setSpeaker('');
  };

  return (
    <div className="space-y-6">
      {/* Prayer Schedule Cards */}
      <div className={`p-6 rounded-2xl border ${themeConfig.cardBg} space-y-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Jadwal Sholat 5 Waktu Hari Ini
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Waktu Indonesia Barat (WIB) • Terhitung Otomatis
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {prayerTimes.map((p) => (
            <div
              key={p.name}
              className={`p-3.5 rounded-xl border text-center transition-all ${
                p.isNext
                  ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-950/40 shadow-sm ring-2 ring-emerald-500/30'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30'
              }`}
            >
              <span className="font-serif text-xs text-amber-600 dark:text-amber-400 block font-bold">
                {p.arabic}
              </span>
              <p className="font-bold text-sm text-slate-800 dark:text-slate-100 mt-0.5">
                {p.name}
              </p>
              <p className="font-mono text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                {p.time}
              </p>
              {p.isNext && (
                <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-600 text-white animate-pulse">
                  Berikutnya
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Activities / Agenda */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-emerald-600" />
            Agenda Kegiatan & Khutbah Jumat
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Jadwal pengajian rutin, khotib jumat, dan peringatan hari besar
          </p>
        </div>

        {can('create') && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Agenda</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events.map((evt) => (
          <div
            key={evt.id}
            className={`p-5 rounded-2xl border ${themeConfig.cardBg} flex flex-col justify-between hover:shadow-md transition-shadow`}
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  {evt.category}
                </span>
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {evt.date}
                </span>
              </div>

              <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-2 leading-snug">
                {evt.title}
              </h4>

              <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{evt.speaker}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{evt.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{evt.location}</span>
                </div>
              </div>
            </div>

            {can('delete') && (
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => setDeleteConfirmId(evt.id)}
                  className="text-xs text-rose-500 hover:text-rose-700 flex items-center gap-1 font-medium cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus Agenda
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Tambah Agenda / Kegiatan Masjid
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Nama Kegiatan / Judul Kajian
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Kajian Tafsir Jalalain Rutin"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Penceramah / Pemateri / Khotib
                </label>
                <input
                  type="text"
                  required
                  value={speaker}
                  onChange={(e) => setSpeaker(e.target.value)}
                  placeholder="Contoh: Ust. Dr. H. Khalid M."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Waktu
                  </label>
                  <input
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="19:30 - 21:00 WIB"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                >
                  Simpan Agenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={deleteConfirmId !== null}
        title="Hapus Agenda Kegiatan Masjid"
        itemName={events.find((e) => e.id === deleteConfirmId)?.title || 'Agenda'}
        message="Agenda atau jadwal kajian ini akan dihapus dari sistem dan kalender masjid. Apakah Anda yakin?"
        confirmText="Hapus Agenda"
        onConfirm={() => {
          if (deleteConfirmId) {
            onDeleteEvent(deleteConfirmId);
            setDeleteConfirmId(null);
          }
        }}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
};
