import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext.tsx';
import {
  Building,
  Save,
  Download,
  CheckCircle2,
  Printer,
  LayoutTemplate,
  Landmark,
  ShieldCheck,
  Database,
  KeyRound,
  PanelBottom,
  RotateCcw,
} from 'lucide-react';

import { ReportPrintModal } from './common/ReportPrintModal.tsx';
import { MosqueProfile } from '../types/index.ts';
import {
  DEFAULT_MOSQUE_PROFILE,
  getStoredMosqueProfile,
  saveStoredMosqueProfile,
  getDefaultOfficerName,
} from '../services/storage.ts';

interface MosqueSettingsViewProps {
  onProfileUpdated?: (profile: MosqueProfile) => void;
  onProfileLiveChange?: (profile: MosqueProfile) => void;
  currentProfile?: MosqueProfile;
}

export const MosqueSettingsView: React.FC<MosqueSettingsViewProps> = ({
  onProfileUpdated,
  onProfileLiveChange,
  currentProfile,
}) => {
  const { themeConfig } = useTheme();

  const [isSavedToast, setIsSavedToast] = useState(false);
  const [isReportPrintOpen, setIsReportPrintOpen] = useState(false);
  const [, setOfficerTick] = useState(0);

  useEffect(() => {
    const syncOfficers = () => setOfficerTick((t) => t + 1);
    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key === 'sabiluna_managed_users') syncOfficers();
    };
    window.addEventListener('managed-users-updated', syncOfficers);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('managed-users-updated', syncOfficers);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Mosque Profile State initialized from storage or props
  const [profile, setProfile] = useState<MosqueProfile>(() => {
    return currentProfile || getStoredMosqueProfile();
  });
  const profileRef = useRef<MosqueProfile>(profile);

  // Keep state in sync if external currentProfile changes (e.g. another tab)
  useEffect(() => {
    if (currentProfile && currentProfile !== profileRef.current) {
      profileRef.current = currentProfile;
      setProfile(currentProfile);
    }
  }, [currentProfile]);

  const updateProfileField = <K extends keyof MosqueProfile>(
    key: K,
    value: MosqueProfile[K]
  ) => {
    const next: MosqueProfile = { ...profileRef.current, [key]: value };
    profileRef.current = next;
    setProfile(next);
    saveStoredMosqueProfile(next);
    if (onProfileLiveChange) {
      onProfileLiveChange(next);
    }
  };

  const handleResetPortalAndFooter = () => {
    const next: MosqueProfile = {
      ...profileRef.current,
      portalBadge: DEFAULT_MOSQUE_PROFILE.portalBadge,
      portalDescription: DEFAULT_MOSQUE_PROFILE.portalDescription,
      portalFeature1Title: DEFAULT_MOSQUE_PROFILE.portalFeature1Title,
      portalFeature1Desc: DEFAULT_MOSQUE_PROFILE.portalFeature1Desc,
      portalFeature2Title: DEFAULT_MOSQUE_PROFILE.portalFeature2Title,
      portalFeature2Desc: DEFAULT_MOSQUE_PROFILE.portalFeature2Desc,
      portalFeature3Title: DEFAULT_MOSQUE_PROFILE.portalFeature3Title,
      portalFeature3Desc: DEFAULT_MOSQUE_PROFILE.portalFeature3Desc,
      footerBrandTitle: DEFAULT_MOSQUE_PROFILE.footerBrandTitle,
      footerBrandSubtitle: DEFAULT_MOSQUE_PROFILE.footerBrandSubtitle,
      loginFooterCenter: DEFAULT_MOSQUE_PROFILE.loginFooterCenter,
    };
    profileRef.current = next;
    setProfile(next);
    saveStoredMosqueProfile(next);
    if (onProfileLiveChange) {
      onProfileLiveChange(next);
    }
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 2500);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const current = profileRef.current;
    saveStoredMosqueProfile(current);
    if (onProfileUpdated) {
      onProfileUpdated(current);
    } else {
      setIsSavedToast(true);
      setTimeout(() => setIsSavedToast(false), 2500);
    }
  };

  const handleExportBackup = () => {
    const backupData = {
      transactions: localStorage.getItem('sabiluna_transactions'),
      inventory: localStorage.getItem('sabiluna_inventory'),
      jamaah: localStorage.getItem('sabiluna_jamaah'),
      events: localStorage.getItem('sabiluna_events'),
      zakat: localStorage.getItem('sabiluna_zakat_records'),
      friday: localStorage.getItem('sabiluna_friday_schedules'),
      incomingLetters: localStorage.getItem('sabiluna_incoming_letters'),
      outgoingLetters: localStorage.getItem('sabiluna_outgoing_letters'),
      profile: localStorage.getItem('sabiluna_mosque_profile'),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_sabiluna_masjid_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {isSavedToast && (
        <div className="fixed bottom-4 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-600 text-white text-xs font-bold shadow-2xl max-w-md sm:w-auto animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="min-w-0 break-words">Pengaturan Profil Masjid Berhasil Disimpan!</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white border border-emerald-900/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/30">
            Konfigurasi & Identitas Masjid
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white mt-1.5">
            Profil & Pengaturan Sistem
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Kelola legalitas masjid, nomor rekening infaq, QRIS penerimaan zakat, serta cadangkan database.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setIsReportPrintOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 shadow-md transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-emerald-300" />
            <span>Cetak Lembar Profil</span>
          </button>

          <button
            type="button"
            onClick={handleExportBackup}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Backup Seluruh Database</span>
          </button>
        </div>
      </div>

      {/* Profile & Banking Form */}
      <form onSubmit={handleSaveProfile} className={`p-4 sm:p-6 rounded-2xl border ${themeConfig.cardBg} space-y-4`}>
          <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Building className="w-5 h-5 text-emerald-600" />
            Identitas Legal & Rekening Infaq Masjid
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Nama Resmi Masjid
              </label>
              <input
                type="text"
                required
                value={profile.name}
                onChange={(e) => updateProfileField('name', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Alamat Lengkap Masjid
              </label>
              <input
                type="text"
                value={profile.address || ''}
                onChange={(e) => updateProfileField('address', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Nomor Kontak Sekretariat DKM
              </label>
              <input
                type="text"
                value={profile.phone || ''}
                onChange={(e) => updateProfileField('phone', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Nomor Telepon / WA Administrator DKM
              </label>
              <input
                type="text"
                value={profile.adminPhone ?? ''}
                onChange={(e) => updateProfileField('adminPhone', e.target.value)}
                placeholder="Contoh: 0811-2233-4455"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none font-mono focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Ditampilkan pada pesan bantuan kendala masuk akun di halaman login.
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Surel / Email Resmi
              </label>
              <input
                type="email"
                value={profile.email || ''}
                onChange={(e) => updateProfileField('email', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Rekening Kas BSI (Bank Syariah Indonesia)
              </label>
              <input
                type="text"
                value={profile.bankBSI || ''}
                onChange={(e) => updateProfileField('bankBSI', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none font-mono focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Atas Nama Rekening
              </label>
              <input
                type="text"
                value={profile.bankAccountName || ''}
                onChange={(e) => updateProfileField('bankAccountName', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Data QRIS Merchant Masjid (NMID)
              </label>
              <input
                type="text"
                value={profile.qrisMerchant || ''}
                onChange={(e) => updateProfileField('qrisMerchant', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none font-mono focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Simpan Profil Masjid
            </button>
          </div>
      </form>

      {/* Portal Login Card & Footer Customization */}
      <div className={`p-4 sm:p-6 rounded-2xl border ${themeConfig.cardBg} space-y-6`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <LayoutTemplate className="w-5 h-5 text-emerald-600" />
              Kustomisasi Kartu Portal Login & Footer Aplikasi
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Setiap perubahan langsung diterapkan otomatis secara real-time pada halaman login maupun footer aplikasi.
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetPortalAndFooter}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer self-start sm:self-center"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Kembalikan Teks Bawaan</span>
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left: Form Inputs for Portal Card & Footer */}
          <div className="xl:col-span-7 space-y-5 text-xs">
            {/* Subsection 1: Kartu Portal Login */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                1. Teks Kartu Informasi Portal Login
              </h4>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Badge Atas Kartu
                </label>
                <input
                  type="text"
                  value={profile.portalBadge ?? ''}
                  onChange={(e) => updateProfileField('portalBadge', e.target.value)}
                  placeholder="SYAMIL · Sistem Manajemen Masjid Terpadu"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Deskripsi Singkat Di Bawah Nama Masjid
                </label>
                <textarea
                  rows={2}
                  value={profile.portalDescription ?? ''}
                  onChange={(e) => updateProfileField('portalDescription', e.target.value)}
                  placeholder="Platform terpadu untuk mengelola administrasi, keuangan, aset, dan kegiatan masjid."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
                <div className="sm:col-span-2 font-semibold text-slate-600 dark:text-slate-300">
                  Poin Keunggulan 1
                </div>
                <input
                  type="text"
                  value={profile.portalFeature1Title ?? ''}
                  onChange={(e) => updateProfileField('portalFeature1Title', e.target.value)}
                  placeholder="Judul poin 1..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-emerald-500"
                />
                <input
                  type="text"
                  value={profile.portalFeature1Desc ?? ''}
                  onChange={(e) => updateProfileField('portalFeature1Desc', e.target.value)}
                  placeholder="Keterangan poin 1..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-emerald-500"
                />

                <div className="sm:col-span-2 font-semibold text-slate-600 dark:text-slate-300 pt-1">
                  Poin Keunggulan 2
                </div>
                <input
                  type="text"
                  value={profile.portalFeature2Title ?? ''}
                  onChange={(e) => updateProfileField('portalFeature2Title', e.target.value)}
                  placeholder="Judul poin 2..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-emerald-500"
                />
                <input
                  type="text"
                  value={profile.portalFeature2Desc ?? ''}
                  onChange={(e) => updateProfileField('portalFeature2Desc', e.target.value)}
                  placeholder="Keterangan poin 2..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-emerald-500"
                />

                <div className="sm:col-span-2 font-semibold text-slate-600 dark:text-slate-300 pt-1">
                  Poin Keunggulan 3
                </div>
                <input
                  type="text"
                  value={profile.portalFeature3Title ?? ''}
                  onChange={(e) => updateProfileField('portalFeature3Title', e.target.value)}
                  placeholder="Judul poin 3..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-emerald-500"
                />
                <input
                  type="text"
                  value={profile.portalFeature3Desc ?? ''}
                  onChange={(e) => updateProfileField('portalFeature3Desc', e.target.value)}
                  placeholder="Keterangan poin 3..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Subsection 2: Pengaturan Footer */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <PanelBottom className="w-4 h-4" />
                2. Pengaturan Footer Aplikasi & Halaman Login
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Nama / Versi Brand Footer
                  </label>
                  <input
                    type="text"
                    value={profile.footerBrandTitle ?? ''}
                    onChange={(e) => updateProfileField('footerBrandTitle', e.target.value)}
                    placeholder="SYAMIL v2.0"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Slogan / Subjudul Footer
                  </label>
                  <input
                    type="text"
                    value={profile.footerBrandSubtitle ?? ''}
                    onChange={(e) => updateProfileField('footerBrandSubtitle', e.target.value)}
                    placeholder="Sistem Manajemen Masjid Terpadu"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Teks Footer Halaman Login (Opsional)
                  </label>
                  <input
                    type="text"
                    value={profile.loginFooterCenter ?? ''}
                    onChange={(e) => updateProfileField('loginFooterCenter', e.target.value)}
                    placeholder={`Otomatis: ${profile.name} © 2026`}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Live Preview mirroring Login Card */}
          <div className="xl:col-span-5 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Pratinjau Langsung Kartu Portal Login
            </span>

            <div className="rounded-2xl sm:rounded-3xl border border-emerald-900/50 bg-[#08130e] p-4 sm:p-7 text-slate-100 shadow-xl space-y-4 sm:space-y-5 overflow-hidden">
              {(profile.portalBadge ?? 'SYAMIL · Sistem Manajemen Masjid Terpadu') && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/30 text-emerald-400 text-[11px] sm:text-xs font-semibold max-w-full">
                  <Landmark className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span className="break-words">
                    {profile.portalBadge ?? 'SYAMIL · Sistem Manajemen Masjid Terpadu'}
                  </span>
                </div>
              )}

              <div>
                <h4 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-tight break-words">
                  {profile.name || "Masjid Jami' Al-Barkah"}
                </h4>
                {(profile.portalDescription ??
                  'Platform terpadu untuk mengelola administrasi, keuangan, aset, dan kegiatan masjid.') && (
                  <p className="text-xs text-slate-400 leading-relaxed mt-2 break-words">
                    {profile.portalDescription ??
                      'Platform terpadu untuk mengelola administrasi, keuangan, aset, dan kegiatan masjid.'}
                  </p>
                )}
              </div>

              <div className="space-y-3.5 pt-1">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-white">
                      {profile.portalFeature1Title ?? 'Hak Akses Berbasis Peran (RBAC)'}
                    </p>
                    <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                      {profile.portalFeature1Desc ??
                        'Pemisahan wewenang Admin, Sekretaris, Bendahara, dan Humas.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-white">
                      {profile.portalFeature2Title ?? 'Keamanan & Enkripsi Data'}
                    </p>
                    <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                      {profile.portalFeature2Desc ??
                        'Pencegahan SQL Injection, password hash bcrypt, dan audit trail log.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-white">
                      {profile.portalFeature3Title ?? 'Autentikasi Token JWT HS256'}
                    </p>
                    <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                      {profile.portalFeature3Desc ??
                        'Sesi aman terenkripsi dengan proteksi logout menyeluruh.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-emerald-950 text-[10px] text-slate-400 flex flex-col gap-1">
                <span className="text-slate-500">
                  Bantuan Login:{' '}
                  {(profile.adminPhone?.trim() || profile.phone?.trim())
                    ? `Silakan hubungi ${profile.adminPhone?.trim() || profile.phone?.trim()} Administrator DKM`
                    : 'Silakan hubungi Administrator DKM'}
                </span>
                <span className="text-slate-500">
                  Footer Login:{' '}
                  {profile.loginFooterCenter?.trim()
                    ? profile.loginFooterCenter
                    : `${profile.name || "Masjid Jami' Al-Barkah"} © 2026${
                        (profile.footerBrandSubtitle ?? 'SYAMIL (Sistem Manajemen Terpadu Masjid)')
                          ? ` · ${profile.footerBrandSubtitle ?? 'SYAMIL (Sistem Manajemen Terpadu Masjid)'}`
                          : ''
                      }`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tombol Simpan Eksplisit untuk Portal & Footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Perubahan tersinkron otomatis saat mengetik. Klik simpan untuk konfirmasi & menyimpan seluruh pengaturan.
          </p>
          <button
            type="button"
            onClick={(e) => handleSaveProfile(e)}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 cursor-pointer self-end sm:self-auto"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Perubahan Portal & Footer</span>
          </button>
        </div>
      </div>

      {/* Printable Report Modal: Mosque Profile */}
      <ReportPrintModal
        isOpen={isReportPrintOpen}
        onClose={() => setIsReportPrintOpen(false)}
        title="LEMBAR IDENTITAS LEGAL & PROFIL RESMI MASJID"
        subtitle={`Dokumentasi Resmi Kelembagaan & Rekening Donasi DKM ${profile.name}`}
        periodText="Dokumentasi Profil Resmi DKM"
        summaryCards={[
          { label: 'Tahun Pendirian', value: `${profile.foundedYear || '1988'} M`, color: 'emerald' },
          { label: 'Kota Administrasi', value: profile.city || 'DKI Jakarta', color: 'blue' },
          { label: 'Rekening Operasional', value: profile.bankBSI || '7112-8899-001 (BSI)', color: 'purple' },
          { label: 'Status Legalitas', value: 'Terverifikasi Resmi', color: 'amber' },
        ]}
        columns={[
          { header: 'No', key: 'no', width: '6%', align: 'center' },
          { header: 'Parameter Kelembagaan', key: 'field', width: '34%' },
          { header: 'Keterangan Data Resmi', key: 'value', width: '60%' },
        ]}
        data={[
          { no: 1, field: 'Nama Lengkap Rumah Ibadah', value: profile.name },
          { no: 2, field: 'Tahun Pendirian Masjid', value: `Tahun ${profile.foundedYear} Masehi` },
          { no: 3, field: 'Alamat Lengkap Lokasi', value: profile.address },
          { no: 4, field: 'Kota / Wilayah Administrasi', value: profile.city },
          { no: 5, field: 'Kontak Sekretariat', value: `${profile.phone} | Email: ${profile.email}` },
          { no: 6, field: 'Ketua Umum DKM', value: profile.leadPerson },
          { no: 7, field: 'Rekening Bank Penerimaan Infaq', value: `${profile.bankBSI} a.n. ${profile.bankAccountName}` },
          { no: 8, field: 'Merchant QRIS Resmi', value: profile.qrisMerchant },
        ]}
        notes="Dokumen profil resmi ini diterbitkan untuk keperluan verifikasi legalitas, pembukaan rekening syariah, dan arsip kelembagaan DKM."
        signatures={[
          { role: 'Ketua DKM (Admin)', name: profile.leadPerson || getDefaultOfficerName('admin', 'Drs. KH. Ahmad Muzammil'), position: `Ketua Umum DKM ${profile.name}` },
          { role: 'Sekretaris DKM', name: getDefaultOfficerName('sekretaris', 'Ust. Farhan Basalamah, S.Kom'), position: 'Sekretaris Umum' },
          { role: 'Bendahara Keuangan', name: getDefaultOfficerName('bendahara', 'H. Ahmad Sobari, SE, Ak.'), position: 'Bendahara Umum' },
        ]}
      />
    </div>
  );
};
