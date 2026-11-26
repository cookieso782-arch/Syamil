import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { formatCurrencyIDR, getStoredMustahik, saveStoredMustahik, getStoredZakatRecords, saveStoredZakatRecords, getStoredMosqueProfile, getDefaultOfficerName } from '../services/storage.ts';
import { Mustahik, Asnaf8, ZakatRecord, MosqueProfile } from '../types/index.ts';
import {
  HeartHandshake,
  UserCheck,
  Plus,
  FileSpreadsheet,
  Search,
  CheckCircle2,
  Clock,
  X,
  Edit2,
  Trash2,
  Gift,
  MapPin,
  Phone,
  ShieldCheck,
  Users,
  Eye,
  EyeOff,
  Filter,
  Check,
  Sparkles,
  ChevronDown,
  CheckSquare,
  Printer,
  Download,
  Upload,
  AlertCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { downloadTemplate, parseMustahikExcel, parseZakatExcel } from '../services/excelService.ts';
import { Pagination } from './common/Pagination.tsx';
import { MultiDeleteBar } from './common/MultiDeleteBar.tsx';
import { ConfirmDeleteModal } from './common/ConfirmDeleteModal.tsx';
import { ReportPrintModal, ReportColumn, SummaryCardItem } from './common/ReportPrintModal.tsx';

export const ZakatMustahikView: React.FC = () => {
  const { can } = useAuth();
  const { themeConfig } = useTheme();

  // Active Sub-Tab: 'zakat' (Penerimaan & Penyaluran) vs 'mustahik' (Data 8 Asnaf)
  const [activeSubTab, setActiveSubTab] = useState<'zakat' | 'mustahik'>('zakat');

  // --- Zakat Records State ---
  const [zakatRecords, setZakatRecords] = useState<ZakatRecord[]>(() => getStoredZakatRecords());

  const [zakatSearch, setZakatSearch] = useState('');
  const [selectedZakatType, setSelectedZakatType] = useState<string>('all');
  const [isZakatModalOpen, setIsZakatModalOpen] = useState(false);
  const [editingZakat, setEditingZakat] = useState<ZakatRecord | null>(null);
  const [importFeedback, setImportFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // --- Mustahik State ---
  const [mustahikList, setMustahikList] = useState<Mustahik[]>(() => getStoredMustahik());
  const [mustahikSearch, setMustahikSearch] = useState('');
  const [selectedAsnafFilter, setSelectedAsnafFilter] = useState<string>('all');
  const [isMustahikModalOpen, setIsMustahikModalOpen] = useState(false);
  const [editingMustahik, setEditingMustahik] = useState<Mustahik | null>(null);
  const [showMaskedNik, setShowMaskedNik] = useState<boolean>(true);
  const [isZakatReportPrintOpen, setIsZakatReportPrintOpen] = useState(false);
  const [isMustahikReportPrintOpen, setIsMustahikReportPrintOpen] = useState(false);
  const [mosqueProfile, setMosqueProfile] = useState<MosqueProfile>(() => getStoredMosqueProfile());
  const [, setOfficerTick] = useState(0);

  // Asnaf Dropdown Filter State
  const [isAsnafDropdownOpen, setIsAsnafDropdownOpen] = useState(false);
  const asnafDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (asnafDropdownRef.current && !asnafDropdownRef.current.contains(event.target as Node)) {
        setIsAsnafDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const asnafCounts = useMemo(() => {
    const counts: Record<string, number> = { all: mustahikList.length };
    const categories: Asnaf8[] = ['Fakir', 'Miskin', 'Fisabilillah', 'Mualaf', 'Gharimin', 'Amil', 'Ibnu Sabil', 'Riqab'];
    categories.forEach((asnaf) => {
      counts[asnaf] = mustahikList.filter((m) => m.asnaf === asnaf).length;
    });
    return counts;
  }, [mustahikList]);

  // Quick Distribute Modal to specific Mustahik
  const [isDistributeModalOpen, setIsDistributeModalOpen] = useState(false);
  const [distributeTargetMustahik, setDistributeTargetMustahik] = useState<Mustahik | null>(null);
  const [distributeForm, setDistributeForm] = useState({
    type: 'Zakat Fitrah' as ZakatRecord['type'],
    cashAmount: 0,
    riceKg: 5,
    notes: 'Penyaluran beras zakat fitrah langsung ke mustahik',
  });

  // --- Form State for Zakat Transaction ---
  const [zakatForm, setZakatForm] = useState({
    type: 'Zakat Fitrah' as ZakatRecord['type'],
    muzakkiName: '',
    familyCount: 1,
    riceKg: 0,
    cashAmount: 0,
    asnafTarget: 'Fakir',
    mustahikId: '',
    recipientName: '',
    status: 'Tersimpan di Amil' as ZakatRecord['status'],
    notes: '',
  });

  // --- Form State for Mustahik Entry ---
  const [mustahikForm, setMustahikForm] = useState<Omit<Mustahik, 'id' | 'registeredAt'>>({
    name: '',
    nik: '',
    noKK: '',
    asnaf: 'Fakir',
    address: '',
    rtRw: 'RT 01 / RW 01',
    phone: '',
    familyDependents: 1,
    economicCondition: '',
    eligibilityStatus: 'Layak Terima',
    notes: '',
  });

  // Save Zakat Records with real-time event dispatch
  const saveZakat = (newRecords: ZakatRecord[]) => {
    setZakatRecords(newRecords);
    saveStoredZakatRecords(newRecords);
  };

  // Save Mustahik List with real-time event dispatch
  const saveMustahik = (newList: Mustahik[]) => {
    setMustahikList(newList);
    saveStoredMustahik(newList);
    window.dispatchEvent(new Event('mustahik_records_updated'));
  };

  // Real-time synchronization across events
  useEffect(() => {
    const handleZakatSync = () => {
      setZakatRecords(getStoredZakatRecords());
    };
    const handleMustahikSync = () => {
      setMustahikList(getStoredMustahik());
    };
    const handleProfileAndOfficersSync = () => {
      setMosqueProfile(getStoredMosqueProfile());
      setOfficerTick((t) => t + 1);
    };
    const handleStorageSync = (e: StorageEvent) => {
      if (!e.key || e.key === 'sabiluna_zakat_records') handleZakatSync();
      if (!e.key || e.key === 'sabiluna_mustahik_records') handleMustahikSync();
      if (!e.key || e.key === 'sabiluna_mosque_profile' || e.key === 'sabiluna_managed_users') {
        handleProfileAndOfficersSync();
      }
    };

    window.addEventListener('storage', handleStorageSync);
    window.addEventListener('zakat_records_updated', handleZakatSync);
    window.addEventListener('mustahik_records_updated', handleMustahikSync);
    window.addEventListener('mosque-profile-updated', handleProfileAndOfficersSync);
    window.addEventListener('managed-users-updated', handleProfileAndOfficersSync);

    return () => {
      window.removeEventListener('storage', handleStorageSync);
      window.removeEventListener('zakat_records_updated', handleZakatSync);
      window.removeEventListener('mustahik_records_updated', handleMustahikSync);
      window.removeEventListener('mosque-profile-updated', handleProfileAndOfficersSync);
      window.removeEventListener('managed-users-updated', handleProfileAndOfficersSync);
    };
  }, []);

  const zakatFileInputRef = useRef<HTMLInputElement>(null);
  const mustahikFileInputRef = useRef<HTMLInputElement>(null);

  const handleImportZakatFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await parseZakatExcel(file);
      if (res.data.length > 0) {
        saveZakat([...res.data, ...zakatRecords]);
        setImportFeedback({
          type: 'success',
          message: `Berhasil mengimpor ${res.data.length} data zakat dari "${file.name}".${
            res.errors.length > 0 ? ` (${res.errors.length} baris dilewati)` : ''
          }`,
        });
      } else {
        setImportFeedback({
          type: 'error',
          message: res.errors[0] || `Tidak ada data zakat valid ditemukan di "${file.name}". Pastikan sesuai Template Import.`,
        });
      }
    } catch {
      setImportFeedback({
        type: 'error',
        message: `Gagal membaca file "${file.name}". Pastikan format file .xlsx/.xls/.csv valid.`,
      });
    } finally {
      if (zakatFileInputRef.current) zakatFileInputRef.current.value = '';
    }
  };

  const handleImportMustahikFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await parseMustahikExcel(file);
      if (res.data.length > 0) {
        saveMustahik([...res.data, ...mustahikList]);
        setImportFeedback({
          type: 'success',
          message: `Berhasil mengimpor ${res.data.length} data mustahik dari "${file.name}".${
            res.errors.length > 0 ? ` (${res.errors.length} baris dilewati)` : ''
          }`,
        });
      } else {
        setImportFeedback({
          type: 'error',
          message: res.errors[0] || `Tidak ada data mustahik valid ditemukan di "${file.name}". Pastikan sesuai Template Import.`,
        });
      }
    } catch {
      setImportFeedback({
        type: 'error',
        message: `Gagal membaca file "${file.name}". Pastikan format file .xlsx/.xls/.csv valid.`,
      });
    } finally {
      if (mustahikFileInputRef.current) mustahikFileInputRef.current.value = '';
    }
  };

  // --- Real-time Filter State & Mode ---
  const [zakatSummaryMode, setZakatSummaryMode] = useState<'filter' | 'all'>('filter');

  const isZakatFilterActive = useMemo(() => {
    return selectedZakatType !== 'all' || zakatSearch.trim() !== '';
  }, [selectedZakatType, zakatSearch]);

  // Overall Global Aggregations (from all recorded transactions)
  const overallCash = useMemo(
    () => zakatRecords.reduce((acc, r) => acc + (Number(r.cashAmount) || 0), 0),
    [zakatRecords]
  );
  const overallRice = useMemo(
    () => zakatRecords.reduce((acc, r) => acc + (Number(r.riceKg) || 0), 0),
    [zakatRecords]
  );
  const overallMuzakkiCount = useMemo(
    () => zakatRecords.reduce((acc, r) => acc + (Number(r.familyCount) || 1), 0),
    [zakatRecords]
  );
  const overallMustahikCount = mustahikList.length;

  // --- Aggregations: Mustahik ---
  const totalMustahik = mustahikList.length;
  const totalDependents = useMemo(
    () => mustahikList.reduce((acc, m) => acc + (Number(m.familyDependents) || 1), 0),
    [mustahikList]
  );
  const fakirMiskinCount = useMemo(
    () => mustahikList.filter((m) => m.asnaf === 'Fakir' || m.asnaf === 'Miskin').length,
    [mustahikList]
  );
  const eligibleCount = useMemo(
    () => mustahikList.filter((m) => m.eligibilityStatus === 'Layak Terima').length,
    [mustahikList]
  );

  // Filtered Zakat Records
  const filteredZakat = useMemo(() => {
    return zakatRecords.filter((r) => {
      if (selectedZakatType !== 'all' && r.type !== selectedZakatType) return false;
      if (zakatSearch.trim()) {
        const q = zakatSearch.toLowerCase();
        return (
          r.muzakkiName.toLowerCase().includes(q) ||
          r.receiptNumber.toLowerCase().includes(q) ||
          (r.recipientName || '').toLowerCase().includes(q) ||
          (r.asnafTarget || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [zakatRecords, selectedZakatType, zakatSearch]);

  // Filtered Aggregations (Real-Time based on active filters/search)
  const filteredCash = useMemo(
    () => filteredZakat.reduce((acc, r) => acc + (Number(r.cashAmount) || 0), 0),
    [filteredZakat]
  );
  const filteredRice = useMemo(
    () => filteredZakat.reduce((acc, r) => acc + (Number(r.riceKg) || 0), 0),
    [filteredZakat]
  );
  const filteredMuzakkiCount = useMemo(
    () => filteredZakat.reduce((acc, r) => acc + (Number(r.familyCount) || 1), 0),
    [filteredZakat]
  );
  const filteredMustahikCount = useMemo(() => {
    const recipients = new Set<string>();
    filteredZakat.forEach((r) => {
      if (r.recipientName && r.recipientName !== '-' && r.recipientName !== 'Belum ditentukan') {
        recipients.add(r.recipientName);
      } else if (r.asnafTarget) {
        recipients.add(`Asnaf ${r.asnafTarget}`);
      }
    });
    return recipients.size || (filteredZakat.length > 0 ? filteredZakat.length : 0);
  }, [filteredZakat]);

  // Active Displayed Values
  const useFilteredStats = isZakatFilterActive && zakatSummaryMode === 'filter';
  const displayCash = useFilteredStats ? filteredCash : overallCash;
  const displayRice = useFilteredStats ? filteredRice : overallRice;
  const displayMuzakkiCount = useFilteredStats ? filteredMuzakkiCount : overallMuzakkiCount;
  const displayMustahikCount = useFilteredStats ? filteredMustahikCount : overallMustahikCount;

  // Context-aware Zakat Report Configuration (hides Maal/cash when Fitrah rice-only, hides Rice when Zakat Maal, etc.)
  const zakatReportConfig = useMemo(() => {
    const isFitrah = selectedZakatType === 'Zakat Fitrah';
    const isMaal = selectedZakatType === 'Zakat Maal';
    const isFidyah = selectedZakatType === 'Fidyah';

    const showRice = !isMaal && (isFitrah ? filteredRice > 0 || filteredCash === 0 : filteredRice > 0);
    const showCash = isFitrah ? filteredCash > 0 : isMaal ? true : filteredCash > 0 || !showRice;

    const title = isFitrah
      ? 'LAPORAN PENERIMAAN & PENYALURAN ZAKAT FITRAH'
      : isMaal
      ? 'LAPORAN PENERIMAAN & PENYALURAN ZAKAT MAAL'
      : isFidyah
      ? 'LAPORAN PENERIMAAN & PENYALURAN FIDYAH'
      : 'LAPORAN PENERIMAAN & PENYALURAN ZAKAT, INFAQ & FIDYAH';

    const reportLabel = isFitrah
      ? 'Zakat Fitrah'
      : isMaal
      ? 'Zakat Maal'
      : isFidyah
      ? 'Fidyah'
      : 'ZISWAF';

    const cards: SummaryCardItem[] = [];
    if (showCash) {
      cards.push({
        label: isFitrah
          ? 'Total Uang Zakat Fitrah'
          : isMaal
          ? 'Total Dana Zakat Maal'
          : isFidyah
          ? 'Total Dana Fidyah'
          : 'Total Uang Terhimpun',
        value: formatCurrencyIDR(filteredCash),
        color: 'emerald',
      });
    }
    if (showRice) {
      cards.push({
        label: isFitrah ? 'Total Beras Zakat Fitrah' : 'Total Beras Terhimpun',
        value: `${filteredRice} Kg`,
        color: 'blue',
      });
    }
    cards.push({
      label: 'Total Muzakki / Jiwa',
      value: `${filteredMuzakkiCount} Jiwa`,
      color: 'purple',
    });
    cards.push({
      label: isFitrah
        ? 'Total Transaksi Fitrah'
        : isMaal
        ? 'Total Transaksi Maal'
        : isFidyah
        ? 'Total Transaksi Fidyah'
        : 'Total Transaksi ZIS',
      value: `${filteredZakat.length} Catatan`,
      color: 'amber',
    });

    const cols: ReportColumn[] = [
      { header: 'No. Kwitansi', key: 'receiptNumber', width: '14%' },
      { header: 'Tanggal', key: 'date', width: '12%' },
      { header: 'Jenis Zakat', key: 'type', width: '14%' },
      { header: 'Muzakki (Donatur)', key: 'muzakkiName', width: showRice && showCash ? '20%' : '26%' },
    ];
    if (showRice) {
      cols.push({ header: 'Beras (Kg)', key: 'riceKg', align: 'right', width: '11%' });
    }
    if (showCash) {
      cols.push({ header: 'Nominal (Rp)', key: 'cashAmount', align: 'right', width: '15%' });
    }
    cols.push({
      header: 'Status / Asnaf',
      key: 'statusAsnaf',
      width: showRice && showCash ? '14%' : '18%',
    });

    const rows = filteredZakat.map((r) => ({
      receiptNumber: r.receiptNumber,
      date: r.date,
      type: r.type,
      muzakkiName: `${r.muzakkiName} (${r.familyCount} jiwa)`,
      riceKg: r.riceKg > 0 ? `${r.riceKg} Kg` : '-',
      cashAmount: r.cashAmount > 0 ? formatCurrencyIDR(r.cashAmount) : '-',
      statusAsnaf: `${r.status}${r.asnafTarget ? ` -> ${r.asnafTarget}` : ''}`,
    }));

    return { title, reportLabel, cards, cols, rows };
  }, [selectedZakatType, filteredZakat, filteredCash, filteredRice, filteredMuzakkiCount]);

  // Filtered Mustahik List
  const filteredMustahik = useMemo(() => {
    return mustahikList.filter((m) => {
      if (selectedAsnafFilter !== 'all' && m.asnaf !== selectedAsnafFilter) return false;
      if (mustahikSearch.trim()) {
        const q = mustahikSearch.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          (m.nik || '').toLowerCase().includes(q) ||
          m.address.toLowerCase().includes(q) ||
          (m.rtRw || '').toLowerCase().includes(q) ||
          m.asnaf.toLowerCase().includes(q) ||
          (m.economicCondition || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [mustahikList, selectedAsnafFilter, mustahikSearch]);

  // --- Zakat Pagination & Multi-Delete ---
  const [zakatPage, setZakatPage] = useState(1);
  const [zakatPageSize, setZakatPageSize] = useState(10);
  const [selectedZakatIds, setSelectedZakatIds] = useState<string[]>([]);
  const [isSelectZakatMode, setIsSelectZakatMode] = useState(false);

  const totalZakatPages = Math.max(1, Math.ceil(filteredZakat.length / zakatPageSize));
  const safeZakatPage = Math.min(zakatPage, totalZakatPages);
  const paginatedZakat = useMemo(() => {
    const start = (safeZakatPage - 1) * zakatPageSize;
    return filteredZakat.slice(start, start + zakatPageSize);
  }, [filteredZakat, safeZakatPage, zakatPageSize]);

  React.useEffect(() => {
    setZakatPage(1);
    setSelectedZakatIds([]);
  }, [selectedZakatType, zakatSearch]);

  const handleToggleSelectAllZakat = () => {
    const pageIds = paginatedZakat.map((r) => r.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedZakatIds.includes(id));
    if (allSelected) {
      setSelectedZakatIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedZakatIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleSelectOneZakat = (id: string) => {
    setSelectedZakatIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Modal states for delete popups
  const [deleteConfirmZakatId, setDeleteConfirmZakatId] = useState<string | null>(null);
  const [isMultiDeleteZakatOpen, setIsMultiDeleteZakatOpen] = useState(false);
  const [deleteConfirmMustahikId, setDeleteConfirmMustahikId] = useState<string | null>(null);
  const [isMultiDeleteMustahikOpen, setIsMultiDeleteMustahikOpen] = useState(false);

  const handleConfirmDeleteZakatSingle = () => {
    if (!deleteConfirmZakatId) return;
    const updated = zakatRecords.filter((r) => r.id !== deleteConfirmZakatId);
    saveZakat(updated);
    setDeleteConfirmZakatId(null);
  };

  const handleConfirmDeleteZakatMulti = () => {
    if (selectedZakatIds.length === 0) return;
    const updated = zakatRecords.filter((r) => !selectedZakatIds.includes(r.id));
    saveZakat(updated);
    setSelectedZakatIds([]);
    setIsSelectZakatMode(false);
    setIsMultiDeleteZakatOpen(false);
  };

  // --- Mustahik Pagination & Multi-Delete ---
  const [mustahikPage, setMustahikPage] = useState(1);
  const [mustahikPageSize, setMustahikPageSize] = useState(10);
  const [selectedMustahikIds, setSelectedMustahikIds] = useState<string[]>([]);
  const [isSelectMustahikMode, setIsSelectMustahikMode] = useState(false);

  const totalMustahikPages = Math.max(1, Math.ceil(filteredMustahik.length / mustahikPageSize));
  const safeMustahikPage = Math.min(mustahikPage, totalMustahikPages);
  const paginatedMustahik = useMemo(() => {
    const start = (safeMustahikPage - 1) * mustahikPageSize;
    return filteredMustahik.slice(start, start + mustahikPageSize);
  }, [filteredMustahik, safeMustahikPage, mustahikPageSize]);

  React.useEffect(() => {
    setMustahikPage(1);
    setSelectedMustahikIds([]);
  }, [selectedAsnafFilter, mustahikSearch]);

  const handleToggleSelectAllMustahik = () => {
    const pageIds = paginatedMustahik.map((m) => m.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedMustahikIds.includes(id));
    if (allSelected) {
      setSelectedMustahikIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedMustahikIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleSelectOneMustahik = (id: string) => {
    setSelectedMustahikIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleConfirmDeleteMustahikSingle = () => {
    if (!deleteConfirmMustahikId) return;
    const updated = mustahikList.filter((m) => m.id !== deleteConfirmMustahikId);
    saveMustahik(updated);
    setDeleteConfirmMustahikId(null);
  };

  const handleConfirmDeleteMustahikMulti = () => {
    if (selectedMustahikIds.length === 0) return;
    const updated = mustahikList.filter((m) => !selectedMustahikIds.includes(m.id));
    saveMustahik(updated);
    setSelectedMustahikIds([]);
    setIsSelectMustahikMode(false);
    setIsMultiDeleteMustahikOpen(false);
  };

  // --- Handlers: Zakat ---
  const handleOpenAddZakat = () => {
    setEditingZakat(null);
    setZakatForm({
      type: 'Zakat Fitrah',
      muzakkiName: '',
      familyCount: 1,
      riceKg: 0,
      cashAmount: 0,
      asnafTarget: 'Fakir',
      mustahikId: '',
      recipientName: '',
      status: 'Tersimpan di Amil',
      notes: '',
    });
    setIsZakatModalOpen(true);
  };

  const handleOpenEditZakat = (record: ZakatRecord) => {
    setEditingZakat(record);
    const matchedMustahik = mustahikList.find((m) => m.name === record.recipientName);
    setZakatForm({
      type: record.type,
      muzakkiName: record.muzakkiName,
      familyCount: record.familyCount,
      riceKg: record.riceKg,
      cashAmount: record.cashAmount,
      asnafTarget: record.asnafTarget || 'Fakir',
      mustahikId: matchedMustahik?.id || '',
      recipientName: record.recipientName || '',
      status: record.status,
      notes: record.notes || '',
    });
    setIsZakatModalOpen(true);
  };

  const handleSaveZakat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!zakatForm.muzakkiName.trim()) return;

    let targetName = zakatForm.recipientName.trim();
    if (zakatForm.mustahikId) {
      const found = mustahikList.find((m) => m.id === zakatForm.mustahikId);
      if (found) {
        targetName = found.name;
      }
    }

    if (editingZakat) {
      const updatedRecords = zakatRecords.map((r) =>
        r.id === editingZakat.id
          ? {
              ...r,
              type: zakatForm.type,
              muzakkiName: zakatForm.muzakkiName.trim(),
              familyCount: Number(zakatForm.familyCount) || 1,
              riceKg: Number(zakatForm.riceKg) || 0,
              cashAmount: Number(zakatForm.cashAmount) || 0,
              asnafTarget: zakatForm.asnafTarget,
              recipientName: targetName || undefined,
              status: zakatForm.status,
              notes: zakatForm.notes.trim() || undefined,
            }
          : r
      );
      saveZakat(updatedRecords);

      // Sync mustahik assistance totals when transitioning to 'Tersalurkan'
      if (
        zakatForm.mustahikId &&
        zakatForm.status === 'Tersalurkan' &&
        editingZakat.status !== 'Tersalurkan'
      ) {
        const updatedMustahik = mustahikList.map((m) => {
          if (m.id === zakatForm.mustahikId) {
            return {
              ...m,
              totalAssistanceReceived: (m.totalAssistanceReceived || 0) + (Number(zakatForm.cashAmount) || 0),
              totalRiceReceived: (m.totalRiceReceived || 0) + (Number(zakatForm.riceKg) || 0),
              lastAssistanceDate: new Date().toISOString().slice(0, 10),
            };
          }
          return m;
        });
        saveMustahik(updatedMustahik);
      }
    } else {
      const newRecord: ZakatRecord = {
        id: `ZKT-${Date.now().toString().slice(-4)}`,
        receiptNumber: `ZKT-${Date.now().toString().slice(-4)}`,
        type: zakatForm.type,
        muzakkiName: zakatForm.muzakkiName.trim(),
        familyCount: Number(zakatForm.familyCount) || 1,
        riceKg: Number(zakatForm.riceKg) || 0,
        cashAmount: Number(zakatForm.cashAmount) || 0,
        asnafTarget: zakatForm.asnafTarget,
        recipientName: targetName || undefined,
        status: zakatForm.status,
        date: new Date().toISOString().slice(0, 10),
        notes: zakatForm.notes.trim() || undefined,
      };

      saveZakat([newRecord, ...zakatRecords]);

      // If targeted to a specific mustahik and status is 'Tersalurkan', update mustahik history
      if (zakatForm.mustahikId && zakatForm.status === 'Tersalurkan') {
        const updated = mustahikList.map((m) => {
          if (m.id === zakatForm.mustahikId) {
            return {
              ...m,
              totalAssistanceReceived: (m.totalAssistanceReceived || 0) + (Number(zakatForm.cashAmount) || 0),
              totalRiceReceived: (m.totalRiceReceived || 0) + (Number(zakatForm.riceKg) || 0),
              lastAssistanceDate: new Date().toISOString().slice(0, 10),
            };
          }
          return m;
        });
        saveMustahik(updated);
      }
    }

    setIsZakatModalOpen(false);
    setEditingZakat(null);
    setZakatForm({
      type: 'Zakat Fitrah',
      muzakkiName: '',
      familyCount: 1,
      riceKg: 0,
      cashAmount: 0,
      asnafTarget: 'Fakir',
      mustahikId: '',
      recipientName: '',
      status: 'Tersimpan di Amil',
      notes: '',
    });
  };

  const handleExportZakatExcel = () => {
    const data = filteredZakat.map((r, idx) => ({
      'No': idx + 1,
      'No Kwitansi': r.receiptNumber,
      'Tanggal': r.date,
      'Jenis Zakat': r.type,
      'Nama Muzakki': r.muzakkiName,
      'Jumlah Jiwa': r.familyCount,
      'Beras (Kg)': r.riceKg,
      'Uang Tunai (Rp)': r.cashAmount,
      'Golongan Asnaf': r.asnafTarget || '-',
      'Penerima (Mustahik)': r.recipientName || '-',
      'Status': r.status,
      'Catatan': r.notes || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Penerimaan Zakat');
    XLSX.writeFile(wb, `Laporan_Zakat_Masjid_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // --- Handlers: Mustahik ---
  const handleOpenAddMustahik = () => {
    setEditingMustahik(null);
    setMustahikForm({
      name: '',
      nik: '',
      noKK: '',
      asnaf: 'Fakir',
      address: '',
      rtRw: 'RT 01 / RW 01',
      phone: '',
      familyDependents: 1,
      economicCondition: '',
      eligibilityStatus: 'Layak Terima',
      notes: '',
    });
    setIsMustahikModalOpen(true);
  };

  const handleOpenEditMustahik = (item: Mustahik) => {
    setEditingMustahik(item);
    setMustahikForm({
      name: item.name,
      nik: item.nik || '',
      noKK: item.noKK || '',
      asnaf: item.asnaf,
      address: item.address,
      rtRw: item.rtRw || 'RT 01 / RW 01',
      phone: item.phone,
      familyDependents: item.familyDependents,
      economicCondition: item.economicCondition,
      eligibilityStatus: item.eligibilityStatus,
      notes: item.notes || '',
    });
    setIsMustahikModalOpen(true);
  };

  const handleSaveMustahik = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mustahikForm.name.trim()) return;

    if (editingMustahik) {
      const updated = mustahikList.map((m) =>
        m.id === editingMustahik.id
          ? {
              ...m,
              ...mustahikForm,
              name: mustahikForm.name.trim(),
            }
          : m
      );
      saveMustahik(updated);
    } else {
      const newMustahik: Mustahik = {
        ...mustahikForm,
        id: `MST-${Date.now().toString().slice(-4)}`,
        name: mustahikForm.name.trim(),
        totalAssistanceReceived: 0,
        totalRiceReceived: 0,
        registeredAt: new Date().toISOString().slice(0, 10),
      };
      saveMustahik([newMustahik, ...mustahikList]);
    }
    setIsMustahikModalOpen(false);
  };

  const handleDeleteMustahik = (id: string) => {
    setDeleteConfirmMustahikId(id);
  };

  // Quick Distribute to Mustahik
  const handleOpenDistribute = (m: Mustahik) => {
    setDistributeTargetMustahik(m);
    setDistributeForm({
      type: 'Zakat Fitrah',
      cashAmount: 0,
      riceKg: m.familyDependents ? m.familyDependents * 2.5 : 5,
      notes: `Penyaluran ${m.asnaf} untuk keluarga ${m.name}`,
    });
    setIsDistributeModalOpen(true);
  };

  const handleCommitDistribute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!distributeTargetMustahik) return;

    const newRecord: ZakatRecord = {
      id: `ZKT-${Date.now().toString().slice(-4)}`,
      receiptNumber: `ZKT-SLR-${Date.now().toString().slice(-4)}`,
      type: distributeForm.type,
      muzakkiName: 'Kas Amil Zakat DKM Masjid',
      familyCount: distributeTargetMustahik.familyDependents || 1,
      riceKg: Number(distributeForm.riceKg) || 0,
      cashAmount: Number(distributeForm.cashAmount) || 0,
      asnafTarget: distributeTargetMustahik.asnaf,
      recipientName: distributeTargetMustahik.name,
      status: 'Tersalurkan',
      date: new Date().toISOString().slice(0, 10),
      notes: distributeForm.notes,
    };

    saveZakat([newRecord, ...zakatRecords]);

    // Update Mustahik history
    const updated = mustahikList.map((m) => {
      if (m.id === distributeTargetMustahik.id) {
        return {
          ...m,
          totalAssistanceReceived: (m.totalAssistanceReceived || 0) + (Number(distributeForm.cashAmount) || 0),
          totalRiceReceived: (m.totalRiceReceived || 0) + (Number(distributeForm.riceKg) || 0),
          lastAssistanceDate: new Date().toISOString().slice(0, 10),
        };
      }
      return m;
    });
    saveMustahik(updated);

    setIsDistributeModalOpen(false);
    setDistributeTargetMustahik(null);
  };

  const handleExportMustahikExcel = () => {
    const data = filteredMustahik.map((m, idx) => ({
      'No': idx + 1,
      'ID Mustahik': m.id,
      'Nama Kepala Keluarga': m.name,
      'NIK KTP': m.nik || '-',
      'No KK': m.noKK || '-',
      'Golongan 8 Asnaf': m.asnaf,
      'Jumlah Jiwa Tanggungan': m.familyDependents,
      'Alamat': m.address,
      'RT / RW': m.rtRw || '-',
      'No Telepon / WA': m.phone || '-',
      'Kondisi Ekonomi / Kebutuhan': m.economicCondition,
      'Total Bantuan Tunai (Rp)': m.totalAssistanceReceived || 0,
      'Total Beras Diterima (Kg)': m.totalRiceReceived || 0,
      'Bantuan Terakhir': m.lastAssistanceDate || '-',
      'Status Kelayakan': m.eligibilityStatus,
      'Catatan': m.notes || '-',
      'Tanggal Terdaftar': m.registeredAt,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Mustahik 8 Asnaf');
    XLSX.writeFile(wb, `Data_Mustahik_Masjid_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Helper mask NIK
  const maskNik = (nik?: string) => {
    if (!nik) return '-';
    if (!showMaskedNik) return nik;
    if (nik.length < 8) return '****';
    return `${nik.slice(0, 6)}******${nik.slice(-4)}`;
  };

  // Asnaf Badge Color
  const getAsnafBadgeClass = (asnaf: string) => {
    switch (asnaf) {
      case 'Fakir':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200';
      case 'Miskin':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200';
      case 'Fisabilillah':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200';
      case 'Mualaf':
        return 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border-sky-200';
      case 'Gharimin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200';
      case 'Amil':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 border-teal-200';
      case 'Ibnu Sabil':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-200';
      case 'Riqab':
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header with Tab Navigation */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-emerald-950 text-white border border-teal-800/40 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 shrink-0" />
            <span>Zakat, Infaq &amp; Data Mustahik</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Penerimaan Zakat Fitrah, Zakat Mal, Fidyah, serta penyaluran ke 8 golongan Asnaf.
          </p>
        </div>

        {/* Sub-tab Navigation Selector */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-700/60 shadow-inner shrink-0 w-full lg:w-auto self-start lg:self-center">
          <button
            type="button"
            onClick={() => setActiveSubTab('zakat')}
            className={`flex-1 lg:flex-none justify-center flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'zakat'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-700/30 ring-1 ring-emerald-400/50'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <HeartHandshake className="w-4 h-4 text-emerald-300 shrink-0" />
            <span className="truncate">Penerimaan &amp; Penyaluran</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 ${
                activeSubTab === 'zakat' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {zakatRecords.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('mustahik')}
            className={`flex-1 lg:flex-none justify-center flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'mustahik'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-700/30 ring-1 ring-emerald-400/50'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4 text-teal-300 shrink-0" />
            <span className="truncate">Data Mustahik (8 Asnaf)</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 ${
                activeSubTab === 'mustahik' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {mustahikList.length}
            </span>
          </button>
        </div>
      </div>

      {importFeedback && (
        <div
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-xs font-semibold ${
            importFeedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {importFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{importFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setImportFeedback(null)}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
            title="Tutup pesan"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: TRANSAKSI & PENYALURAN ZAKAT                                     */}
      {/* ========================================================================= */}
      {activeSubTab === 'zakat' && (
        <div className="space-y-6">
          {/* Quick Summary Mode Controls (shown only when filter is active) */}
          {isZakatFilterActive && (
            <div className="flex flex-wrap items-center justify-end gap-2 px-1">
              <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setZakatSummaryMode('filter')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    zakatSummaryMode === 'filter'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Sesuai Filter
                </button>
                <button
                  type="button"
                  onClick={() => setZakatSummaryMode('all')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    zakatSummaryMode === 'all'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Semua Data (Global)
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setZakatSearch('');
                  setSelectedZakatType('all');
                }}
                className="text-[11px] text-rose-500 font-semibold hover:underline cursor-pointer"
              >
                Reset Filter
              </button>
            </div>
          )}

          {/* Top Banner & Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className={`p-4 sm:p-5 rounded-2xl border ${themeConfig.cardBg} transition-all min-w-0`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Total Dana Zakat Tunai Terhimpun
                </span>
                {useFilteredStats && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold shrink-0">
                    Filter
                  </span>
                )}
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1.5 font-mono break-words">
                {formatCurrencyIDR(displayCash)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {useFilteredStats
                  ? `${filteredZakat.length} data (${formatCurrencyIDR(overallCash)} total global)`
                  : 'Zakat Maal, Fitrah uang & Fidyah'}
              </p>
            </div>

            <div className={`p-4 sm:p-5 rounded-2xl border ${themeConfig.cardBg} transition-all min-w-0`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Total Beras Zakat Fitrah
                </span>
                {useFilteredStats && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold shrink-0">
                    Filter
                  </span>
                )}
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1.5">
                {displayRice} <span className="text-sm font-normal text-slate-500">Kilogram</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {useFilteredStats
                  ? `Filter aktif (${overallRice} Kg total global)`
                  : 'Standar 2.5 Kg / 3.5 Liter per jiwa'}
              </p>
            </div>

            <div className={`p-4 sm:p-5 rounded-2xl border ${themeConfig.cardBg} transition-all min-w-0`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Total Jiwa Muzakki
                </span>
                {useFilteredStats && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold shrink-0">
                    Filter
                  </span>
                )}
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1.5">
                {displayMuzakkiCount} <span className="text-sm font-normal text-slate-500">Jiwa</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {useFilteredStats
                  ? `Dari ${filteredZakat.length} transaksi (${overallMuzakkiCount} jiwa global)`
                  : `Dari ${zakatRecords.length} transaksi penerimaan`}
              </p>
            </div>

            <div className={`p-4 sm:p-5 rounded-2xl border ${themeConfig.cardBg} transition-all min-w-0`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Target Penerima Mustahik
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-semibold shrink-0">
                  {mustahikList.length} Terdata
                </span>
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-1.5">
                {displayMustahikCount}{' '}
                <span className="text-sm font-normal text-slate-500">
                  {useFilteredStats ? 'Mustahik Terkait' : 'Keluarga'}
                </span>
              </p>
              <div className="flex items-center justify-between gap-2 mt-1">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {useFilteredStats
                    ? `${displayMustahikCount} mustahik pada filter ini`
                    : `${mustahikList.length} keluarga 8 asnaf`}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('mustahik')}
                  className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer shrink-0"
                >
                  Buka Data →
                </button>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className={`p-3.5 sm:p-4 rounded-2xl border ${themeConfig.cardBg} space-y-3`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="relative flex-1 w-full lg:max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={zakatSearch}
                  onChange={(e) => setZakatSearch(e.target.value)}
                  placeholder="Cari nama muzakki, mustahik, kwitansi, atau asnaf..."
                  className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {can('create') && (
                  <button
                    onClick={handleOpenAddZakat}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Penerimaan / Penyaluran Zakat</span>
                  </button>
                )}

                <button
                  onClick={() => setIsZakatReportPrintOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-300 dark:border-slate-700 transition-all cursor-pointer shadow-xs"
                  title="Cetak Laporan Rekapitulasi Penerimaan & Penyaluran Zakat"
                >
                  <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Cetak Laporan</span>
                </button>

                <button
                  onClick={handleExportZakatExcel}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 rounded-xl border border-emerald-200 dark:border-emerald-800 cursor-pointer transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Export Excel</span>
                </button>

                {can('import') && (
                  <>
                    <input
                      type="file"
                      ref={zakatFileInputRef}
                      onChange={handleImportZakatFile}
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                    />
                    <button
                      onClick={() => zakatFileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-xl border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                      title="Import Data Zakat dari File Excel"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Import Excel</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => downloadTemplate('zakat')}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-xl border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer"
                  title="Unduh Format Template Excel untuk Penerimaan & Penyaluran Zakat"
                >
                  <Download className="w-4 h-4" />
                  <span>Template Import</span>
                </button>

                {can('delete') && (
                  <button
                    onClick={() => {
                      if (isSelectZakatMode) {
                        setIsSelectZakatMode(false);
                        setSelectedZakatIds([]);
                      } else {
                        setIsSelectZakatMode(true);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                      isSelectZakatMode
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                    title="Pilih data untuk multi hapus"
                  >
                    <CheckSquare className="w-4 h-4" />
                    <span>{isSelectZakatMode ? 'Batal' : 'Pilih Data'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Filter Types */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="inline-flex flex-wrap gap-1 rounded-lg p-1 bg-slate-100 dark:bg-slate-800 w-full sm:w-auto">
                <button
                  onClick={() => setSelectedZakatType('all')}
                  className={`px-2.5 sm:px-3 py-1 rounded-md font-semibold cursor-pointer ${
                    selectedZakatType === 'all'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  Semua ({zakatRecords.length})
                </button>
                <button
                  onClick={() => setSelectedZakatType('Zakat Fitrah')}
                  className={`px-2.5 sm:px-3 py-1 rounded-md font-semibold cursor-pointer ${
                    selectedZakatType === 'Zakat Fitrah'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  Zakat Fitrah
                </button>
                <button
                  onClick={() => setSelectedZakatType('Zakat Maal')}
                  className={`px-2.5 sm:px-3 py-1 rounded-md font-semibold cursor-pointer ${
                    selectedZakatType === 'Zakat Maal'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  Zakat Maal
                </button>
                <button
                  onClick={() => setSelectedZakatType('Fidyah')}
                  className={`px-2.5 sm:px-3 py-1 rounded-md font-semibold cursor-pointer ${
                    selectedZakatType === 'Fidyah'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  Fidyah
                </button>
              </div>
            </div>
          </div>

          {/* Multi Delete Action Bar */}
          {can('delete') && isSelectZakatMode && (
            <MultiDeleteBar
              selectedCount={selectedZakatIds.length}
              onDeleteSelected={() => setIsMultiDeleteZakatOpen(true)}
              onClearSelection={() => {
                setSelectedZakatIds([]);
                setIsSelectZakatMode(false);
              }}
              itemName="catatan zakat"
            />
          )}

          {/* Table & Mobile Cards */}
          <div className={`rounded-2xl border ${themeConfig.cardBg} overflow-hidden shadow-sm`}>
            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedZakat.length === 0 ? (
                <div className="py-10 px-4 text-center text-slate-400">
                  <HeartHandshake className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-semibold">Belum ada catatan zakat ditemukan.</p>
                </div>
              ) : (
                paginatedZakat.map((r) => {
                  const isSelected = selectedZakatIds.includes(r.id);
                  return (
                    <div
                      key={r.id}
                      className={`p-3.5 space-y-2.5 text-xs ${
                        isSelected ? 'bg-emerald-50/70 dark:bg-emerald-950/40' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          {can('delete') && isSelectZakatMode && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectOneZakat(r.id)}
                              className="mt-1 rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 w-4 h-4 shrink-0 cursor-pointer"
                            />
                          )}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-900 dark:text-white">{r.receiptNumber}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                r.type === 'Zakat Fitrah'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : r.type === 'Zakat Maal'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              }`}>
                                {r.type}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">{r.date}</p>
                          </div>
                        </div>

                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          r.status === 'Tersalurkan'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {r.status === 'Tersalurkan' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {r.status}
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2.5">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white break-words">{r.muzakkiName}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{r.familyCount} Jiwa • {r.asnafTarget ? `Asnaf ${r.asnafTarget}` : '-'}</p>
                          <p className="text-[11px] text-slate-400 truncate">{r.recipientName || 'Belum ditentukan'}</p>
                        </div>
                        <div className="text-right font-mono font-bold shrink-0">
                          {r.cashAmount > 0 && <p className="text-emerald-600 dark:text-emerald-400">{formatCurrencyIDR(r.cashAmount)}</p>}
                          {r.riceKg > 0 && <p className="text-amber-600 dark:text-amber-400">{r.riceKg} Kg Beras</p>}
                        </div>
                      </div>

                      {(can('edit') || can('delete')) && (
                        <div className="flex items-center justify-end gap-2">
                          {can('edit') && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditZakat(r)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-600 text-[11px] font-semibold cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                              Edit
                            </button>
                          )}
                          {can('delete') && (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmZakatId(r.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 text-[11px] font-semibold cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
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

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
                  <tr>
                    {can('delete') && isSelectZakatMode && (
                      <th className="py-3 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={paginatedZakat.length > 0 && paginatedZakat.every(r => selectedZakatIds.includes(r.id))}
                          onChange={handleToggleSelectAllZakat}
                          className="rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                          title="Pilih Semua di Halaman Ini"
                        />
                      </th>
                    )}
                    <th className="py-3 px-4">Kwitansi & Tgl</th>
                    <th className="py-3 px-4">Jenis Zakat</th>
                    <th className="py-3 px-4">Muzakki (Jiwa)</th>
                    <th className="py-3 px-4">Nominal / Beras</th>
                    <th className="py-3 px-4">Target Asnaf & Penerima</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    {(can('edit') || can('delete')) && <th className="py-3 px-4 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {paginatedZakat.length === 0 ? (
                    <tr>
                      <td colSpan={(can('edit') || can('delete')) ? (can('delete') && isSelectZakatMode ? 8 : 7) : 6} className="py-12 text-center text-slate-400">
                        <HeartHandshake className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="font-semibold">Belum ada catatan zakat ditemukan.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedZakat.map((r) => {
                      const isSelected = selectedZakatIds.includes(r.id);
                      return (
                        <tr
                          key={r.id}
                          className={`transition-colors ${
                            isSelected
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/40'
                              : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          {can('delete') && isSelectZakatMode && (
                            <td className="py-3 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectOneZakat(r.id)}
                                className="rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                              />
                            </td>
                          )}
                          <td className="py-3 px-4">
                            <p className="font-mono font-bold text-slate-900 dark:text-white">{r.receiptNumber}</p>
                            <p className="text-[10px] text-slate-400">{r.date}</p>
                          </td>

                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.type === 'Zakat Fitrah'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : r.type === 'Zakat Maal'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            }`}>
                              {r.type}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900 dark:text-white">{r.muzakkiName}</p>
                            <p className="text-[10px] text-slate-400">{r.familyCount} Jiwa</p>
                          </td>

                          <td className="py-3 px-4 font-mono font-semibold">
                            {r.cashAmount > 0 && <p className="text-emerald-600">{formatCurrencyIDR(r.cashAmount)}</p>}
                            {r.riceKg > 0 && <p className="text-amber-600">{r.riceKg} Kg Beras</p>}
                          </td>

                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                              {r.asnafTarget ? `Asnaf ${r.asnafTarget}` : '-'}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate max-w-xs">{r.recipientName || 'Belum ditentukan'}</p>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              r.status === 'Tersalurkan'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}>
                              {r.status === 'Tersalurkan' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                              {r.status}
                            </span>
                          </td>

                          {(can('edit') || can('delete')) && (
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {can('edit') && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditZakat(r)}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer"
                                    title="Edit Catatan Zakat"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {can('delete') && (
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmZakatId(r.id)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                                    title="Hapus Catatan Zakat"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Zakat Pagination Controls */}
            <Pagination
              currentPage={safeZakatPage}
              totalPages={totalZakatPages}
              totalItems={filteredZakat.length}
              pageSize={zakatPageSize}
              onPageChange={setZakatPage}
              onPageSizeChange={(sz) => {
                setZakatPageSize(sz);
                setZakatPage(1);
              }}
              itemName="catatan zakat"
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: DATA MUSTAHIK (8 ASNAF)                                           */}
      {/* ========================================================================= */}
      {activeSubTab === 'mustahik' && (
        <div className="space-y-6">
          {/* Mustahik Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className={`p-4 sm:p-5 rounded-2xl border ${themeConfig.cardBg} min-w-0`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Total Mustahik Terdata
                </span>
                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 shrink-0">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1.5 font-mono">
                {totalMustahik} <span className="text-sm font-normal text-slate-500">Kepala Keluarga</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tercatat resmi di database DKM
              </p>
            </div>

            <div className={`p-4 sm:p-5 rounded-2xl border ${themeConfig.cardBg} min-w-0`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Asnaf Fakir & Miskin
                </span>
                <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 shrink-0">
                  <HeartHandshake className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1.5 font-mono">
                {fakirMiskinCount} <span className="text-sm font-normal text-slate-500">Keluarga</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Prioritas utama penyaluran sembako & zakat
              </p>
            </div>

            <div className={`p-4 sm:p-5 rounded-2xl border ${themeConfig.cardBg} min-w-0`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Total Jiwa Tanggungan
                </span>
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1.5 font-mono">
                {totalDependents} <span className="text-sm font-normal text-slate-500">Jiwa</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Estimasi kebutuhan beras fitrah: ~{totalDependents * 2.5} Kg
              </p>
            </div>

            <div className={`p-4 sm:p-5 rounded-2xl border ${themeConfig.cardBg} min-w-0`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Status Verifikasi Kelayakan
                </span>
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1.5 font-mono">
                {eligibleCount} <span className="text-sm font-normal text-slate-500">Layak Terima</span>
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                ✓ Telah disurvei tim amil DKM
              </p>
            </div>
          </div>

          {/* Mustahik Toolbar: Compact Search & Asnaf Dropdown Filter */}
          <div className={`p-3.5 sm:p-4 rounded-2xl border ${themeConfig.cardBg} shadow-sm`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Left Section: Compact Search & Asnaf Dropdown Filter */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 w-full lg:max-w-xl">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={mustahikSearch}
                    onChange={(e) => setMustahikSearch(e.target.value)}
                    placeholder="Cari nama, NIK, alamat, RT/RW, kondisi..."
                    className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                  />
                  {mustahikSearch && (
                    <button
                      type="button"
                      onClick={() => setMustahikSearch('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full"
                      title="Hapus kata kunci pencarian"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Dropdown Filter 8 Asnaf */}
                <div className="relative" ref={asnafDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsAsnafDropdownOpen(!isAsnafDropdownOpen)}
                    className={`w-full sm:w-auto flex items-center justify-between gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer shadow-sm ${
                      selectedAsnafFilter !== 'all'
                        ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 text-emerald-800 dark:text-emerald-200 ring-1 ring-emerald-500/20'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                    }`}
                    title="Pilih Kategori Golongan Asnaf"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Filter
                        className={`w-3.5 h-3.5 flex-shrink-0 ${
                          selectedAsnafFilter !== 'all' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                        }`}
                      />
                      <span className="text-slate-500 dark:text-slate-400 font-normal">Asnaf:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {selectedAsnafFilter === 'all' ? 'Semua' : selectedAsnafFilter}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold font-mono ml-0.5 ${
                          selectedAsnafFilter !== 'all'
                            ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {asnafCounts[selectedAsnafFilter] ?? mustahikList.length}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                        isAsnafDropdownOpen ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : ''
                      }`}
                    />
                  </button>

                  {/* Dropdown Menu Popup */}
                  {isAsnafDropdownOpen && (
                    <div className="absolute left-0 sm:left-0 top-full mt-1.5 w-full sm:w-72 max-w-[calc(100vw-2rem)] p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-40 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                        <span>Pilihan 8 Asnaf</span>
                        {selectedAsnafFilter !== 'all' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAsnafFilter('all');
                              setIsAsnafDropdownOpen(false);
                            }}
                            className="text-emerald-600 dark:text-emerald-400 hover:underline text-[11px] font-bold cursor-pointer"
                          >
                            Reset Filter
                          </button>
                        )}
                      </div>

                      <div className="max-h-64 overflow-y-auto py-1 space-y-0.5 scrollbar-thin">
                        {/* Option: Semua Asnaf */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAsnafFilter('all');
                            setIsAsnafDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                            selectedAsnafFilter === 'all'
                              ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-bold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {selectedAsnafFilter === 'all' ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                            ) : (
                              <span className="w-3.5 h-3.5 inline-block flex-shrink-0" />
                            )}
                            <span>Semua 8 Asnaf</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {asnafCounts['all']} Data
                          </span>
                        </button>

                        <div className="my-1 border-t border-slate-100 dark:border-slate-700/50" />

                        {/* 8 Asnafs with counts */}
                        {(['Fakir', 'Miskin', 'Fisabilillah', 'Mualaf', 'Gharimin', 'Amil', 'Ibnu Sabil', 'Riqab'] as Asnaf8[]).map(
                          (asnaf) => {
                            const count = asnafCounts[asnaf] || 0;
                            const isSelected = selectedAsnafFilter === asnaf;
                            return (
                              <button
                                key={asnaf}
                                type="button"
                                onClick={() => {
                                  setSelectedAsnafFilter(asnaf);
                                  setIsAsnafDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-bold'
                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  {isSelected ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                  ) : (
                                    <span className="w-3.5 h-3.5 inline-block flex-shrink-0" />
                                  )}
                                  <span>Asnaf {asnaf}</span>
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                                    count > 0
                                      ? isSelected
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                                      : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                                  }`}
                                >
                                  {count} data
                                </span>
                              </button>
                            );
                          }
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Reset pill if filter active */}
                {selectedAsnafFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedAsnafFilter('all')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
                    title="Reset ke Semua Asnaf"
                  >
                    <span>Reset</span>
                    <X className="w-3 h-3 text-slate-400" />
                  </button>
                )}
              </div>

              {/* Right Section: Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMaskedNik(!showMaskedNik)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                  title="Privasi NIK KTP"
                >
                  {showMaskedNik ? <EyeOff className="w-4 h-4 text-emerald-600" /> : <Eye className="w-4 h-4 text-slate-400" />}
                  <span>{showMaskedNik ? 'NIK Terproteksi' : 'Tampilkan NIK'}</span>
                </button>

                {can('create') && (
                  <button
                    onClick={handleOpenAddMustahik}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Mustahik Baru</span>
                  </button>
                )}

                <button
                  onClick={() => setIsMustahikReportPrintOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-300 dark:border-slate-700 transition-all cursor-pointer shadow-xs"
                  title="Cetak Laporan Rekapitulasi Data Mustahik 8 Asnaf"
                >
                  <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Cetak Laporan</span>
                </button>

                <button
                  onClick={handleExportMustahikExcel}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-xl border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Export Excel</span>
                </button>

                {can('import') && (
                  <>
                    <input
                      type="file"
                      ref={mustahikFileInputRef}
                      onChange={handleImportMustahikFile}
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                    />
                    <button
                      onClick={() => mustahikFileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                      title="Import Data Mustahik dari File Excel"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Import Excel</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => downloadTemplate('mustahik')}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-xl border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer"
                  title="Unduh Format Template Excel untuk Data Mustahik 8 Asnaf"
                >
                  <Download className="w-4 h-4" />
                  <span>Template Import</span>
                </button>

                {can('delete') && (
                  <button
                    onClick={() => {
                      if (isSelectMustahikMode) {
                        setIsSelectMustahikMode(false);
                        setSelectedMustahikIds([]);
                      } else {
                        setIsSelectMustahikMode(true);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                      isSelectMustahikMode
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                    title="Pilih data untuk multi hapus"
                  >
                    <CheckSquare className="w-4 h-4" />
                    <span>{isSelectMustahikMode ? 'Batal' : 'Pilih Data'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Multi Delete Action Bar for Mustahik */}
          {can('delete') && isSelectMustahikMode && (
            <MultiDeleteBar
              selectedCount={selectedMustahikIds.length}
              onDeleteSelected={() => setIsMultiDeleteMustahikOpen(true)}
              onClearSelection={() => {
                setSelectedMustahikIds([]);
                setIsSelectMustahikMode(false);
              }}
              itemName="mustahik"
            />
          )}

          {/* Mustahik Table & Mobile Cards */}
          <div className={`rounded-2xl border ${themeConfig.cardBg} overflow-hidden shadow-sm`}>
            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedMustahik.length === 0 ? (
                <div className="py-10 px-4 text-center text-slate-400">
                  <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-600" />
                  <p className="font-semibold text-sm">Tidak ada data mustahik yang cocok.</p>
                  <p className="text-xs text-slate-400 mt-1">Coba ubah kata kunci pencarian atau filter golongan asnaf.</p>
                </div>
              ) : (
                paginatedMustahik.map((m) => {
                  const isSelected = selectedMustahikIds.includes(m.id);
                  return (
                    <div
                      key={m.id}
                      className={`p-3.5 space-y-2.5 text-xs ${
                        isSelected ? 'bg-emerald-50/70 dark:bg-emerald-950/40' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          {can('delete') && isSelectMustahikMode && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectOneMustahik(m.id)}
                              className="mt-1 rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 w-4 h-4 shrink-0 cursor-pointer"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white text-sm break-words">{m.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">NIK: {maskNik(m.nik)}</p>
                            {m.phone && (
                              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 shrink-0" /> {m.phone}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getAsnafBadgeClass(m.asnaf)}`}>
                            Asnaf {m.asnaf}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            m.eligibilityStatus === 'Layak Terima'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : m.eligibilityStatus === 'Dalam Peninjauan'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            <CheckCircle2 className="w-3 h-3" />
                            {m.eligibilityStatus}
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2.5 space-y-1.5">
                        <div className="flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                          <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                          <span>{m.familyDependents} Jiwa • {m.address} ({m.rtRw})</span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">{m.economicCondition}</p>
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/70 dark:border-slate-700/60">
                          <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrencyIDR(m.totalAssistanceReceived || 0)}
                            {(m.totalRiceReceived || 0) > 0 && (
                              <span className="ml-2 text-amber-600 dark:text-amber-400">• {m.totalRiceReceived} Kg</span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">Terakhir: {m.lastAssistanceDate || 'Belum'}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {can('create') && (
                          <button
                            onClick={() => handleOpenDistribute(m)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold cursor-pointer"
                          >
                            <Gift className="w-3 h-3" />
                            Salurkan
                          </button>
                        )}
                        {can('edit') && (
                          <button
                            onClick={() => handleOpenEditMustahik(m)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-semibold cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                            Edit
                          </button>
                        )}
                        {can('delete') && (
                          <button
                            onClick={() => handleDeleteMustahik(m.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 text-[11px] font-semibold cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            Hapus
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
                  <tr>
                    {can('delete') && isSelectMustahikMode && (
                      <th className="py-3 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={paginatedMustahik.length > 0 && paginatedMustahik.every(m => selectedMustahikIds.includes(m.id))}
                          onChange={handleToggleSelectAllMustahik}
                          className="rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                          title="Pilih Semua di Halaman Ini"
                        />
                      </th>
                    )}
                    <th className="py-3 px-4">Mustahik & NIK</th>
                    <th className="py-3 px-4">Golongan Asnaf</th>
                    <th className="py-3 px-4">Tanggungan & Alamat</th>
                    <th className="py-3 px-4">Kondisi Ekonomi / Kebutuhan</th>
                    <th className="py-3 px-4">Bantuan Diterima</th>
                    <th className="py-3 px-4 text-center">Kelayakan</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {paginatedMustahik.length === 0 ? (
                    <tr>
                      <td colSpan={can('delete') && isSelectMustahikMode ? 8 : 7} className="py-12 text-center text-slate-400">
                        <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-600" />
                        <p className="font-semibold text-sm">Tidak ada data mustahik yang cocok.</p>
                        <p className="text-xs text-slate-400 mt-1">Coba ubah kata kunci pencarian atau filter golongan asnaf.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedMustahik.map((m) => {
                      const isSelected = selectedMustahikIds.includes(m.id);
                      return (
                        <tr
                          key={m.id}
                          className={`transition-colors ${
                            isSelected
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/40'
                              : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          {can('delete') && isSelectMustahikMode && (
                            <td className="py-3 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectOneMustahik(m.id)}
                                className="rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                              />
                            </td>
                          )}
                          {/* Nama & NIK */}
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                              {m.name}
                            </p>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mt-0.5">
                              <span>NIK: {maskNik(m.nik)}</span>
                            </div>
                            {m.phone && (
                              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3" /> {m.phone}
                              </p>
                            )}
                          </td>

                          {/* Asnaf */}
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getAsnafBadgeClass(
                                m.asnaf
                              )}`}
                            >
                              Asnaf {m.asnaf}
                            </span>
                          </td>

                          {/* Tanggungan & Alamat */}
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                              {m.familyDependents} Jiwa Tanggungan
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-1 mt-0.5 max-w-xs">
                              <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5 text-slate-400" />
                              <span>{m.address} ({m.rtRw})</span>
                            </p>
                          </td>

                          {/* Kondisi Ekonomi */}
                          <td className="py-3 px-4 max-w-xs">
                            <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">
                              {m.economicCondition}
                            </p>
                            {m.notes && (
                              <p className="text-[10px] text-slate-400 italic mt-0.5 truncate">
                                Catatan: {m.notes}
                              </p>
                            )}
                          </td>

                          {/* Bantuan Diterima */}
                          <td className="py-3 px-4">
                            <p className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                              {formatCurrencyIDR(m.totalAssistanceReceived || 0)}
                            </p>
                            {(m.totalRiceReceived || 0) > 0 && (
                              <p className="font-mono text-[11px] text-amber-600">
                                {m.totalRiceReceived} Kg Beras
                              </p>
                            )}
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Terakhir: {m.lastAssistanceDate || 'Belum'}
                            </p>
                          </td>

                          {/* Kelayakan */}
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              m.eligibilityStatus === 'Layak Terima'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : m.eligibilityStatus === 'Dalam Peninjauan'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              <CheckCircle2 className="w-3 h-3" />
                              {m.eligibilityStatus}
                            </span>
                          </td>

                          {/* Aksi */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {can('create') && (
                                <button
                                  onClick={() => handleOpenDistribute(m)}
                                  className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                                  title="Salurkan Bantuan Zakat Langsung"
                                >
                                  <Gift className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {can('edit') && (
                                <button
                                  onClick={() => handleOpenEditMustahik(m)}
                                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors cursor-pointer"
                                  title="Edit Data Mustahik"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {can('delete') && (
                                <button
                                  onClick={() => handleDeleteMustahik(m.id)}
                                  className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                                  title="Hapus Data Mustahik"
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

            {/* Mustahik Pagination Controls */}
            <Pagination
              currentPage={safeMustahikPage}
              totalPages={totalMustahikPages}
              totalItems={filteredMustahik.length}
              pageSize={mustahikPageSize}
              onPageChange={setMustahikPage}
              onPageSizeChange={(sz) => {
                setMustahikPageSize(sz);
                setMustahikPage(1);
              }}
              itemName="mustahik"
            />
          </div>
        </div>
      )}



      {/* ========================================================================= */}
      {/* MODAL: INPUT PENERIMAAN / PENYALURAN ZAKAT                                */}
      {/* ========================================================================= */}
      {isZakatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 max-w-lg w-full space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                {editingZakat ? 'Edit Catatan Zakat' : 'Catat Penerimaan & Penyaluran Zakat'}
              </h3>
              <button onClick={() => setIsZakatModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveZakat} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Jenis Zakat</label>
                  <select
                    value={zakatForm.type}
                    onChange={(e) => setZakatForm({ ...zakatForm, type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                  >
                    <option value="Zakat Fitrah">Zakat Fitrah</option>
                    <option value="Zakat Maal">Zakat Maal</option>
                    <option value="Fidyah">Fidyah</option>
                    <option value="Infaq Ramadhan">Infaq Ramadhan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Jumlah Jiwa Muzakki</label>
                  <input
                    type="number"
                    min="1"
                    value={zakatForm.familyCount}
                    onChange={(e) => setZakatForm({ ...zakatForm, familyCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Nama Lengkap Muzakki</label>
                <input
                  type="text"
                  required
                  value={zakatForm.muzakkiName}
                  onChange={(e) => setZakatForm({ ...zakatForm, muzakkiName: e.target.value })}
                  placeholder="Contoh: Ir. H. Muhammad Ridwan & Keluarga"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Nominal Uang (Rp)</label>
                  <input
                    type="number"
                    value={zakatForm.cashAmount || ''}
                    onChange={(e) => setZakatForm({ ...zakatForm, cashAmount: Number(e.target.value) })}
                    placeholder="Contoh: 180000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Beras (Kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={zakatForm.riceKg || ''}
                    onChange={(e) => setZakatForm({ ...zakatForm, riceKg: Number(e.target.value) })}
                    placeholder="Contoh: 12.5"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Target 8 Asnaf</label>
                  <select
                    value={zakatForm.asnafTarget}
                    onChange={(e) => setZakatForm({ ...zakatForm, asnafTarget: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                  >
                    <option value="Fakir">Fakir</option>
                    <option value="Miskin">Miskin</option>
                    <option value="Amil">Amil</option>
                    <option value="Mualaf">Mualaf</option>
                    <option value="Fisabilillah">Fisabilillah</option>
                    <option value="Ibnu Sabil">Ibnu Sabil</option>
                    <option value="Gharimin">Gharimin</option>
                    <option value="Riqab">Riqab</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Status Penyaluran</label>
                  <select
                    value={zakatForm.status}
                    onChange={(e) => setZakatForm({ ...zakatForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                  >
                    <option value="Tersimpan di Amil">Tersimpan di Amil</option>
                    <option value="Tersalurkan">Tersalurkan ke Mustahik</option>
                  </select>
                </div>
              </div>

              {/* Hubungkan ke Database Mustahik */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="block text-slate-700 dark:text-slate-300 font-bold">
                  Pilih Penerima Manfaat (Mustahik Terdaftar)
                </label>
                <select
                  value={zakatForm.mustahikId}
                  onChange={(e) => {
                    const mid = e.target.value;
                    const found = mustahikList.find((m) => m.id === mid);
                    setZakatForm({
                      ...zakatForm,
                      mustahikId: mid,
                      recipientName: found ? found.name : '',
                      asnafTarget: found ? found.asnaf : zakatForm.asnafTarget,
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                >
                  <option value="">-- Ketik manual penerima atau pilih dari Database Mustahik --</option>
                  {mustahikList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (Asnaf {m.asnaf} - {m.rtRw})
                    </option>
                  ))}
                </select>

                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Nama Penerima Manual / Keterangan:</label>
                  <input
                    type="text"
                    value={zakatForm.recipientName}
                    onChange={(e) => setZakatForm({ ...zakatForm, recipientName: e.target.value })}
                    placeholder="Contoh: Santunan Lansia Dhuafa RT 02"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  value={zakatForm.notes}
                  onChange={(e) => setZakatForm({ ...zakatForm, notes: e.target.value })}
                  placeholder="Keterangan jenis beras, akad atau transfer..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsZakatModalOpen(false)}
                  className="px-4 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                >
                  {editingZakat ? 'Simpan Perubahan' : 'Simpan Catatan Zakat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH / EDIT DATA MUSTAHIK                                        */}
      {/* ========================================================================= */}
      {isMustahikModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 max-w-lg w-full space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                <UserCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                  {editingMustahik ? 'Edit Data Mustahik' : 'Pendaftaran Data Mustahik Baru'}
                </h3>
              </div>
              <button onClick={() => setIsMustahikModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMustahik} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Nama Kepala Keluarga *
                  </label>
                  <input
                    type="text"
                    required
                    value={mustahikForm.name}
                    onChange={(e) => setMustahikForm({ ...mustahikForm, name: e.target.value })}
                    placeholder="Contoh: Ibu Maryamah"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Golongan 8 Asnaf *
                  </label>
                  <select
                    value={mustahikForm.asnaf}
                    onChange={(e) => setMustahikForm({ ...mustahikForm, asnaf: e.target.value as Asnaf8 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none font-semibold"
                  >
                    <option value="Fakir">Fakir (Tidak memiliki penghasilan)</option>
                    <option value="Miskin">Miskin (Penghasilan di bawah kecukupan)</option>
                    <option value="Fisabilillah">Fisabilillah (Guru ngaji & pejuang dakwah)</option>
                    <option value="Mualaf">Mualaf (Baru masuk Islam / binaan)</option>
                    <option value="Gharimin">Gharimin (Terlilit hutang darurat medis/usaha)</option>
                    <option value="Amil">Amil (Petugas pengelola zakat)</option>
                    <option value="Ibnu Sabil">Ibnu Sabil (Musafir kehabisan bekal)</option>
                    <option value="Riqab">Riqab (Pembebasan & perlindungan)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    NIK KTP (16 Digit)
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    value={mustahikForm.nik}
                    onChange={(e) => setMustahikForm({ ...mustahikForm, nik: e.target.value })}
                    placeholder="3201xxxxxxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    No. Kartu Keluarga (KK)
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    value={mustahikForm.noKK}
                    onChange={(e) => setMustahikForm({ ...mustahikForm, noKK: e.target.value })}
                    placeholder="3201xxxxxxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Jumlah Tanggungan Jiwa *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={mustahikForm.familyDependents}
                    onChange={(e) => setMustahikForm({ ...mustahikForm, familyDependents: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    No. Telepon / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={mustahikForm.phone}
                    onChange={(e) => setMustahikForm({ ...mustahikForm, phone: e.target.value })}
                    placeholder="08xxxxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Alamat Lengkap Rumah *
                  </label>
                  <input
                    type="text"
                    required
                    value={mustahikForm.address}
                    onChange={(e) => setMustahikForm({ ...mustahikForm, address: e.target.value })}
                    placeholder="Gang Salak III No. 05, Kp. Sukamaju"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    RT / RW *
                  </label>
                  <input
                    type="text"
                    required
                    value={mustahikForm.rtRw}
                    onChange={(e) => setMustahikForm({ ...mustahikForm, rtRw: e.target.value })}
                    placeholder="RT 01 / RW 05"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Kondisi Ekonomi / Kebutuhan Bantuan *
                </label>
                <textarea
                  rows={2}
                  required
                  value={mustahikForm.economicCondition}
                  onChange={(e) => setMustahikForm({ ...mustahikForm, economicCondition: e.target.value })}
                  placeholder="Deskripsikan kondisi pekerjaan, tempat tinggal, tanggungan anak sekolah atau lansia sakit..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Status Verifikasi Kelayakan
                  </label>
                  <select
                    value={mustahikForm.eligibilityStatus}
                    onChange={(e) => setMustahikForm({ ...mustahikForm, eligibilityStatus: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                  >
                    <option value="Layak Terima">Layak Terima (Terverifikasi)</option>
                    <option value="Dalam Peninjauan">Dalam Peninjauan (Survei)</option>
                    <option value="Sudah Mandiri">Sudah Mandiri (Tidak Memerlukan)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Catatan Khusus Pengurus DKM
                  </label>
                  <input
                    type="text"
                    value={mustahikForm.notes}
                    onChange={(e) => setMustahikForm({ ...mustahikForm, notes: e.target.value })}
                    placeholder="Prioritas santunan beras / beasiswa..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsMustahikModalOpen(false)}
                  className="px-4 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                >
                  {editingMustahik ? 'Simpan Perubahan' : 'Daftarkan Mustahik'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SALURKAN BANTUAN CEPAT KE MUSTAHIK                                 */}
      {/* ========================================================================= */}
      {isDistributeModalOpen && distributeTargetMustahik && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 max-w-md w-full space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                <Gift className="w-5 h-5 text-emerald-600 shrink-0" />
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                  Salurkan Bantuan Zakat
                </h3>
              </div>
              <button onClick={() => setIsDistributeModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs">
              <p className="font-bold text-emerald-900 dark:text-emerald-300">
                Penerima: {distributeTargetMustahik.name}
              </p>
              <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                Golongan Asnaf: <strong>{distributeTargetMustahik.asnaf}</strong> • {distributeTargetMustahik.familyDependents} Jiwa
              </p>
              <p className="text-slate-500 text-[11px] mt-0.5">{distributeTargetMustahik.address}</p>
            </div>

            <form onSubmit={handleCommitDistribute} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Sumber Jenis Penyaluran
                </label>
                <select
                  value={distributeForm.type}
                  onChange={(e) => setDistributeForm({ ...distributeForm, type: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                >
                  <option value="Zakat Fitrah">Zakat Fitrah (Beras / Tunai)</option>
                  <option value="Zakat Maal">Zakat Maal (Santunan Tunai)</option>
                  <option value="Fidyah">Fidyah (Makanan / Uang)</option>
                  <option value="Infaq Ramadhan">Infaq Ramadhan / Sembako</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Beras (Kg)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={distributeForm.riceKg}
                    onChange={(e) => setDistributeForm({ ...distributeForm, riceKg: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Uang Tunai (Rp)
                  </label>
                  <input
                    type="number"
                    step="10000"
                    value={distributeForm.cashAmount}
                    onChange={(e) => setDistributeForm({ ...distributeForm, cashAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Catatan Penyaluran
                </label>
                <input
                  type="text"
                  value={distributeForm.notes}
                  onChange={(e) => setDistributeForm({ ...distributeForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDistributeModalOpen(false)}
                  className="px-4 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                >
                  Konfirmasi Penyaluran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modals for Zakat & Mustahik */}
      {/* 1. Zakat Single Delete */}
      <ConfirmDeleteModal
        isOpen={!!deleteConfirmZakatId}
        onClose={() => setDeleteConfirmZakatId(null)}
        onConfirm={handleConfirmDeleteZakatSingle}
        title="Hapus Catatan Zakat?"
        itemName={
          zakatRecords.find((r) => r.id === deleteConfirmZakatId)
            ? `Kwitansi ${zakatRecords.find((r) => r.id === deleteConfirmZakatId)?.receiptNumber} - ${zakatRecords.find((r) => r.id === deleteConfirmZakatId)?.muzakkiName}`
            : 'catatan zakat ini'
        }
        confirmText="Ya, Hapus Catatan"
      />

      {/* 2. Zakat Multi Delete */}
      <ConfirmDeleteModal
        isOpen={isMultiDeleteZakatOpen}
        onClose={() => setIsMultiDeleteZakatOpen(false)}
        onConfirm={handleConfirmDeleteZakatMulti}
        title="Konfirmasi Hapus Massal Zakat"
        count={selectedZakatIds.length}
        itemName="catatan zakat"
        confirmText={`Hapus ${selectedZakatIds.length} Catatan`}
      />

      {/* 3. Mustahik Single Delete */}
      <ConfirmDeleteModal
        isOpen={!!deleteConfirmMustahikId}
        onClose={() => setDeleteConfirmMustahikId(null)}
        onConfirm={handleConfirmDeleteMustahikSingle}
        title="Hapus Data Mustahik?"
        itemName={
          mustahikList.find((m) => m.id === deleteConfirmMustahikId)
            ? `${mustahikList.find((m) => m.id === deleteConfirmMustahikId)?.name} (Asnaf ${mustahikList.find((m) => m.id === deleteConfirmMustahikId)?.asnaf})`
            : 'data mustahik ini'
        }
        confirmText="Ya, Hapus Mustahik"
      />

      {/* 4. Mustahik Multi Delete */}
      <ConfirmDeleteModal
        isOpen={isMultiDeleteMustahikOpen}
        onClose={() => setIsMultiDeleteMustahikOpen(false)}
        onConfirm={handleConfirmDeleteMustahikMulti}
        title="Konfirmasi Hapus Massal Mustahik"
        count={selectedMustahikIds.length}
        itemName="data mustahik"
        confirmText={`Hapus ${selectedMustahikIds.length} Mustahik`}
      />

      {/* 5. Printable Report Modal for Zakat */}
      <ReportPrintModal
        isOpen={isZakatReportPrintOpen}
        onClose={() => setIsZakatReportPrintOpen(false)}
        title={zakatReportConfig.title}
        subtitle={`Badan Amil Zakat & Infaq Masjid (BAZIS) - DKM ${mosqueProfile.name}`}
        periodText={`Tahun ${new Date().getFullYear()} M${isZakatFilterActive ? ` • Filter Aktif (${filteredZakat.length} dari ${zakatRecords.length} Catatan)` : ` • Semua Data (${zakatRecords.length} Catatan)`}`}
        categoryName={selectedZakatType !== 'all' ? selectedZakatType : undefined}
        summaryCards={zakatReportConfig.cards}
        columns={zakatReportConfig.cols}
        data={zakatReportConfig.rows}
        notes={`Laporan resmi penerimaan dan penyaluran ${zakatReportConfig.reportLabel} ini disusun secara tertib oleh BAZIS DKM ${mosqueProfile.name} demi transparansi publik kepada seluruh jamaah dan muzakki.`}
        signatures={[
          { role: 'Ketua DKM (Admin)', name: getDefaultOfficerName('admin', 'Drs. KH. Ahmad Muzammil'), position: `Ketua DKM ${mosqueProfile.name}` },
          { role: 'Bendahara Keuangan', name: getDefaultOfficerName('bendahara', 'H. Ahmad Sobari, SE, Ak.'), position: 'Bendahara / Amil ZISWAF' },
        ]}
      />

      {/* 6. Printable Report Modal for Mustahik 8 Asnaf */}
      <ReportPrintModal
        isOpen={isMustahikReportPrintOpen}
        onClose={() => setIsMustahikReportPrintOpen(false)}
        title="BUKU INDUK REGISTRASI MUSTAHIK (8 ASNAF)"
        subtitle={`Data Fakir, Miskin & Mustahik Berhak Terima ZISWAF - DKM ${mosqueProfile.name}`}
        periodText={`Pemutakhiran Data Periode ${new Date().getFullYear()}${selectedAsnafFilter !== 'all' || mustahikSearch.trim() ? ` • Filter Aktif (${filteredMustahik.length} dari ${mustahikList.length} Penerima)` : ` • Semua Data (${mustahikList.length} Penerima)`}`}
        categoryName={selectedAsnafFilter !== 'all' ? selectedAsnafFilter : undefined}
        summaryCards={[
          { label: 'Total Mustahik Terdata', value: `${filteredMustahik.length} Penerima`, color: 'emerald' },
          {
            label: 'Fakir & Miskin Prioritas',
            value: `${filteredMustahik.filter((m) => m.asnaf === 'Fakir' || m.asnaf === 'Miskin').length} KK / Orang`,
            color: 'amber',
          },
          {
            label: 'Total Jiwa Tanggungan',
            value: `${filteredMustahik.reduce((acc, m) => acc + (Number(m.familyDependents) || 1), 0)} Jiwa`,
            color: 'blue',
          },
          {
            label: 'Status Layak Terima',
            value: `${filteredMustahik.filter((m) => m.eligibilityStatus === 'Layak Terima').length} Mustahik`,
            color: 'purple',
          },
        ]}
        columns={[
          { header: 'No', key: 'no', width: '5%', align: 'center' },
          { header: 'Nama Mustahik', key: 'name', width: '22%' },
          { header: 'Asnaf', key: 'asnaf', width: '13%' },
          { header: 'Alamat / Lingkungan', key: 'address', width: '25%' },
          { header: 'Tanggungan', key: 'dependents', width: '10%', align: 'center' },
          { header: 'Status Kelayakan', key: 'eligibility', width: '13%' },
          { header: 'Kondisi Ekonomi', key: 'condition', width: '12%' },
        ]}
        data={filteredMustahik.map((m, idx) => ({
          no: idx + 1,
          name: m.name,
          asnaf: m.asnaf,
          address: `${m.address} (${m.rtRw})`,
          dependents: `${m.familyDependents} Jiwa`,
          eligibility: m.eligibilityStatus,
          condition: m.economicCondition || '-',
        }))}
        notes={`Buku registrasi mustahik 8 asnaf ini merupakan dokumen amanah penataan sosial ekonomi umat di lingkungan ${mosqueProfile.name}.`}
        signatures={[
          { role: 'Ketua DKM (Admin)', name: getDefaultOfficerName('admin', 'Drs. KH. Ahmad Muzammil'), position: `Ketua DKM ${mosqueProfile.name}` },
          { role: 'Bendahara Keuangan', name: getDefaultOfficerName('bendahara', 'H. Ahmad Sobari, SE, Ak.'), position: 'Bendahara / Amil ZISWAF' },
        ]}
      />
    </div>
  );
};
