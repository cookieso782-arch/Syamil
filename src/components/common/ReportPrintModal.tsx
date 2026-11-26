import React, { useEffect, useRef, useState } from 'react';
import {
  Printer,
  X,
  Download,
  Landmark,
  CheckCircle2,
  Loader2,
  PenTool,
  Trash2,
  UserCog,
  Pencil,
  RotateCcw,
  Check,
} from 'lucide-react';
import { generateOfficialPdfReport, printElementViaIframe } from '../../services/pdfService.ts';
import {
  DEFAULT_MOSQUE_PROFILE,
  formatDkmHeaderTitle,
  formatReportCity,
  getStoredMosqueProfile,
  getStoredSignatureForSigner,
  saveStoredSignatureForSigner,
  getStoredReportSigners,
  saveStoredReportSigners,
  removeStoredReportSignerKeys,
  normalizeReportSignerRoleKey,
} from '../../services/storage.ts';
import { MosqueProfile } from '../../types/index.ts';
import { DigitalSignaturePadModal } from './DigitalSignaturePadModal.tsx';

export interface SummaryCardItem {
  label: string;
  value: string;
  sublabel?: string;
  color?: 'emerald' | 'rose' | 'blue' | 'amber' | 'slate' | 'purple';
}

export interface ReportColumn {
  header: string;
  key?: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface ReportSignerItem {
  role: string;
  name: string;
  position?: string;
}

export interface ReportPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  periodText?: string;
  categoryName?: string;
  summaryCards?: SummaryCardItem[];
  tableHeaders?: string[];
  tableRows?: Array<Array<string | number>>;
  tableAligns?: Array<'left' | 'center' | 'right'>;
  columns?: ReportColumn[];
  data?: Array<Record<string, any>>;
  notes?: string;
  footerNotes?: string;
  signatures?: ReportSignerItem[];
}

const DEFAULT_SIGNATURES: ReportSignerItem[] = [
  { role: 'Ketua DKM (Admin)', name: 'Drs. KH. Ahmad Muzammil', position: 'Ketua Umum DKM' },
  { role: 'Sekretaris DKM', name: 'Ust. Farhan Basalamah, S.Kom', position: 'Sekretaris Umum' },
  { role: 'Bendahara Keuangan', name: 'H. Ahmad Sobari, SE, Ak.', position: 'Bendahara Umum' },
];

export const ReportPrintModal: React.FC<ReportPrintModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  periodText,
  categoryName,
  summaryCards,
  tableHeaders: propHeaders,
  tableRows: propRows,
  tableAligns: propAligns = [],
  columns,
  data,
  notes,
  footerNotes: propFooterNotes,
  signatures = DEFAULT_SIGNATURES,
}) => {
  const printSheetRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const signerNameInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);
  const [signatureMap, setSignatureMap] = useState<Record<number, string>>({});
  const [activeSignerIndex, setActiveSignerIndex] = useState<number | null>(null);
  const [isEditingSigners, setIsEditingSigners] = useState(false);
  const [editableSignatures, setEditableSignatures] = useState<ReportSignerItem[]>(signatures);
  const [mosqueProfile, setMosqueProfile] = useState<MosqueProfile>(() => getStoredMosqueProfile());
  const [now, setNow] = useState<Date>(() => new Date());

  // Live real-time print date/time clock while preview is open
  useEffect(() => {
    if (!isOpen) return;
    setNow(new Date());
    const timer = setInterval(() => {
      setNow(new Date());
    }, 5000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Sync mosque profile immediately whenever settings change or modal opens
  useEffect(() => {
    const syncProfile = () => {
      setMosqueProfile(getStoredMosqueProfile());
    };
    if (isOpen) {
      syncProfile();
    }
    window.addEventListener('mosque-profile-updated', syncProfile);
    window.addEventListener('storage', syncProfile);
    return () => {
      window.removeEventListener('mosque-profile-updated', syncProfile);
      window.removeEventListener('storage', syncProfile);
    };
  }, [isOpen]);

  // Compute table headers, rows, and aligns from columns & data if provided
  const tableHeaders = propHeaders || (columns ? columns.map((c) => c.header) : []);
  const tableAligns = propAligns.length > 0
    ? propAligns
    : columns
    ? columns.map((c) => c.align || 'left')
    : [];
  const tableRows = propRows || (columns && data
    ? data.map((item) =>
        columns.map((c) => (c.key ? String(item[c.key] ?? '') : ''))
      )
    : []);
  const footerNotes = notes || propFooterNotes;

  const signaturesKey = signatures
    .map((s) => `${s.role}::${s.name}::${s.position || ''}`)
    .join('|');

  // Resolve editable signers (with stored overrides) and load saved signatures when modal opens or storage changes
  useEffect(() => {
    if (!isOpen) return;
    const syncSignersAndSignatures = () => {
      const storedOverrides = getStoredReportSigners();
      const resolvedSigners = signatures.map((sig) => {
        const override = storedOverrides[normalizeReportSignerRoleKey(sig.role)];
        if (!override) return { ...sig };
        return {
          role: sig.role,
          name: override.name && override.name.trim() !== '' ? override.name : sig.name,
          position: override.position !== undefined ? override.position : sig.position,
        };
      });

      setEditableSignatures(resolvedSigners);

      const initial: Record<number, string> = {};
      resolvedSigners.forEach((sig, idx) => {
        const saved = getStoredSignatureForSigner(sig.role, sig.name);
        if (saved) {
          initial[idx] = saved;
        }
      });
      setSignatureMap(initial);
    };

    syncSignersAndSignatures();
    setActiveSignerIndex(null);
    setIsEditingSigners(false);

    const handleStorageSync = (e: StorageEvent) => {
      if (
        !e.key ||
        e.key === 'sabiluna_report_signers' ||
        e.key === 'sabiluna_signatures'
      ) {
        syncSignersAndSignatures();
      }
    };

    window.addEventListener('report-signers-updated', syncSignersAndSignatures);
    window.addEventListener('signatures-updated', syncSignersAndSignatures);
    window.addEventListener('storage', handleStorageSync);
    return () => {
      window.removeEventListener('report-signers-updated', syncSignersAndSignatures);
      window.removeEventListener('signatures-updated', syncSignersAndSignatures);
      window.removeEventListener('storage', handleStorageSync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, signaturesKey]);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeSignerIndex !== null) return;
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, activeSignerIndex]);

  if (!isOpen) return null;

  const currentDate = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const currentTime = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const getPdfFilename = () => {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40);
    const dateStr = new Date().toISOString().slice(0, 10);
    return `${slug}_${dateStr}.pdf`;
  };

  const activeSigners =
    editableSignatures.length === signatures.length ? editableSignatures : signatures;

  const enrichedSignatures = activeSigners.map((sig, idx) => ({
    ...sig,
    name: sig.name.trim() || signatures[idx]?.name || sig.role,
    signatureDataUrl: signatureMap[idx],
  }));

  const signedCount = Object.values(signatureMap).filter(Boolean).length;

  const hasCustomOverrides = activeSigners.some((sig, idx) => {
    const def = signatures[idx];
    if (!def) return false;
    return (
      sig.name !== def.name || (sig.position || '') !== (def.position || '')
    );
  });

  const handleSignerFieldChange = (
    idx: number,
    field: 'name' | 'position',
    value: string
  ) => {
    setEditableSignatures((prev) => {
      const base = prev.length === signatures.length ? [...prev] : [...signatures];
      const current = base[idx];
      if (!current) return prev;
      const updatedItem: ReportSignerItem = {
        ...current,
        [field]: value,
      };
      base[idx] = updatedItem;

      // Persist immediately under normalized base role key
      const roleKey = normalizeReportSignerRoleKey(signatures[idx]?.role || current.role);
      const stored = getStoredReportSigners();
      const effectiveName = updatedItem.name.trim();
      if (
        effectiveName !== (signatures[idx]?.name || '') ||
        (updatedItem.position || '') !== (signatures[idx]?.position || '')
      ) {
        stored[roleKey] = {
          name: effectiveName || signatures[idx]?.name || '',
          position: updatedItem.position,
        };
      } else {
        delete stored[roleKey];
      }
      saveStoredReportSigners(stored);

      return base;
    });
  };

  const handleResetSigners = () => {
    removeStoredReportSignerKeys(signatures.map((s) => s.role));
    const resetList = signatures.map((s) => ({ ...s }));
    setEditableSignatures(resetList);

    const refreshedMap: Record<number, string> = {};
    resetList.forEach((sig, idx) => {
      const saved = getStoredSignatureForSigner(sig.role, sig.name);
      if (saved) {
        refreshedMap[idx] = saved;
      }
    });
    setSignatureMap(refreshedMap);
  };

  const handleFocusSignerEditor = (idx: number) => {
    setIsEditingSigners(true);
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setTimeout(() => {
      const inputEl = signerNameInputRefs.current[idx];
      if (inputEl) {
        inputEl.focus();
        inputEl.select();
      }
    }, 80);
  };

  const handleSaveSignature = (dataUrl: string, rememberSignature: boolean) => {
    if (activeSignerIndex === null) return;
    const sig = enrichedSignatures[activeSignerIndex];
    setSignatureMap((prev) => ({ ...prev, [activeSignerIndex]: dataUrl }));
    if (rememberSignature && sig) {
      saveStoredSignatureForSigner(sig.role, sig.name, dataUrl);
    }
  };

  const handleRemoveSignature = (idx: number) => {
    const sig = enrichedSignatures[idx];
    setSignatureMap((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
    if (sig) {
      saveStoredSignatureForSigner(sig.role, sig.name, null);
    }
  };

  const handleDownloadPdf = () => {
    setNow(new Date());
    setIsExportingPdf(true);
    try {
      const ok = generateOfficialPdfReport({
        title,
        subtitle,
        periodText,
        categoryName,
        summaryCards,
        tableHeaders,
        tableRows,
        tableAligns,
        footerNotes,
        signatures: enrichedSignatures,
        filename: getPdfFilename(),
      });
      if (ok) {
        setPdfSuccessMessage('File PDF resmi berhasil diunduh ke perangkat Anda!');
        setTimeout(() => setPdfSuccessMessage(null), 4000);
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    setNow(new Date());
    if (printSheetRef.current) {
      printElementViaIframe(printSheetRef.current, title);
    } else {
      window.print();
    }
  };

  return (
    <div className="print-modal-container fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in overflow-y-auto print:p-0 print:m-0 print:bg-transparent print:static print:inset-auto">
      {/* Toast Notification for PDF download */}
      {pdfSuccessMessage && (
        <div className="fixed top-4 sm:top-6 left-4 right-4 sm:left-auto sm:right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-600 text-white text-xs font-bold shadow-2xl animate-in slide-in-from-top-3 no-print">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{pdfSuccessMessage}</span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl max-w-4xl w-full max-h-[94vh] sm:max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto print:border-none print:shadow-none print:max-w-none print:max-h-none print:bg-transparent">
        {/* Modal Top Bar (Hidden on print) */}
        <div className="no-print p-3.5 sm:p-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/50 flex-shrink-0">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex-shrink-0">
                <Printer className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                  Pratinjau & Cetak Laporan Resmi
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Dokumen resmi ber-KOP DKM (SIMAS Kemenag RI) & kolom tanda tangan
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer flex-shrink-0"
              title="Tutup"
              aria-label="Tutup Pratinjau"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Edit Signers Toggle Button */}
            <button
              type="button"
              onClick={() => setIsEditingSigners((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer border ${
                isEditingSigners
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 shadow-sm'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title="Edit nama Ketua DKM, Bendahara, Sekretaris, atau Humas yang tertera pada laporan"
            >
              <UserCog className="w-4 h-4" />
              <span>Edit Penandatangan</span>
            </button>

            {/* Quick Sign Button */}
            <button
              type="button"
              onClick={() => setActiveSignerIndex(0)}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
              title="Gambar tanda tangan digital langsung di atas dokumen"
            >
              <PenTool className="w-4 h-4" />
              <span>
                Tanda Tangan{signedCount > 0 ? ` (${signedCount}/${activeSigners.length})` : ''}
              </span>
            </button>

            {/* Direct PDF Download Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all cursor-pointer disabled:opacity-60"
              title="Unduh langsung dokumen format PDF ke penyimpanan perangkat"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Membuat PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Unduh File PDF</span>
                </>
              )}
            </button>

            {/* Print / Cetak Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              title="Cetak langsung menggunakan printer atau dialog cetak peramban"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Print</span>
            </button>

            <button
              onClick={onClose}
              className="hidden lg:inline-flex p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
              title="Tutup"
              aria-label="Tutup Pratinjau"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Sheet */}
        <div
          ref={scrollAreaRef}
          className="p-2.5 sm:p-8 overflow-y-auto flex-1 bg-slate-100 dark:bg-slate-950/40 print:p-0 print:m-0 print:bg-transparent print:overflow-visible"
        >
          {/* Editable Signer Names Panel (Hidden on print) */}
          {isEditingSigners && (
            <div className="no-print max-w-3xl mx-auto mb-4 sm:mb-5 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/70 shadow-sm space-y-3 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <UserCog className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span>Edit Nama & Jabatan Penandatangan</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Perubahan langsung tampil di dokumen cetak serta PDF dan tersimpan otomatis untuk laporan berikutnya.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {hasCustomOverrides && (
                    <button
                      type="button"
                      onClick={handleResetSigners}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                      title="Kembalikan ke nama default"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Default</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsEditingSigners(false)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Selesai</span>
                  </button>
                </div>
              </div>

              <div
                className={`grid grid-cols-1 ${
                  activeSigners.length === 2
                    ? 'sm:grid-cols-2'
                    : activeSigners.length >= 3
                    ? 'sm:grid-cols-2 lg:grid-cols-3'
                    : ''
                } gap-3`}
              >
                {activeSigners.map((sig, idx) => (
                  <div
                    key={`${sig.role}-${idx}`}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 truncate">
                        {sig.role}
                      </span>
                    </div>

                    <div>
                      <label
                        htmlFor={`signer-name-input-${idx}`}
                        className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1"
                      >
                        Nama Penandatangan
                      </label>
                      <input
                        id={`signer-name-input-${idx}`}
                        ref={(el) => {
                          signerNameInputRefs.current[idx] = el;
                        }}
                        type="text"
                        value={sig.name}
                        onChange={(e) => handleSignerFieldChange(idx, 'name', e.target.value)}
                        placeholder={signatures[idx]?.name || 'Masukkan nama pejabat'}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`signer-pos-input-${idx}`}
                        className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1"
                      >
                        Jabatan / Keterangan (Opsional)
                      </label>
                      <input
                        id={`signer-pos-input-${idx}`}
                        type="text"
                        value={sig.position || ''}
                        onChange={(e) => handleSignerFieldChange(idx, 'position', e.target.value)}
                        placeholder={signatures[idx]?.position || 'Contoh: Bendahara Umum'}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-[11px] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div
            ref={printSheetRef}
            id="printable-report"
            className="printable-area max-w-3xl mx-auto p-4 sm:p-10 rounded-2xl bg-white text-slate-900 shadow-md border border-slate-200 font-sans space-y-5 sm:space-y-6 print:m-0 print:p-0 print:border-none print:shadow-none"
          >
            {/* Kop Surat Resmi Masjid */}
            <div className="text-center border-b-2 border-slate-900 pb-4 relative">
              <p className="text-xs tracking-widest text-slate-500 uppercase font-serif mb-1">
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-base flex-shrink-0">
                  <Landmark className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-xl font-extrabold tracking-wide text-emerald-900 font-serif break-words">
                    {formatDkmHeaderTitle(mosqueProfile.name)}
                  </h1>
                  <p className="text-[11px] sm:text-xs text-slate-700">
                    {mosqueProfile.address || DEFAULT_MOSQUE_PROFILE.address} • Telp: {mosqueProfile.phone || DEFAULT_MOSQUE_PROFILE.phone}
                  </p>
                  <p className="text-[11px] text-slate-500 break-all sm:break-normal">
                    SK Kemenag RI No. SIMAS: {mosqueProfile.simasNumber || DEFAULT_MOSQUE_PROFILE.simasNumber} • {mosqueProfile.email || DEFAULT_MOSQUE_PROFILE.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Judul & Meta Informasi Laporan */}
            <div className="text-center space-y-1">
              <h2 className="text-base sm:text-lg font-bold uppercase tracking-wider text-slate-900 underline underline-offset-4 decoration-2 decoration-emerald-600">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs text-slate-600 italic">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Parameter & Periode */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 border-y border-slate-200 py-2 gap-2 bg-slate-50/70 px-3 rounded-lg">
              <div>
                <span className="font-semibold text-slate-800">Periode Data: </span>
                <span>{periodText || 'Semua Data Terverifikasi'}</span>
                {categoryName && (
                  <span className="ml-2 font-semibold text-emerald-700">
                    • Kategori: {categoryName}
                  </span>
                )}
              </div>
              <div className="text-left sm:text-right">
                <span className="font-semibold text-slate-800">Dicetak: </span>
                <span>{currentDate}, Pukul {currentTime} WIB</span>
              </div>
            </div>

            {/* Summary KPI Cards (If provided) */}
            {summaryCards && summaryCards.length > 0 && (
              <div
                className={`grid grid-cols-2 ${
                  summaryCards.length === 1
                    ? 'sm:grid-cols-1'
                    : summaryCards.length === 2
                    ? 'sm:grid-cols-2'
                    : summaryCards.length >= 4
                    ? 'sm:grid-cols-4'
                    : 'sm:grid-cols-3'
                } gap-3`}
              >
                {summaryCards.map((card, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-left space-y-0.5"
                  >
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                      {card.label}
                    </p>
                    <p className="text-sm font-bold text-slate-900 font-mono">
                      {card.value}
                    </p>
                    {card.sublabel && (
                      <p className="text-[10px] text-slate-500 truncate">
                        {card.sublabel}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Data Table */}
            <div className="border border-slate-300 rounded-xl overflow-x-auto print:overflow-visible">
              <table className="w-full min-w-[580px] sm:min-w-full print:min-w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3 w-8 text-center border-r border-slate-300">No</th>
                    {tableHeaders.map((header, idx) => (
                      <th
                        key={idx}
                        className={`py-2.5 px-3 border-r last:border-r-0 border-slate-300 ${
                          tableAligns[idx] === 'right'
                            ? 'text-right'
                            : tableAligns[idx] === 'center'
                            ? 'text-center'
                            : 'text-left'
                        }`}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {tableRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={tableHeaders.length + 1}
                        className="py-8 text-center text-slate-400 italic"
                      >
                        Tidak ada data yang dicatat dalam laporan ini.
                      </td>
                    </tr>
                  ) : (
                    tableRows.map((row, rowIdx) => (
                      <tr
                        key={rowIdx}
                        className={rowIdx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}
                      >
                        <td className="py-2 px-3 text-center border-r border-slate-200 text-slate-500 font-mono text-[11px]">
                          {rowIdx + 1}
                        </td>
                        {row.map((cell, cellIdx) => (
                          <td
                            key={cellIdx}
                            className={`py-2 px-3 border-r last:border-r-0 border-slate-200 ${
                              tableAligns[cellIdx] === 'right'
                                ? 'text-right font-mono'
                                : tableAligns[cellIdx] === 'center'
                                ? 'text-center'
                                : 'text-left'
                            }`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Notes / Rekomendasi */}
            {footerNotes ? (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                <strong>Catatan & Keterangan Tambahan:</strong>
                <p className="mt-0.5">{footerNotes}</p>
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 italic text-center">
                Dokumen ini merupakan laporan resmi dan sah yang digenerate secara otomatis melalui Sistem SYAMIL DKM {mosqueProfile.name || DEFAULT_MOSQUE_PROFILE.name}.
              </p>
            )}

            {/* Lembar Tanda Tangan & Pengesahan */}
            <div className="pt-6 border-t border-slate-200">
              <div className="text-right text-xs mb-4">
                {formatReportCity(mosqueProfile.city)}, {currentDate}
              </div>

              <div className={`grid grid-cols-1 ${activeSigners.length === 2 ? 'sm:grid-cols-2 print:grid-cols-2' : activeSigners.length >= 3 ? 'sm:grid-cols-2 md:grid-cols-3 print:grid-cols-3' : 'sm:grid-cols-1'} gap-6 text-center text-xs`}>
                {activeSigners.map((sig, idx) => {
                  const sigImg = signatureMap[idx];
                  const displayName = sig.name.trim() || signatures[idx]?.name || sig.role;
                  return (
                    <div key={idx} className="space-y-1">
                      <p className="font-semibold text-slate-600">{sig.role}</p>
                      <div className="min-h-[72px] flex flex-col items-center justify-end py-1">
                        {sigImg ? (
                          <div className="group relative flex flex-col items-center">
                            <img
                              src={sigImg}
                              alt={`Tanda tangan ${displayName}`}
                              className="sig-img"
                              style={{
                                height: '56px',
                                maxWidth: '150px',
                                width: 'auto',
                                objectFit: 'contain',
                                display: 'block',
                                margin: '0 auto',
                              }}
                            />
                            <div className="no-print flex items-center gap-1 mt-1">
                              <button
                                type="button"
                                onClick={() => setActiveSignerIndex(idx)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 hover:bg-emerald-50 text-[10px] font-semibold text-slate-600 hover:text-emerald-700 border border-slate-200 cursor-pointer transition-colors"
                              >
                                <PenTool className="w-2.5 h-2.5" />
                                <span>Ubah</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveSignature(idx)}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 hover:bg-rose-50 text-[10px] font-semibold text-slate-500 hover:text-rose-600 border border-slate-200 cursor-pointer transition-colors"
                                title="Hapus tanda tangan"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1.5">
                            <span className="text-[10px] text-slate-300 italic select-none">
                              (Tanda Tangan & Cap DKM)
                            </span>
                            <button
                              type="button"
                              onClick={() => setActiveSignerIndex(idx)}
                              className="no-print inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-emerald-400 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold cursor-pointer transition-colors"
                            >
                              <PenTool className="w-3 h-3" />
                              <span>Tanda Tangani</span>
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="inline-flex items-center justify-center gap-1 border-t border-slate-400 pt-1 min-w-[140px]">
                        <span className="font-bold text-slate-900">
                          {displayName}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleFocusSignerEditor(idx)}
                          className="no-print p-0.5 rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title={`Edit nama ${sig.role}`}
                          aria-label={`Edit nama ${sig.role}`}
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                      {sig.position && sig.position.trim() !== '' && (
                        <p className="text-[10px] text-slate-500">{sig.position}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Bar (Hidden on print) */}
        <div className="no-print p-3.5 sm:p-4 sm:px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 text-xs flex-shrink-0">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-center sm:text-left">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Format cetak standar resmi DKM (A4 & Ekspor PDF)</span>
          </div>

          <div className="flex items-center justify-center sm:justify-end gap-2 flex-wrap w-full sm:w-auto">
            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md shadow-purple-600/20 cursor-pointer transition-all disabled:opacity-60"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Membuat PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Unduh File PDF</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Sekarang (Print)</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold cursor-pointer transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>

      {/* Digital Signature Pad Modal */}
      {activeSignerIndex !== null && enrichedSignatures[activeSignerIndex] && (
        <DigitalSignaturePadModal
          isOpen={true}
          onClose={() => setActiveSignerIndex(null)}
          signerRole={enrichedSignatures[activeSignerIndex].role}
          signerName={enrichedSignatures[activeSignerIndex].name}
          initialSignature={signatureMap[activeSignerIndex] || null}
          onSave={handleSaveSignature}
          onClearExisting={() => handleRemoveSignature(activeSignerIndex)}
        />
      )}
    </div>
  );
};

