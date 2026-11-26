import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import {
  IncomingLetter,
  OutgoingLetter,
} from '../types/index.ts';
import {
  getStoredIncomingLetters,
  saveStoredIncomingLetters,
  getStoredOutgoingLetters,
  saveStoredOutgoingLetters,
  getStoredSignatureForSigner,
  saveStoredSignatureForSigner,
  getStoredMosqueProfile,
  formatDkmHeaderTitle,
  formatReportCity,
  getDefaultOfficerName,
  getStoredReportSigners,
  normalizeReportSignerRoleKey,
} from '../services/storage.ts';
import {
  generateDispositionPdf,
  generateOutgoingLetterPdf,
  generateOfficialPdfReport,
  printElementViaIframe,
} from '../services/pdfService.ts';
import {
  FileText,
  Mail,
  Plus,
  Printer,
  Search,
  CheckCircle2,
  Trash2,
  Eye,
  X,
  FileCheck,
  Send,
  Inbox,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  UserCheck,
  Paperclip,
  Edit2,
  ChevronDown,
  Download,
  Loader2,
  Building2,
  ArrowLeft,
  History,
  ChevronRight,
  CheckSquare,
  PenTool,
} from 'lucide-react';
import { Pagination } from './common/Pagination.tsx';
import { MultiDeleteBar } from './common/MultiDeleteBar.tsx';
import { ConfirmDeleteModal } from './common/ConfirmDeleteModal.tsx';
import { ReportPrintModal } from './common/ReportPrintModal.tsx';
import { DigitalSignaturePadModal } from './common/DigitalSignaturePadModal.tsx';

const SHORT_MONTHS_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

function formatShortDateId(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, monthStr, day] = parts;
  const monthIdx = parseInt(monthStr, 10) - 1;
  const monthName = SHORT_MONTHS_ID[monthIdx] || monthStr;
  return `${day} ${monthName} ${year}`;
}

type UnifiedLetterRow =
  | {
      kind: 'incoming';
      uid: string;
      id: string;
      displayNumber: string;
      sortDate: string;
      displayDate: string;
      title: string;
      party: string;
      note: string;
      category: string;
      status: string;
      raw: IncomingLetter;
    }
  | {
      kind: 'outgoing';
      uid: string;
      id: string;
      displayNumber: string;
      sortDate: string;
      displayDate: string;
      title: string;
      party: string;
      note: string;
      category: string;
      status: string;
      raw: OutgoingLetter;
    };

export const LettersAdminView: React.FC = () => {
  const { can } = useAuth();
  const { themeConfig } = useTheme();
  const [mosqueProfile, setMosqueProfile] = useState(() => getStoredMosqueProfile());

  useEffect(() => {
    const syncProfile = () => setMosqueProfile(getStoredMosqueProfile());
    window.addEventListener('mosque-profile-updated', syncProfile);
    window.addEventListener('storage', syncProfile);
    return () => {
      window.removeEventListener('mosque-profile-updated', syncProfile);
      window.removeEventListener('storage', syncProfile);
    };
  }, []);

  // Unified Tab: 'all' (Semua Surat) | 'incoming' (Surat Masuk) | 'outgoing' (Surat Keluar)
  const [activeTab, setActiveTab] = useState<'all' | 'incoming' | 'outgoing'>('all');

  // Search & Optional Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [showExtraFilters, setShowExtraFilters] = useState(false);
  const [incomingStatusFilter, setIncomingStatusFilter] = useState<string>('all');
  const [incomingCategoryFilter, setIncomingCategoryFilter] = useState<string>('all');
  const [outgoingTypeFilter, setOutgoingTypeFilter] = useState<string>('all');

  // Toolbar Export/Print Dropdown
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Report Print states
  const [isIncomingReportPrintOpen, setIsIncomingReportPrintOpen] = useState(false);
  const [isOutgoingReportPrintOpen, setIsOutgoingReportPrintOpen] = useState(false);

  // Sheet Refs & PDF loading states
  const dispositionSheetRef = useRef<HTMLDivElement>(null);
  const outgoingSheetRef = useRef<HTMLDivElement>(null);
  const [isExportingIncomingPdf, setIsExportingIncomingPdf] = useState(false);
  const [isExportingOutgoingPdf, setIsExportingOutgoingPdf] = useState(false);

  // Data States
  const [incomingLetters, setIncomingLetters] = useState<IncomingLetter[]>(() =>
    getStoredIncomingLetters()
  );
  const [outgoingLetters, setOutgoingLetters] = useState<OutgoingLetter[]>(() =>
    getStoredOutgoingLetters()
  );

  // Detail Preview Modal States (default null so no modal opens on arrival)
  const [selectedIncoming, setSelectedIncoming] = useState<IncomingLetter | null>(null);
  const [incomingDetailTab, setIncomingDetailTab] = useState<'detail' | 'preview'>('detail');
  const [selectedOutgoing, setSelectedOutgoing] = useState<OutgoingLetter | null>(null);

  // Add/Edit Modal States
  const [isIncomingModalOpen, setIsIncomingModalOpen] = useState(false);
  const [editingIncoming, setEditingIncoming] = useState<IncomingLetter | null>(null);
  const [isOutgoingModalOpen, setIsOutgoingModalOpen] = useState(false);
  const [editingOutgoing, setEditingOutgoing] = useState<OutgoingLetter | null>(null);

  // Pagination & Multi-Delete States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);

  // Delete Confirmation States
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    kind: 'incoming' | 'outgoing';
    id: string;
    label: string;
  } | null>(null);
  const [isMultiDeleteModalOpen, setIsMultiDeleteModalOpen] = useState(false);

  // Digital Signature States
  const [dispositionRecipientSig, setDispositionRecipientSig] = useState<string | null>(null);
  const [dispositionChairmanSig, setDispositionChairmanSig] = useState<string | null>(null);
  const [outgoingSig, setOutgoingSig] = useState<string | null>(null);
  const [activeLetterSigner, setActiveLetterSigner] = useState<{
    role: string;
    name: string;
    target: 'disposition-recipient' | 'disposition-chairman' | 'outgoing';
  } | null>(null);

  // Forms
  const [incomingForm, setIncomingForm] = useState({
    agendaNumber: '',
    letterNumber: '',
    sender: '',
    subject: '',
    category: 'Edaran Resmi' as IncomingLetter['category'],
    letterDate: new Date().toISOString().slice(0, 10),
    receivedDate: new Date().toISOString().slice(0, 10),
    urgency: 'Penting' as IncomingLetter['urgency'],
    dispositionTo: 'Ketua DKM & Seksi Dakwah',
    dispositionInstruction: 'Mohon ditindaklanjuti dan dikoordinasikan.',
    status: 'Belum Diproses' as IncomingLetter['status'],
    summary: '',
    attachmentName: '',
    notes: '',
  });

  const [outgoingForm, setOutgoingForm] = useState({
    type: 'Surat Undangan' as OutgoingLetter['type'],
    title: '',
    recipient: '',
    content: '',
    signerName: mosqueProfile.leadPerson || 'Drs. KH. Ahmad Muzammil',
    signerPosition: `Ketua DKM ${mosqueProfile.name || "Masjid Jami' Al-Barkah"}`,
    status: 'Diterbitkan' as OutgoingLetter['status'],
    attachmentInfo: '-',
    notes: '',
  });

  // Close export dropdown on outside click
  useEffect(() => {
    if (!isExportMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExportMenuOpen]);

  // Storage & custom event sync (also refreshes open detail modals & officer names)
  useEffect(() => {
    const syncLetters = () => {
      const latestIncoming = getStoredIncomingLetters();
      const latestOutgoing = getStoredOutgoingLetters();
      setIncomingLetters(latestIncoming);
      setOutgoingLetters(latestOutgoing);
      setSelectedIncoming((prev) =>
        prev ? latestIncoming.find((l) => l.id === prev.id) || null : null
      );
      setSelectedOutgoing((prev) =>
        prev ? latestOutgoing.find((l) => l.id === prev.id) || null : null
      );
    };
    const handleStorageSync = (e: StorageEvent) => {
      if (!e.key || e.key === 'sabiluna_incoming_letters' || e.key === 'sabiluna_outgoing_letters') {
        syncLetters();
      }
      if (!e.key || e.key === 'sabiluna_managed_users') {
        setIncomingLetters((prev) => [...prev]);
      }
    };
    const handleUsersUpdated = () => {
      setIncomingLetters((prev) => [...prev]);
    };
    window.addEventListener('storage', handleStorageSync);
    window.addEventListener('letters-updated', syncLetters);
    window.addEventListener('managed-users-updated', handleUsersUpdated);
    return () => {
      window.removeEventListener('storage', handleStorageSync);
      window.removeEventListener('letters-updated', syncLetters);
      window.removeEventListener('managed-users-updated', handleUsersUpdated);
    };
  }, []);

  // Signature sync
  useEffect(() => {
    const syncSignatures = () => {
      if (selectedIncoming) {
        setDispositionRecipientSig(
          getStoredSignatureForSigner(
            'Penerima Disposisi',
            selectedIncoming.dispositionTo || 'Penerima Disposisi'
          )
        );
        const leadName = getDefaultOfficerName(
          'admin',
          mosqueProfile.leadPerson || 'Drs. KH. Ahmad Muzammil'
        );
        setDispositionChairmanSig(
          getStoredSignatureForSigner(`Ketua DKM ${mosqueProfile.name || 'Masjid'}`, leadName) ||
            getStoredSignatureForSigner('Ketua DKM (Admin)', leadName) ||
            getStoredSignatureForSigner("Ketua DKM Jami' Al-Barkah", leadName)
        );
      }
      if (selectedOutgoing) {
        setOutgoingSig(
          getStoredSignatureForSigner(selectedOutgoing.signerPosition, selectedOutgoing.signerName)
        );
      }
    };

    syncSignatures();
    window.addEventListener('signatures-updated', syncSignatures);
    return () => window.removeEventListener('signatures-updated', syncSignatures);
  }, [selectedIncoming, selectedOutgoing, mosqueProfile.leadPerson, mosqueProfile.name]);

  // --- PRINT / PDF HANDLERS ---
  const handlePrintDisposition = () => {
    if (incomingDetailTab !== 'preview') {
      setIncomingDetailTab('preview');
    }
    setTimeout(() => {
      if (dispositionSheetRef.current) {
        printElementViaIframe(
          dispositionSheetRef.current,
          `Lembar Disposisi - ${selectedIncoming?.agendaNumber || ''}`
        );
      } else {
        window.print();
      }
    }, 100);
  };

  const handleDownloadDispositionPdf = () => {
    if (!selectedIncoming || isExportingIncomingPdf) return;
    setIsExportingIncomingPdf(true);
    try {
      const leadName = getDefaultOfficerName(
        'admin',
        mosqueProfile.leadPerson || 'Drs. KH. Ahmad Muzammil'
      );
      generateDispositionPdf(selectedIncoming, [
        {
          role: 'Penerima Disposisi',
          name: selectedIncoming.dispositionTo || 'Penerima Disposisi',
          signatureDataUrl: dispositionRecipientSig || undefined,
        },
        {
          role: `Ketua DKM ${mosqueProfile.name || 'Masjid'}`,
          name: leadName,
          signatureDataUrl: dispositionChairmanSig || undefined,
        },
      ]);
    } finally {
      setIsExportingIncomingPdf(false);
    }
  };

  const handlePrintOutgoingLetter = () => {
    if (outgoingSheetRef.current) {
      printElementViaIframe(
        outgoingSheetRef.current,
        `Surat DKM - ${selectedOutgoing?.letterNumber || ''}`
      );
    } else {
      window.print();
    }
  };

  const handleDownloadOutgoingPdf = () => {
    if (!selectedOutgoing || isExportingOutgoingPdf) return;
    setIsExportingOutgoingPdf(true);
    try {
      generateOutgoingLetterPdf(selectedOutgoing, outgoingSig);
    } finally {
      setIsExportingOutgoingPdf(false);
    }
  };

  const getAgendaBaseSignatures = () => [
    {
      role: 'Ketua DKM (Admin)',
      name: getDefaultOfficerName('admin', mosqueProfile.leadPerson || 'Drs. KH. Ahmad Muzammil'),
      position: `Ketua DKM ${mosqueProfile.name || 'Masjid'}`,
    },
    {
      role: 'Sekretaris DKM',
      name: getDefaultOfficerName('sekretaris', 'Ust. Farhan Basalamah, S.Kom'),
      position: 'Sekretaris Umum',
    },
  ];

  const resolveAgendaReportSignatures = () => {
    const baseSigners = getAgendaBaseSignatures();
    const storedOverrides = getStoredReportSigners();
    return baseSigners.map((sig) => {
      const override = storedOverrides[normalizeReportSignerRoleKey(sig.role)];
      const resolvedName =
        override?.name && override.name.trim() !== '' ? override.name : sig.name;
      const resolvedPosition =
        override?.position !== undefined ? override.position : sig.position;
      return {
        role: sig.role,
        name: resolvedName,
        position: resolvedPosition,
        signatureDataUrl: getStoredSignatureForSigner(sig.role, resolvedName) || undefined,
      };
    });
  };

  const handleDownloadIncomingAgendaPdf = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    generateOfficialPdfReport({
      title: 'BUKU AGENDA SURAT MASUK RESMI DKM',
      subtitle: `Sekretariat & Tata Usaha ${mosqueProfile.name || 'DKM Masjid'}`,
      periodText: `Tahun Dokumen ${new Date().getFullYear()}${filteredIncomingForReport.length !== incomingLetters.length ? ` • Filter Aktif (${filteredIncomingForReport.length} dari ${incomingLetters.length} Surat)` : ` • Semua Data (${incomingLetters.length} Surat)`}`,
      summaryCards: [
        { label: 'Total Surat Masuk', value: `${filteredIncomingForReport.length} Berkas` },
        {
          label: 'Selesai Ditindaklanjuti',
          value: `${filteredIncomingForReport.filter((l) => l.status === 'Selesai Ditindaklanjuti').length} Surat`,
        },
        {
          label: 'Perlu Tindak Lanjut',
          value: `${filteredIncomingForReport.filter((l) => l.status === 'Belum Diproses' || l.status === 'Didisposisikan').length} Surat`,
        },
        {
          label: 'Sifat Penting / Kilat',
          value: `${filteredIncomingForReport.filter((l) => l.urgency === 'Kilat / Segera' || l.urgency === 'Penting').length} Surat`,
        },
      ],
      tableHeaders: ['No. Agenda', 'Tgl Terima', 'Nomor Surat Asal', 'Pengirim / Asal', 'Perihal Surat', 'Disposisi & Status'],
      tableRows: filteredIncomingForReport.map((l) => [
        l.agendaNumber,
        l.receivedDate,
        l.letterNumber,
        l.sender,
        l.subject,
        `${l.dispositionTo ? `${l.dispositionTo}: ` : ''}${l.status}`,
      ]),
      footerNotes: 'Buku agenda surat masuk ini merupakan arsip resmi tata usaha DKM untuk pencatatan korespondensi kelembagaan.',
      signatures: resolveAgendaReportSignatures(),
      filename: `buku_agenda_surat_masuk_${dateStr}.pdf`,
    });
  };

  const handleDownloadOutgoingAgendaPdf = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    generateOfficialPdfReport({
      title: 'BUKU EKSPEDISI & AGENDA SURAT KELUAR RESMI',
      subtitle: `Sekretariat & Penerbitan Dokumen Resmi ${mosqueProfile.name || 'DKM Masjid'}`,
      periodText: `Tahun Dokumen ${new Date().getFullYear()}${filteredOutgoingForReport.length !== outgoingLetters.length ? ` • Filter Aktif (${filteredOutgoingForReport.length} dari ${outgoingLetters.length} Surat)` : ` • Semua Data (${outgoingLetters.length} Surat)`}`,
      summaryCards: [
        { label: 'Total Surat Keluar', value: `${filteredOutgoingForReport.length} Berkas` },
        {
          label: 'Status Diterbitkan',
          value: `${filteredOutgoingForReport.filter((l) => l.status === 'Diterbitkan').length} Surat`,
        },
        {
          label: 'Status Draf / Review',
          value: `${filteredOutgoingForReport.filter((l) => l.status !== 'Diterbitkan').length} Surat`,
        },
      ],
      tableHeaders: ['Nomor Surat DKM', 'Tanggal', 'Jenis Dokumen', 'Tujuan / Penerima', 'Perihal Dokumen', 'Status'],
      tableRows: filteredOutgoingForReport.map((l) => [
        l.letterNumber,
        l.date,
        l.type,
        l.recipient,
        l.title,
        l.status,
      ]),
      footerNotes: 'Buku ekspedisi surat keluar ini menjadi bukti sah korespondensi eksternal dan internal Dewan Kemakmuran Masjid.',
      signatures: resolveAgendaReportSignatures(),
      filename: `buku_ekspedisi_surat_keluar_${dateStr}.pdf`,
    });
  };

  // --- HANDLERS: SURAT MASUK ---
  const handleOpenAddIncoming = () => {
    setEditingIncoming(null);
    const count = incomingLetters.length + 1;
    const num = count < 10 ? `00${count}` : count < 100 ? `0${count}` : `${count}`;
    setIncomingForm({
      agendaNumber: `${num}/AGD-IN/XI/2026`,
      letterNumber: '',
      sender: '',
      subject: '',
      category: 'Edaran Resmi',
      letterDate: new Date().toISOString().slice(0, 10),
      receivedDate: new Date().toISOString().slice(0, 10),
      urgency: 'Penting',
      dispositionTo: 'Ketua DKM',
      dispositionInstruction: 'Harap dipelajari dan ditindaklanjuti sesuai jadwal.',
      status: 'Didisposisikan',
      summary: '',
      attachmentName: '',
      notes: '',
    });
    setIsIncomingModalOpen(true);
  };

  const handleOpenEditIncoming = (letter: IncomingLetter) => {
    setEditingIncoming(letter);
    setIncomingForm({
      agendaNumber: letter.agendaNumber,
      letterNumber: letter.letterNumber,
      sender: letter.sender,
      subject: letter.subject,
      category: letter.category,
      letterDate: letter.letterDate,
      receivedDate: letter.receivedDate,
      urgency: letter.urgency,
      dispositionTo: letter.dispositionTo,
      dispositionInstruction: letter.dispositionInstruction,
      status: letter.status,
      summary: letter.summary,
      attachmentName: letter.attachmentName || '',
      notes: letter.notes || '',
    });
    setIsIncomingModalOpen(true);
  };

  const handleSaveIncoming = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incomingForm.sender.trim() || !incomingForm.subject.trim()) return;

    if (editingIncoming) {
      const updatedList = incomingLetters.map((l) =>
        l.id === editingIncoming.id
          ? {
              ...l,
              agendaNumber: incomingForm.agendaNumber.trim(),
              letterNumber: incomingForm.letterNumber.trim() || 'Tanpa Nomor',
              sender: incomingForm.sender.trim(),
              subject: incomingForm.subject.trim(),
              category: incomingForm.category,
              letterDate: incomingForm.letterDate,
              receivedDate: incomingForm.receivedDate,
              urgency: incomingForm.urgency,
              dispositionTo: incomingForm.dispositionTo.trim(),
              dispositionInstruction: incomingForm.dispositionInstruction.trim(),
              status: incomingForm.status,
              summary: incomingForm.summary.trim(),
              attachmentName: incomingForm.attachmentName.trim() || undefined,
              notes: incomingForm.notes.trim() || undefined,
            }
          : l
      );
      setIncomingLetters(updatedList);
      saveStoredIncomingLetters(updatedList);
      const updated = updatedList.find((l) => l.id === editingIncoming.id);
      if (updated && selectedIncoming?.id === editingIncoming.id) {
        setSelectedIncoming(updated);
      }
    } else {
      const newLetter: IncomingLetter = {
        id: `SM-${Date.now().toString().slice(-4)}`,
        agendaNumber:
          incomingForm.agendaNumber.trim() || `0${incomingLetters.length + 1}/AGD-IN/XI/2026`,
        letterNumber: incomingForm.letterNumber.trim() || 'Tanpa Nomor',
        sender: incomingForm.sender.trim(),
        subject: incomingForm.subject.trim(),
        category: incomingForm.category,
        letterDate: incomingForm.letterDate,
        receivedDate: incomingForm.receivedDate,
        urgency: incomingForm.urgency,
        dispositionTo: incomingForm.dispositionTo.trim(),
        dispositionInstruction: incomingForm.dispositionInstruction.trim(),
        status: incomingForm.status,
        summary: incomingForm.summary.trim(),
        attachmentName: incomingForm.attachmentName.trim() || undefined,
        notes: incomingForm.notes.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      const updatedList = [newLetter, ...incomingLetters];
      setIncomingLetters(updatedList);
      saveStoredIncomingLetters(updatedList);
    }

    setIsIncomingModalOpen(false);
  };

  const handleUpdateIncomingStatus = (id: string, newStatus: IncomingLetter['status']) => {
    const updatedList = incomingLetters.map((l) => (l.id === id ? { ...l, status: newStatus } : l));
    setIncomingLetters(updatedList);
    saveStoredIncomingLetters(updatedList);
    if (selectedIncoming?.id === id) {
      setSelectedIncoming({ ...selectedIncoming, status: newStatus });
    }
  };

  // --- HANDLERS: SURAT KELUAR ---
  const handleOpenAddOutgoing = () => {
    setEditingOutgoing(null);
    setOutgoingForm({
      type: 'Surat Undangan',
      title: '',
      recipient: '',
      content: '',
      signerName: mosqueProfile.leadPerson || 'Drs. KH. Ahmad Muzammil',
      signerPosition: `Ketua DKM ${mosqueProfile.name || "Masjid Jami' Al-Barkah"}`,
      status: 'Diterbitkan',
      attachmentInfo: '-',
      notes: '',
    });
    setIsOutgoingModalOpen(true);
  };

  const handleOpenEditOutgoing = (letter: OutgoingLetter) => {
    setEditingOutgoing(letter);
    setOutgoingForm({
      type: letter.type,
      title: letter.title,
      recipient: letter.recipient,
      content: letter.content,
      signerName: letter.signerName,
      signerPosition: letter.signerPosition,
      status: letter.status,
      attachmentInfo: letter.attachmentInfo || '-',
      notes: letter.notes || '',
    });
    setIsOutgoingModalOpen(true);
  };

  const handleTemplateSelect = (type: OutgoingLetter['type']) => {
    let content = '';
    let title = '';
    let recipient = '';

    if (type === 'Surat Undangan') {
      title = 'Undangan Rapat Evaluasi Program Kerja DKM & Keuangan';
      recipient = 'Seluruh Pengurus DKM & Tokoh Masyarakat';
      content =
        'Sehubungan dengan evaluasi program kegiatan kemakmuran masjid serta peninjauan realisasi anggaran kas, kami mengundang Bapak/Ibu pengurus dan penasihat DKM untuk hadir pada Rapat Pleno yang insya Allah akan dilaksanakan pada hari Ahad, pukul 09.00 WIB bertempat di Ruang Sekretariat DKM Lantai 2.';
    } else if (type === 'Surat Permohonan') {
      title = 'Permohonan Bantuan Dana & Partisipasi Wakaf Sarana Masjid';
      recipient = 'Pimpinan Perusahaan / Para Agniya & Dermawan';
      content =
        "Dalam rangka peremajaan fasilitas tempat wudhu dan sarana ibadah demi meningkatkan kenyamanan para jamaah, kami panitia pembangunan Masjid Jami' Al-Barkah memohon partisipasi dan uluran tangan donasi wakaf terbaik dari Bapak/Ibu. Rincian rencana anggaran biaya terlampir bersama surat ini.";
    } else if (type === 'Surat Keterangan') {
      title = 'Surat Keterangan Rekomendasi Warga Mustahik Kurang Mampu';
      recipient = 'Badan Amil Zakat Nasional (BAZNAS) Kota / Lembaga Terkait';
      content =
        "Dengan ini menerangkan bahwa nama yang bersangkutan adalah warga tetap lingkungan Masjid Jami' Al-Barkah yang tercatat aktif dalam jamaah dan memenuhi kriteria asnaf fakir/miskin yang berhak mendapatkan bantuan sosial pendidikan/kesehatan.";
    } else if (type === 'Surat Tugas') {
      title = 'Surat Tugas Imam Rawatib & Muadzin Khusus Sholat Tarawih';
      recipient = 'Para Asatidz & Tim Marbot Masjid';
      content =
        "Memberikan mandat dan penugasan resmi kepada nama-nama terlampir untuk bertindak sebagai Imam Rawatib, Khotib Jumat, dan Muadzin di Masjid Jami' Al-Barkah selama kurun waktu yang telah ditentukan sesuai dengan jadwal terlampir.";
    } else if (type === 'Surat Keputusan (SK)') {
      title = 'Surat Keputusan Pembentukan Panitia Peringatan Hari Besar Islam (PHBI)';
      recipient = 'Seluruh Anggota Panitia PHBI';
      content =
        'Menimbang perlunya kelancaran kegiatan syiar Islam di lingkungan masjid, DKM memutuskan menetapkan susunan panitia pelaksana peringatan hari besar Islam dengan tugas pokok dan fungsi sebagaimana tercantum dalam lampiran keputusan ini.';
    } else {
      title = 'Pemberitahuan Kerja Bakti Kebersihan Lingkungan Masjid';
      recipient = 'Warga RW 01 - RW 05 dan Jamaah';
      content =
        'Menginformasikan kepada segenap jamaah bahwa akan diadakan kerja bakti pembersihan area masjid dan sekitarnya pada hari Ahad pagi. Diharapkan kehadiran dan partisipasi warga.';
    }

    setOutgoingForm((prev) => ({
      ...prev,
      type,
      title,
      recipient,
      content,
    }));
  };

  const handleSaveOutgoing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!outgoingForm.title.trim() || !outgoingForm.recipient.trim()) return;

    if (editingOutgoing) {
      const updatedList = outgoingLetters.map((l) =>
        l.id === editingOutgoing.id
          ? {
              ...l,
              type: outgoingForm.type,
              title: outgoingForm.title.trim(),
              recipient: outgoingForm.recipient.trim(),
              content: outgoingForm.content.trim(),
              signerName: outgoingForm.signerName.trim(),
              signerPosition: outgoingForm.signerPosition.trim(),
              status: outgoingForm.status,
              attachmentInfo: outgoingForm.attachmentInfo.trim() || '-',
              notes: outgoingForm.notes.trim() || undefined,
            }
          : l
      );
      setOutgoingLetters(updatedList);
      saveStoredOutgoingLetters(updatedList);
      const updated = updatedList.find((l) => l.id === editingOutgoing.id);
      if (updated && selectedOutgoing?.id === editingOutgoing.id) {
        setSelectedOutgoing(updated);
      }
    } else {
      const count = outgoingLetters.length + 1;
      const num = count < 10 ? `00${count}` : count < 100 ? `0${count}` : `${count}`;
      const letterNumber = `${num}/DKM-ALBARKAH/XI/2026`;

      const newLetter: OutgoingLetter = {
        id: `SK-${Date.now().toString().slice(-4)}`,
        letterNumber,
        type: outgoingForm.type,
        title: outgoingForm.title.trim(),
        recipient: outgoingForm.recipient.trim(),
        date: new Date().toISOString().slice(0, 10),
        content: outgoingForm.content.trim(),
        signerName: outgoingForm.signerName.trim(),
        signerPosition: outgoingForm.signerPosition.trim(),
        status: outgoingForm.status,
        attachmentInfo: outgoingForm.attachmentInfo.trim() || '-',
        notes: outgoingForm.notes.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      const updatedList = [newLetter, ...outgoingLetters];
      setOutgoingLetters(updatedList);
      saveStoredOutgoingLetters(updatedList);
    }

    setIsOutgoingModalOpen(false);
  };

  // --- UNIFIED TABLE DATASET ---
  const unifiedRows = useMemo<UnifiedLetterRow[]>(() => {
    const incomingRows: UnifiedLetterRow[] = incomingLetters.map((l) => ({
      kind: 'incoming',
      uid: `incoming:${l.id}`,
      id: l.id,
      displayNumber:
        l.letterNumber && l.letterNumber !== 'Tanpa Nomor' ? l.letterNumber : l.agendaNumber,
      sortDate: l.receivedDate || l.letterDate || '',
      displayDate: formatShortDateId(l.receivedDate || l.letterDate),
      title: l.subject,
      party: l.sender,
      note: l.notes || l.summary || (l.dispositionTo ? `Disposisi: ${l.dispositionTo}` : ''),
      category: l.category,
      status: l.status,
      raw: l,
    }));

    const outgoingRows: UnifiedLetterRow[] = outgoingLetters.map((l) => ({
      kind: 'outgoing',
      uid: `outgoing:${l.id}`,
      id: l.id,
      displayNumber: l.letterNumber,
      sortDate: l.date || '',
      displayDate: formatShortDateId(l.date),
      title: l.title,
      party: l.recipient,
      note:
        l.notes ||
        (l.attachmentInfo && l.attachmentInfo !== '-' ? `Lampiran: ${l.attachmentInfo}` : ''),
      category: l.type,
      status: l.status,
      raw: l,
    }));

    return [...incomingRows, ...outgoingRows].sort((a, b) =>
      b.sortDate.localeCompare(a.sortDate)
    );
  }, [incomingLetters, outgoingLetters]);

  const filteredRows = useMemo(() => {
    return unifiedRows.filter((row) => {
      if (activeTab === 'incoming' && row.kind !== 'incoming') return false;
      if (activeTab === 'outgoing' && row.kind !== 'outgoing') return false;

      if (row.kind === 'incoming') {
        if (incomingStatusFilter !== 'all' && row.raw.status !== incomingStatusFilter) return false;
        if (incomingCategoryFilter !== 'all' && row.raw.category !== incomingCategoryFilter)
          return false;
      }

      if (row.kind === 'outgoing') {
        if (outgoingTypeFilter !== 'all' && row.raw.type !== outgoingTypeFilter) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const extra =
          row.kind === 'incoming'
            ? `${row.raw.agendaNumber} ${row.raw.dispositionTo} ${row.raw.summary}`
            : `${row.raw.signerName} ${row.raw.content}`;
        return (
          row.displayNumber.toLowerCase().includes(q) ||
          row.title.toLowerCase().includes(q) ||
          row.party.toLowerCase().includes(q) ||
          row.note.toLowerCase().includes(q) ||
          row.category.toLowerCase().includes(q) ||
          row.status.toLowerCase().includes(q) ||
          extra.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [
    unifiedRows,
    activeTab,
    searchQuery,
    incomingStatusFilter,
    incomingCategoryFilter,
    outgoingTypeFilter,
  ]);

  // Filtered subsets for Report modals & direct PDF exports (independent of activeTab)
  const filteredIncomingForReport = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return incomingLetters
      .filter((l) => {
        if (incomingStatusFilter !== 'all' && l.status !== incomingStatusFilter) return false;
        if (incomingCategoryFilter !== 'all' && l.category !== incomingCategoryFilter) return false;
        if (q) {
          const displayNum = l.letterNumber && l.letterNumber !== 'Tanpa Nomor' ? l.letterNumber : l.agendaNumber;
          const noteText = l.notes || l.summary || (l.dispositionTo ? `Disposisi: ${l.dispositionTo}` : '');
          const haystack = `${displayNum} ${l.subject} ${l.sender} ${noteText} ${l.category} ${l.status} ${l.agendaNumber} ${l.dispositionTo} ${l.summary}`.toLowerCase();
          return haystack.includes(q);
        }
        return true;
      })
      .sort((a, b) => (b.receivedDate || b.letterDate || '').localeCompare(a.receivedDate || a.letterDate || ''));
  }, [incomingLetters, searchQuery, incomingStatusFilter, incomingCategoryFilter]);

  const filteredOutgoingForReport = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return outgoingLetters
      .filter((l) => {
        if (outgoingTypeFilter !== 'all' && l.type !== outgoingTypeFilter) return false;
        if (q) {
          const noteText = l.notes || (l.attachmentInfo && l.attachmentInfo !== '-' ? `Lampiran: ${l.attachmentInfo}` : '');
          const haystack = `${l.letterNumber} ${l.title} ${l.recipient} ${noteText} ${l.type} ${l.status} ${l.signerName} ${l.content}`.toLowerCase();
          return haystack.includes(q);
        }
        return true;
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [outgoingLetters, searchQuery, outgoingTypeFilter]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedUids([]);
  }, [activeTab, searchQuery, incomingStatusFilter, incomingCategoryFilter, outgoingTypeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, safePage, pageSize]);

  // Multi-select handlers
  const handleToggleSelectAll = () => {
    const pageUids = paginatedRows.map((r) => r.uid);
    const allSelected = pageUids.length > 0 && pageUids.every((uid) => selectedUids.includes(uid));
    if (allSelected) {
      setSelectedUids((prev) => prev.filter((uid) => !pageUids.includes(uid)));
    } else {
      setSelectedUids((prev) => Array.from(new Set([...prev, ...pageUids])));
    }
  };

  const handleToggleSelectOne = (uid: string) => {
    setSelectedUids((prev) =>
      prev.includes(uid) ? prev.filter((item) => item !== uid) : [...prev, uid]
    );
  };

  // Delete handlers
  const handleConfirmDeleteSingle = () => {
    if (!deleteConfirmTarget) return;
    if (deleteConfirmTarget.kind === 'incoming') {
      const updated = incomingLetters.filter((l) => l.id !== deleteConfirmTarget.id);
      setIncomingLetters(updated);
      saveStoredIncomingLetters(updated);
      if (selectedIncoming?.id === deleteConfirmTarget.id) {
        setSelectedIncoming(null);
      }
    } else {
      const updated = outgoingLetters.filter((l) => l.id !== deleteConfirmTarget.id);
      setOutgoingLetters(updated);
      saveStoredOutgoingLetters(updated);
      if (selectedOutgoing?.id === deleteConfirmTarget.id) {
        setSelectedOutgoing(null);
      }
    }
    setDeleteConfirmTarget(null);
  };

  const handleConfirmDeleteMulti = () => {
    if (selectedUids.length === 0) return;
    const incomingToDelete = selectedUids
      .filter((u) => u.startsWith('incoming:'))
      .map((u) => u.replace('incoming:', ''));
    const outgoingToDelete = selectedUids
      .filter((u) => u.startsWith('outgoing:'))
      .map((u) => u.replace('outgoing:', ''));

    if (incomingToDelete.length > 0) {
      const updatedIn = incomingLetters.filter((l) => !incomingToDelete.includes(l.id));
      setIncomingLetters(updatedIn);
      saveStoredIncomingLetters(updatedIn);
      if (selectedIncoming && incomingToDelete.includes(selectedIncoming.id)) {
        setSelectedIncoming(null);
      }
    }
    if (outgoingToDelete.length > 0) {
      const updatedOut = outgoingLetters.filter((l) => !outgoingToDelete.includes(l.id));
      setOutgoingLetters(updatedOut);
      saveStoredOutgoingLetters(updatedOut);
      if (selectedOutgoing && outgoingToDelete.includes(selectedOutgoing.id)) {
        setSelectedOutgoing(null);
      }
    }

    setSelectedUids([]);
    setIsSelectMode(false);
    setIsMultiDeleteModalOpen(false);
  };

  const handleOpenRowDetail = (row: UnifiedLetterRow) => {
    if (row.kind === 'incoming') {
      setSelectedOutgoing(null);
      setIncomingDetailTab('detail');
      setSelectedIncoming(row.raw);
    } else {
      setSelectedIncoming(null);
      setSelectedOutgoing(row.raw);
    }
  };

  // Summary counts
  const pendingIncomingCount = incomingLetters.filter(
    (l) => l.status === 'Belum Diproses' || l.status === 'Didisposisikan'
  ).length;
  const urgentIncomingCount = incomingLetters.filter(
    (l) => l.urgency === 'Kilat / Segera' || l.urgency === 'Penting'
  ).length;
  const publishedOutgoingCount = outgoingLetters.filter((l) => l.status === 'Diterbitkan').length;

  const hasExtraFiltersActive =
    incomingStatusFilter !== 'all' ||
    incomingCategoryFilter !== 'all' ||
    outgoingTypeFilter !== 'all';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-emerald-950 text-white border border-teal-800/40 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 shrink-0" />
            <span>Surat &amp; Administrasi Masjid</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Pencatatan surat masuk, surat keluar, undangan surat resmi DKM
          </p>
        </div>

        {/* Header Primary Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {can('create') && (
            <>
              <button
                type="button"
                onClick={handleOpenAddIncoming}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Catat Surat Masuk</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAddOutgoing}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <Send className="w-3.5 h-3.5 text-emerald-300" />
                <span>Buat Surat Keluar</span>
              </button>
            </>
          )}

          {/* Ekspor PDF & Cetak Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setIsExportMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-semibold text-xs border border-slate-700/70 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ekspor &amp; Cetak PDF</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-2xl z-30 py-1.5 text-xs">
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400">
                  Surat Masuk (PDF)
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleDownloadIncomingAgendaPdf();
                    setIsExportMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Unduh PDF Agenda Masuk</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsIncomingReportPrintOpen(true);
                    setIsExportMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>Pratinjau &amp; Cetak PDF Masuk</span>
                </button>

                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400">
                  Surat Keluar (PDF)
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleDownloadOutgoingAgendaPdf();
                    setIsExportMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Unduh PDF Ekspedisi Keluar</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsOutgoingReportPrintOpen(true);
                    setIsExportMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>Pratinjau &amp; Cetak PDF Keluar</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div
          className={`p-4 rounded-2xl border ${themeConfig.cardBg} flex items-center justify-between gap-3 min-w-0`}
        >
          <div className="min-w-0">
            <span className="text-xs text-slate-500 font-semibold">Total Surat Masuk</span>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono tabular-nums">
              {incomingLetters.length}{' '}
              <span className="text-xs font-sans font-normal text-slate-500">Berkas</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Tercatat di buku agenda</p>
          </div>
          <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 shrink-0">
            <Inbox className="w-5 h-5" />
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl border ${themeConfig.cardBg} flex items-center justify-between gap-3 min-w-0`}
        >
          <div className="min-w-0">
            <span className="text-xs text-slate-500 font-semibold">Disposisi &amp; Tindak Lanjut</span>
            <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono tabular-nums">
              {pendingIncomingCount}{' '}
              <span className="text-xs font-sans font-normal text-slate-500">Surat Aktif</span>
            </p>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
              {urgentIncomingCount} berkas prioritas/penting
            </p>
          </div>
          <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 shrink-0">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl border ${themeConfig.cardBg} flex items-center justify-between gap-3 min-w-0 sm:col-span-2 lg:col-span-1`}
        >
          <div className="min-w-0">
            <span className="text-xs text-slate-500 font-semibold">Total Surat Keluar</span>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono tabular-nums">
              {outgoingLetters.length}{' '}
              <span className="text-xs font-sans font-normal text-slate-500">Dokumen</span>
            </p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
              {publishedOutgoingCount} resmi berstempel DKM
            </p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 shrink-0">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* UNIFIED SEARCH + SEGMENTED TABS + FULL-WIDTH TABLE LAYOUT             */}
      {/* ===================================================================== */}
      <div className="space-y-4">
        {/* Top Search & Segmented Tab Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: Search + Filter/Multi-select toggles */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <div className="relative flex-1 min-w-[220px] sm:max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nomor surat, perihal, pihak..."
                className="w-full pl-9 pr-8 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full cursor-pointer"
                  aria-label="Hapus pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowExtraFilters((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                showExtraFilters || hasExtraFiltersActive
                  ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              title="Filter lanjutan status dan kategori"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter</span>
            </button>

            {can('delete') && (
              <button
                type="button"
                onClick={() => {
                  if (isSelectMode) {
                    setIsSelectMode(false);
                    setSelectedUids([]);
                  } else {
                    setIsSelectMode(true);
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  isSelectMode
                    ? 'border-amber-400/50 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
                title="Pilih beberapa surat untuk dihapus sekaligus"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>{isSelectMode ? 'Batal Pilih' : 'Pilih Data'}</span>
              </button>
            )}
          </div>

          {/* Right: Segmented Control Tabs (Semua Surat | Surat Masuk | Surat Keluar) */}
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700/60 self-start md:self-auto overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-2 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
              }`}
            >
              Semua Surat
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('incoming')}
              className={`px-3.5 py-2 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'incoming'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
              }`}
            >
              Surat Masuk
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('outgoing')}
              className={`px-3.5 py-2 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'outgoing'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
              }`}
            >
              Surat Keluar
            </button>
          </div>
        </div>

        {/* Optional Collapsible Advanced Filters */}
        {(showExtraFilters || hasExtraFiltersActive) && (
          <div
            className={`p-3.5 rounded-2xl border ${themeConfig.cardBg} flex flex-wrap items-center justify-between gap-3 text-xs`}
          >
            <div className="flex flex-wrap items-center gap-2.5">
              {activeTab !== 'outgoing' && (
                <>
                  <select
                    value={incomingStatusFilter}
                    onChange={(e) => setIncomingStatusFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="all">Semua Status Surat Masuk</option>
                    <option value="Belum Diproses">Belum Diproses</option>
                    <option value="Didisposisikan">Didisposisikan</option>
                    <option value="Selesai Ditindaklanjuti">Selesai Ditindaklanjuti</option>
                    <option value="Diarsipkan">Diarsipkan</option>
                  </select>

                  <select
                    value={incomingCategoryFilter}
                    onChange={(e) => setIncomingCategoryFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="all">Semua Kategori Masuk</option>
                    <option value="Edaran Resmi">Edaran Resmi</option>
                    <option value="Undangan">Undangan</option>
                    <option value="Permohonan Kerjasama">Permohonan Kerjasama</option>
                    <option value="Pemberitahuan">Pemberitahuan</option>
                    <option value="Proposal Bantuan">Proposal Bantuan</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </>
              )}

              {activeTab !== 'incoming' && (
                <select
                  value={outgoingTypeFilter}
                  onChange={(e) => setOutgoingTypeFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="all">Semua Kategori Surat Keluar</option>
                  <option value="Surat Undangan">Surat Undangan</option>
                  <option value="Surat Permohonan">Surat Permohonan</option>
                  <option value="Surat Keterangan">Surat Keterangan</option>
                  <option value="Surat Tugas">Surat Tugas</option>
                  <option value="Surat Keputusan (SK)">Surat Keputusan (SK)</option>
                  <option value="Surat Pemberitahuan">Surat Pemberitahuan</option>
                </select>
              )}

              {hasExtraFiltersActive && (
                <button
                  type="button"
                  onClick={() => {
                    setIncomingStatusFilter('all');
                    setIncomingCategoryFilter('all');
                    setOutgoingTypeFilter('all');
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Reset Filter</span>
                </button>
              )}
            </div>

            <span className="text-slate-500 dark:text-slate-400 text-xs">
              Menampilkan{' '}
              <strong className="text-slate-800 dark:text-slate-200 font-bold">
                {filteredRows.length}
              </strong>{' '}
              dari {unifiedRows.length} surat
            </span>
          </div>
        )}

        {/* Multi-Delete Bar */}
        {can('delete') && isSelectMode && (
          <MultiDeleteBar
            selectedCount={selectedUids.length}
            onDeleteSelected={() => setIsMultiDeleteModalOpen(true)}
            onClearSelection={() => {
              setSelectedUids([]);
              setIsSelectMode(false);
            }}
            label="Surat"
          />
        )}

        {/* Main Table Container */}
        <div
          className={`rounded-2xl border ${themeConfig.cardBg} shadow-xs overflow-hidden`}
        >
          {/* Desktop & Tablet Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {can('delete') && isSelectMode && (
                    <th className="py-3.5 pl-5 pr-2 w-10">
                      <input
                        type="checkbox"
                        checked={
                          paginatedRows.length > 0 &&
                          paginatedRows.every((r) => selectedUids.includes(r.uid))
                        }
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                        title="Pilih semua di halaman ini"
                      />
                    </th>
                  )}
                  <th className="py-3.5 px-5 whitespace-nowrap">Nomor &amp; Tanggal</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Jenis</th>
                  <th className="py-3.5 px-4">Perihal &amp; Pengirim/Tujuan</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Kategori</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Status</th>
                  <th className="py-3.5 px-5 text-right whitespace-nowrap">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs sm:text-[13px]">
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={can('delete') && isSelectMode ? 7 : 6}
                      className="py-16 px-6 text-center text-slate-400"
                    >
                      <Mail className="w-9 h-9 mx-auto mb-2 opacity-30" />
                      <p className="font-semibold text-sm text-slate-600 dark:text-slate-300">
                        Belum ada surat yang sesuai.
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Ubah kata kunci pencarian atau catat surat masuk/keluar baru.
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row) => {
                    const isChecked = selectedUids.includes(row.uid);
                    return (
                      <tr
                        key={row.uid}
                        onClick={() => handleOpenRowDetail(row)}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      >
                        {can('delete') && isSelectMode && (
                          <td
                            className="py-4 pl-5 pr-2 align-middle"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleSelectOne(row.uid)}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                            />
                          </td>
                        )}

                        {/* Col 1: Nomor & Tanggal */}
                        <td className="py-4 px-5 align-middle whitespace-nowrap">
                          <div className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white leading-snug">
                            {row.displayNumber}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                            {row.displayDate}
                          </div>
                        </td>

                        {/* Col 2: Jenis */}
                        <td className="py-4 px-4 align-middle whitespace-nowrap">
                          {row.kind === 'outgoing' ? (
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                              Keluar
                            </span>
                          ) : (
                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                              Masuk
                            </span>
                          )}
                        </td>

                        {/* Col 3: Perihal & Pengirim/Tujuan */}
                        <td className="py-4 px-4 align-middle max-w-md">
                          <div className="font-semibold text-slate-900 dark:text-white leading-snug group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                            {row.title}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                            <span>{row.party}</span>
                            {row.note && (
                              <>
                                <span aria-hidden="true"> · </span>
                                <span>{row.note}</span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Col 4: Kategori */}
                        <td className="py-4 px-4 align-middle whitespace-nowrap text-slate-600 dark:text-slate-300">
                          {row.category}
                        </td>

                        {/* Col 5: Status */}
                        <td className="py-4 px-4 align-middle whitespace-nowrap font-semibold text-slate-800 dark:text-slate-200">
                          {row.status}
                        </td>

                        {/* Col 6: Aksi */}
                        <td
                          className="py-4 px-5 align-middle text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenRowDetail(row)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                              title={
                                row.kind === 'incoming'
                                  ? 'Lihat Detail, Disposisi & Cetak Lembar Disposisi'
                                  : 'Lihat Pratinjau Kop Surat, TTD Digital & Cetak'
                              }
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">Detail</span>
                            </button>

                            {can('edit') && (
                              <button
                                type="button"
                                onClick={() =>
                                  row.kind === 'incoming'
                                    ? handleOpenEditIncoming(row.raw)
                                    : handleOpenEditOutgoing(row.raw)
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                <span>Edit</span>
                              </button>
                            )}

                            {can('delete') && (
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteConfirmTarget({
                                    kind: row.kind,
                                    id: row.id,
                                    label: row.title,
                                  })
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Hapus</span>
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

          {/* Mobile Card View (< md) */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {paginatedRows.length === 0 ? (
              <div className="py-12 px-4 text-center text-slate-400">
                <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="font-semibold text-xs text-slate-600 dark:text-slate-300">
                  Belum ada surat yang sesuai.
                </p>
              </div>
            ) : (
              paginatedRows.map((row) => {
                const isChecked = selectedUids.includes(row.uid);
                return (
                  <div
                    key={row.uid}
                    onClick={() => handleOpenRowDetail(row)}
                    className="p-4 space-y-2.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        {can('delete') && isSelectMode && (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelectOne(row.uid)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600 cursor-pointer shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="font-mono tabular-nums font-bold text-xs text-slate-900 dark:text-white truncate">
                            {row.displayNumber}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                            {row.displayDate}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-xs font-bold shrink-0 ${
                          row.kind === 'outgoing'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        {row.kind === 'outgoing' ? 'Keluar' : 'Masuk'}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                        {row.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {row.party}
                        {row.note ? ` · ${row.note}` : ''}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <span>{row.category}</span>
                      <span className="text-slate-400" aria-hidden="true">
                        ·
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        {row.status}
                      </span>
                    </div>

                    <div
                      className="pt-2 flex flex-wrap items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenRowDetail(row)}
                        className="flex-1 min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detail</span>
                      </button>

                      {can('edit') && (
                        <button
                          type="button"
                          onClick={() =>
                            row.kind === 'incoming'
                              ? handleOpenEditIncoming(row.raw)
                              : handleOpenEditOutgoing(row.raw)
                          }
                          className="flex-1 min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      )}

                      {can('delete') && (
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteConfirmTarget({
                              kind: row.kind,
                              id: row.id,
                              label: row.title,
                            })
                          }
                          className="flex-1 min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 text-xs font-medium cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Footer */}
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40">
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              totalItems={filteredRows.length}
              pageSize={pageSize}
              pageSizeOptions={[5, 10, 20]}
              onPageChange={setCurrentPage}
              onPageSizeChange={(sz) => {
                setPageSize(sz);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* DETAIL & PREVIEW MODAL: SURAT MASUK                                   */}
      {/* ===================================================================== */}
      {selectedIncoming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/65 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Top Action Header */}
            <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                      {selectedIncoming.agendaNumber}
                    </span>
                    <span className="text-slate-400" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 truncate">
                      {selectedIncoming.sender}
                    </span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5">
                    {selectedIncoming.subject}
                  </h3>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {can('edit') && (
                  <button
                    type="button"
                    onClick={() => handleOpenEditIncoming(selectedIncoming)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                    <span className="hidden sm:inline">Edit Data</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleDownloadDispositionPdf}
                  disabled={isExportingIncomingPdf}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                >
                  {isExportingIncomingPdf ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh PDF</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handlePrintDisposition}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedIncoming(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  aria-label="Tutup detail"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex items-center gap-2 px-3 sm:px-5 pt-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 shrink-0 overflow-x-auto">
              <button
                type="button"
                onClick={() => setIncomingDetailTab('detail')}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  incomingDetailTab === 'detail'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span>Rincian &amp; Disposisi</span>
              </button>

              <button
                type="button"
                onClick={() => setIncomingDetailTab('preview')}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  incomingDetailTab === 'preview'
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <FileCheck className="w-4 h-4 shrink-0" />
                <span>Lembar Disposisi Resmi (Kop DKM)</span>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-5">
              {incomingDetailTab === 'detail' ? (
                <div className="space-y-5">
                  {/* Status Disposisi */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-700/50">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                          Status Disposisi &amp; Alur
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {can('edit')
                          ? 'Klik status untuk update cepat:'
                          : 'Status tindak lanjut saat ini:'}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(
                          [
                            'Belum Diproses',
                            'Didisposisikan',
                            'Selesai Ditindaklanjuti',
                            'Diarsipkan',
                          ] as IncomingLetter['status'][]
                        ).map((st) => (
                          <button
                            key={st}
                            type="button"
                            disabled={!can('edit')}
                            onClick={() =>
                              can('edit') && handleUpdateIncomingStatus(selectedIncoming.id, st)
                            }
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              selectedIncoming.status === st
                                ? 'bg-emerald-600 text-white shadow-2xs ring-2 ring-emerald-600/30'
                                : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                            } ${can('edit') ? 'cursor-pointer' : 'opacity-75 cursor-not-allowed'}`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500 font-medium">Urgensi:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {selectedIncoming.urgency}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Identitas Surat */}
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <Building2 className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                        Identitas Surat Masuk
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                          No. Agenda DKM
                        </span>
                        <p className="font-mono font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                          {selectedIncoming.agendaNumber}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                          No. Surat Asal
                        </span>
                        <p className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                          {selectedIncoming.letterNumber}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                          Kategori
                        </span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                          {selectedIncoming.category}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                          Tanggal Surat
                        </span>
                        <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                          {selectedIncoming.letterDate}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                          Tanggal Diterima
                        </span>
                        <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                          {selectedIncoming.receivedDate}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                          Instansi / Pengirim
                        </span>
                        <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                          {selectedIncoming.sender}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block mb-1">
                        Perihal / Hal:
                      </span>
                      <p className="font-bold text-sm text-slate-900 dark:text-white leading-relaxed">
                        {selectedIncoming.subject}
                      </p>
                    </div>
                  </div>

                  {/* Disposisi */}
                  <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60 dark:border-emerald-800/60">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                        <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
                          Informasi Penerima Disposisi
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIncomingDetailTab('preview')}
                        className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Buka Lembar Disposisi Kop DKM</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase block">
                          Diteruskan / Ditujukan Kepada:
                        </span>
                        <p className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                          {selectedIncoming.dispositionTo || 'Ketua DKM'}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase block mb-1">
                          Instruksi / Catatan Arahan Ketua DKM:
                        </span>
                        <div className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 text-slate-800 dark:text-slate-200 text-xs italic leading-relaxed">
                          "{selectedIncoming.dispositionInstruction}"
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ringkasan & Riwayat */}
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <History className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                        Ringkasan Isi &amp; Lampiran
                      </h4>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {selectedIncoming.summary || 'Tidak ada teks ringkasan surat.'}
                    </p>
                    {selectedIncoming.attachmentName && (
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                        <Paperclip className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {selectedIncoming.attachmentName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs">
                    <button
                      type="button"
                      onClick={() => setIncomingDetailTab('detail')}
                      className="flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-emerald-600 font-semibold self-start sm:self-auto cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Kembali ke Rincian</span>
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveLetterSigner({
                            role: "Ketua DKM Jami' Al-Barkah",
                            name: mosqueProfile.leadPerson || 'Drs. KH. Ahmad Muzammil',
                            target: 'disposition-chairman',
                          })
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold cursor-pointer"
                      >
                        <PenTool className="w-3.5 h-3.5" />
                        <span>Tanda Tangan</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadDispositionPdf}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Unduh PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={handlePrintDisposition}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Cetak Dokumen</span>
                      </button>
                    </div>
                  </div>

                  {/* Lembar Disposisi Print Sheet */}
                  <div
                    ref={dispositionSheetRef}
                    id="printable-disposition"
                    className="printable-area bg-white text-slate-900 rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-8 space-y-5 font-sans print:m-0 print:p-0 print:border-none print:shadow-none"
                  >
                    <div className="text-center border-b-2 border-slate-900 pb-3 space-y-1">
                      <h2 className="text-base sm:text-lg font-bold tracking-wider text-emerald-900 uppercase">
                        {formatDkmHeaderTitle(mosqueProfile.name)}
                      </h2>
                      <p className="text-xs text-slate-600">
                        Sekretariat: {mosqueProfile.address || 'Jl. Al-Barkah No. 01, Jakarta Selatan'} • Telp:{' '}
                        {mosqueProfile.phone || '(021) 7890-1234'}
                      </p>
                      <div className="inline-block px-3 py-1 rounded bg-slate-900 text-white text-[11px] font-bold uppercase tracking-widest mt-1">
                        LEMBAR DISPOSISI SURAT MASUK
                      </div>
                    </div>

                    <div className="border border-slate-300 rounded-xl overflow-hidden bg-slate-50/50 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-300 border-b border-slate-300">
                        <div className="p-3">
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                            No. Agenda DKM
                          </span>
                          <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                            {selectedIncoming.agendaNumber}
                          </p>
                        </div>
                        <div className="p-3">
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                            Tingkat Urgensi
                          </span>
                          <p className="font-bold text-slate-900 mt-0.5">{selectedIncoming.urgency}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-300 border-b border-slate-300">
                        <div className="p-3">
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                            No. Surat Asal
                          </span>
                          <p className="font-mono font-semibold text-slate-800 mt-0.5">
                            {selectedIncoming.letterNumber}
                          </p>
                        </div>
                        <div className="p-3">
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                            Tanggal Surat &amp; Terima
                          </span>
                          <p className="text-slate-800 mt-0.5 font-medium">
                            Surat: {selectedIncoming.letterDate} • Terima: {selectedIncoming.receivedDate}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-300 border-b border-slate-300">
                        <div className="p-3">
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                            Instansi / Asal Pengirim
                          </span>
                          <p className="font-bold text-slate-900 text-sm mt-0.5">
                            {selectedIncoming.sender}
                          </p>
                        </div>
                        <div className="p-3">
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                            Kategori Surat
                          </span>
                          <p className="font-semibold text-slate-800 mt-0.5">
                            {selectedIncoming.category}
                          </p>
                        </div>
                      </div>

                      <div className="p-3">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                          Perihal / Hal
                        </span>
                        <p className="font-semibold text-slate-900 mt-0.5 leading-relaxed">
                          {selectedIncoming.subject}
                        </p>
                      </div>
                    </div>

                    <div className="border-2 border-emerald-700/60 rounded-xl p-4 bg-emerald-50/30 space-y-3">
                      <div className="flex items-center justify-between border-b border-emerald-200 pb-2 text-xs">
                        <span className="font-bold text-emerald-900 uppercase tracking-wider">
                          INSTRUKSI DISPOSISI KETUA DKM
                        </span>
                        <span className="text-[11px] text-slate-700 font-medium">
                          Status: <strong>{selectedIncoming.status}</strong>
                        </span>
                      </div>

                      <div className="text-xs">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">
                          Diteruskan Kepada:
                        </span>
                        <p className="font-bold text-emerald-950 text-sm mt-0.5">
                          {selectedIncoming.dispositionTo}
                        </p>
                      </div>

                      <div className="text-xs">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">
                          Instruksi / Catatan Arahan:
                        </span>
                        <div className="mt-1 p-3 rounded-lg bg-white border border-emerald-200 text-slate-800 italic leading-relaxed">
                          "{selectedIncoming.dispositionInstruction}"
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-6 text-xs">
                      <div className="text-center space-y-1">
                        <p className="text-slate-600 font-medium">Penerima Disposisi</p>
                        <div className="min-h-[68px] flex flex-col items-center justify-end py-1">
                          {dispositionRecipientSig ? (
                            <div className="flex flex-col items-center">
                              <img
                                src={dispositionRecipientSig}
                                alt="Tanda tangan penerima disposisi"
                                className="sig-img"
                                style={{
                                  height: '52px',
                                  maxWidth: '140px',
                                  width: 'auto',
                                  objectFit: 'contain',
                                  display: 'block',
                                  margin: '0 auto',
                                }}
                              />
                              <div className="no-print flex items-center gap-1 mt-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActiveLetterSigner({
                                      role: 'Penerima Disposisi',
                                      name: selectedIncoming.dispositionTo || 'Penerima Disposisi',
                                      target: 'disposition-recipient',
                                    })
                                  }
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-50 text-[10px] font-semibold text-slate-600 hover:text-emerald-700 border border-slate-200 cursor-pointer"
                                >
                                  <PenTool className="w-2.5 h-2.5" />
                                  <span>Ubah</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDispositionRecipientSig(null);
                                    saveStoredSignatureForSigner(
                                      'Penerima Disposisi',
                                      selectedIncoming.dispositionTo || 'Penerima Disposisi',
                                      null
                                    );
                                  }}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 hover:bg-rose-50 text-[10px] text-slate-500 hover:text-rose-600 border border-slate-200 cursor-pointer"
                                  title="Hapus tanda tangan"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setActiveLetterSigner({
                                  role: 'Penerima Disposisi',
                                  name: selectedIncoming.dispositionTo || 'Penerima Disposisi',
                                  target: 'disposition-recipient',
                                })
                              }
                              className="no-print inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-emerald-400 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold cursor-pointer"
                            >
                              <PenTool className="w-3 h-3" />
                              <span>Tanda Tangani</span>
                            </button>
                          )}
                        </div>
                        <div>
                          <div className="border-b border-slate-400 w-36 mx-auto" />
                          <p className="font-semibold text-slate-800 mt-1.5">
                            {selectedIncoming.dispositionTo}
                          </p>
                        </div>
                      </div>

                      <div className="text-center space-y-1">
                        <p className="text-slate-600 font-medium">
                          Ketua DKM {mosqueProfile.name || "Jami' Al-Barkah"}
                        </p>
                        <div className="min-h-[68px] flex flex-col items-center justify-end py-1">
                          {dispositionChairmanSig ? (
                            <div className="flex flex-col items-center">
                              <img
                                src={dispositionChairmanSig}
                                alt="Tanda tangan Ketua DKM"
                                className="sig-img"
                                style={{
                                  height: '52px',
                                  maxWidth: '140px',
                                  width: 'auto',
                                  objectFit: 'contain',
                                  display: 'block',
                                  margin: '0 auto',
                                }}
                              />
                              <div className="no-print flex items-center gap-1 mt-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActiveLetterSigner({
                                      role: "Ketua DKM Jami' Al-Barkah",
                                      name: mosqueProfile.leadPerson || 'Drs. KH. Ahmad Muzammil',
                                      target: 'disposition-chairman',
                                    })
                                  }
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-50 text-[10px] font-semibold text-slate-600 hover:text-emerald-700 border border-slate-200 cursor-pointer"
                                >
                                  <PenTool className="w-2.5 h-2.5" />
                                  <span>Ubah</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDispositionChairmanSig(null);
                                    saveStoredSignatureForSigner(
                                      "Ketua DKM Jami' Al-Barkah",
                                      mosqueProfile.leadPerson || 'Drs. KH. Ahmad Muzammil',
                                      null
                                    );
                                  }}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 hover:bg-rose-50 text-[10px] text-slate-500 hover:text-rose-600 border border-slate-200 cursor-pointer"
                                  title="Hapus tanda tangan"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setActiveLetterSigner({
                                  role: "Ketua DKM Jami' Al-Barkah",
                                  name: mosqueProfile.leadPerson || 'Drs. KH. Ahmad Muzammil',
                                  target: 'disposition-chairman',
                                })
                              }
                              className="no-print inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-emerald-400 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold cursor-pointer"
                            >
                              <PenTool className="w-3 h-3" />
                              <span>Tanda Tangani</span>
                            </button>
                          )}
                        </div>
                        <div>
                          <div className="border-b border-slate-400 w-36 mx-auto" />
                          <p className="font-bold text-slate-900 mt-1.5 underline">
                            {mosqueProfile.leadPerson || 'Drs. KH. Ahmad Muzammil'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* DETAIL & PREVIEW MODAL: SURAT KELUAR                                  */}
      {/* ===================================================================== */}
      {selectedOutgoing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/65 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header Bar */}
            <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider truncate">
                  Pratinjau Format Surat Resmi Berkop DKM
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {can('edit') && (
                  <button
                    type="button"
                    onClick={() => handleOpenEditOutgoing(selectedOutgoing)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Edit Surat</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    setActiveLetterSigner({
                      role: selectedOutgoing.signerPosition,
                      name: selectedOutgoing.signerName,
                      target: 'outgoing',
                    })
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 cursor-pointer"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>{outgoingSig ? 'Ubah TTD' : 'Tanda Tangan'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadOutgoingPdf}
                  disabled={isExportingOutgoingPdf}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 cursor-pointer disabled:opacity-60"
                >
                  {isExportingOutgoingPdf ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Membuat PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh PDF</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handlePrintOutgoingLetter}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Surat</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedOutgoing(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  aria-label="Tutup pratinjau"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sheet Content */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 bg-slate-100/70 dark:bg-slate-950/50">
              <div
                ref={outgoingSheetRef}
                id="printable-outgoing-letter"
                className="printable-area p-4 sm:p-8 lg:p-10 rounded-2xl bg-white text-slate-900 shadow-md border border-slate-200 font-serif space-y-5 sm:space-y-6 print:m-0 print:p-0 print:border-none print:shadow-none"
              >
                <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
                  <p className="text-xs tracking-widest text-slate-500 font-sans uppercase">
                    بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                  </p>
                  <h2 className="text-base sm:text-xl font-bold tracking-wider font-sans text-emerald-800 uppercase">
                    {formatDkmHeaderTitle(mosqueProfile.name)}
                  </h2>
                  <p className="text-xs font-sans text-slate-600">
                    {mosqueProfile.address || 'Jl. Al-Barkah No. 01, Jakarta Selatan'} • Telp:{' '}
                    {mosqueProfile.phone || '(021) 7890-1234'}
                  </p>
                  <p className="text-[11px] font-sans text-slate-500">
                    SK Kemenag RI No. SIMAS: {mosqueProfile.simasNumber || '01.4.11.02.04.000142'}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row print:flex-row justify-between items-start gap-4 text-xs font-sans pt-1">
                  <div className="space-y-0.5 min-w-0">
                    <p>
                      Nomor : <strong>{selectedOutgoing.letterNumber}</strong>
                    </p>
                    <p>Lampiran : {selectedOutgoing.attachmentInfo || '-'}</p>
                    <p>
                      Perihal : <strong>{selectedOutgoing.title}</strong>
                    </p>
                  </div>
                  <div className="text-left sm:text-right print:text-right shrink-0">
                    <p>{formatReportCity(mosqueProfile.city)}, {selectedOutgoing.date}</p>
                    <p className="mt-2 text-left">Kepada Yth:</p>
                    <p className="font-bold">{selectedOutgoing.recipient}</p>
                    <p>di Tempat</p>
                  </div>
                </div>

                <div className="text-xs font-sans space-y-3 leading-relaxed pt-2">
                  <p className="italic font-serif">
                    Assalamu'alaikum Warahmatullahi Wabarakatuh,
                  </p>
                  <p>
                    Segala puji bagi Allah Subhanahu wa Ta'ala yang senantiasa melimpahkan rahmat,
                    taufiq, dan hidayah-Nya kepada kita semua. Shalawat serta salam semoga tercurah
                    kepada junjungan Nabi Besar Muhammad Shallallahu 'Alaihi Wasallam, keluarga,
                    sahabat, dan para pengikutnya hingga akhir zaman.
                  </p>
                  <p className="text-justify indent-6">{selectedOutgoing.content}</p>
                  <p>
                    Demikian surat ini kami sampaikan. Atas perhatian, dukungan, dan kerja sama yang
                    baik dari Bapak/Ibu, kami haturkan terima kasih yang sebesar-besarnya. Semoga
                    amal ibadah kita senantiasa diterima di sisi Allah SWT.
                  </p>
                  <p className="italic font-serif">
                    Wassalamu'alaikum Warahmatullahi Wabarakatuh.
                  </p>
                </div>

                <div className="pt-8 flex justify-end font-sans text-xs">
                  <div className="text-center w-full sm:w-64 print:w-64 space-y-2">
                    <div>
                      <p>Pengurus DKM {mosqueProfile.name || "Jami' Al-Barkah"}</p>
                      <p className="font-bold">{selectedOutgoing.signerPosition}</p>
                    </div>
                    <div className="min-h-[72px] flex flex-col items-center justify-end py-1">
                      {outgoingSig ? (
                        <div className="flex flex-col items-center">
                          <img
                            src={outgoingSig}
                            alt={`Tanda tangan ${selectedOutgoing.signerName}`}
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
                              onClick={() =>
                                setActiveLetterSigner({
                                  role: selectedOutgoing.signerPosition,
                                  name: selectedOutgoing.signerName,
                                  target: 'outgoing',
                                })
                              }
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-50 text-[10px] font-semibold text-slate-600 hover:text-emerald-700 border border-slate-200 cursor-pointer"
                            >
                              <PenTool className="w-2.5 h-2.5" />
                              <span>Ubah</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOutgoingSig(null);
                                saveStoredSignatureForSigner(
                                  selectedOutgoing.signerPosition,
                                  selectedOutgoing.signerName,
                                  null
                                );
                              }}
                              className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 hover:bg-rose-50 text-[10px] text-slate-500 hover:text-rose-600 border border-slate-200 cursor-pointer"
                              title="Hapus tanda tangan"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setActiveLetterSigner({
                              role: selectedOutgoing.signerPosition,
                              name: selectedOutgoing.signerName,
                              target: 'outgoing',
                            })
                          }
                          className="no-print inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-emerald-400 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold cursor-pointer"
                        >
                          <PenTool className="w-3 h-3" />
                          <span>Tanda Tangani Surat</span>
                        </button>
                      )}
                    </div>
                    <div className="border-b border-slate-400 w-48 mx-auto" />
                    <p className="font-bold underline">{selectedOutgoing.signerName}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: INPUT / EDIT SURAT MASUK                                     */}
      {/* ===================================================================== */}
      {isIncomingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 max-w-xl w-full space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                <ArrowDownLeft className="w-5 h-5 text-emerald-600 shrink-0" />
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                  {editingIncoming ? 'Edit Data Surat Masuk' : 'Catat Surat Masuk & Disposisi Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsIncomingModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveIncoming} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    No. Agenda Surat Masuk
                  </label>
                  <input
                    type="text"
                    required
                    value={incomingForm.agendaNumber}
                    onChange={(e) =>
                      setIncomingForm({ ...incomingForm, agendaNumber: e.target.value })
                    }
                    placeholder="Contoh: 027/AGD-IN/XI/2026"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    No. Surat Asal (Dari Pengirim)
                  </label>
                  <input
                    type="text"
                    value={incomingForm.letterNumber}
                    onChange={(e) =>
                      setIncomingForm({ ...incomingForm, letterNumber: e.target.value })
                    }
                    placeholder="Contoh: B-1044/KUA/XI/2026"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Asal Pengirim / Instansi
                  </label>
                  <input
                    type="text"
                    required
                    value={incomingForm.sender}
                    onChange={(e) => setIncomingForm({ ...incomingForm, sender: e.target.value })}
                    placeholder="Contoh: Kemenag Kota, Kantor Kelurahan, Baznas"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Kategori Dokumen
                  </label>
                  <select
                    value={incomingForm.category}
                    onChange={(e) =>
                      setIncomingForm({
                        ...incomingForm,
                        category: e.target.value as IncomingLetter['category'],
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="Edaran Resmi">Edaran Resmi</option>
                    <option value="Undangan">Undangan Eksternal</option>
                    <option value="Permohonan Kerjasama">Permohonan Kerjasama</option>
                    <option value="Pemberitahuan">Pemberitahuan</option>
                    <option value="Proposal Bantuan">Proposal Bantuan</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Perihal / Judul Surat
                </label>
                <input
                  type="text"
                  required
                  value={incomingForm.subject}
                  onChange={(e) => setIncomingForm({ ...incomingForm, subject: e.target.value })}
                  placeholder="Contoh: Edaran Panduan Standar Manajemen Zakat & Sholat Jumat"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Tanggal Surat
                  </label>
                  <input
                    type="date"
                    value={incomingForm.letterDate}
                    onChange={(e) =>
                      setIncomingForm({ ...incomingForm, letterDate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Tanggal Diterima
                  </label>
                  <input
                    type="date"
                    value={incomingForm.receivedDate}
                    onChange={(e) =>
                      setIncomingForm({ ...incomingForm, receivedDate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Tingkat Urgensi
                  </label>
                  <select
                    value={incomingForm.urgency}
                    onChange={(e) =>
                      setIncomingForm({
                        ...incomingForm,
                        urgency: e.target.value as IncomingLetter['urgency'],
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="Biasa">Biasa</option>
                    <option value="Penting">Penting</option>
                    <option value="Kilat / Segera">Kilat / Segera</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                  Arahan Disposisi Ketua DKM
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                      Disposisi Kepada
                    </label>
                    <input
                      type="text"
                      value={incomingForm.dispositionTo}
                      onChange={(e) =>
                        setIncomingForm({ ...incomingForm, dispositionTo: e.target.value })
                      }
                      placeholder="Contoh: Ketua DKM / Sekretaris / Seksi Dakwah"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                      Status Proses
                    </label>
                    <select
                      value={incomingForm.status}
                      onChange={(e) =>
                        setIncomingForm({
                          ...incomingForm,
                          status: e.target.value as IncomingLetter['status'],
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
                    >
                      <option value="Belum Diproses">Belum Diproses</option>
                      <option value="Didisposisikan">Didisposisikan</option>
                      <option value="Selesai Ditindaklanjuti">Selesai Ditindaklanjuti</option>
                      <option value="Diarsipkan">Diarsipkan</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    Instruksi / Arahan Tindak Lanjut
                  </label>
                  <input
                    type="text"
                    value={incomingForm.dispositionInstruction}
                    onChange={(e) =>
                      setIncomingForm({ ...incomingForm, dispositionInstruction: e.target.value })
                    }
                    placeholder="Contoh: Harap hadir pada rapat koordinasi dan laporkan hasilnya."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Ringkasan Pokok Isi Surat
                </label>
                <textarea
                  rows={2}
                  value={incomingForm.summary}
                  onChange={(e) => setIncomingForm({ ...incomingForm, summary: e.target.value })}
                  placeholder="Ringkasan poin penting dari surat masuk..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Nama Berkas / Lampiran (Opsional)
                  </label>
                  <input
                    type="text"
                    value={incomingForm.attachmentName}
                    onChange={(e) =>
                      setIncomingForm({ ...incomingForm, attachmentName: e.target.value })
                    }
                    placeholder="Contoh: Surat_Edaran_Kemenag.pdf"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Catatan Singkat (Opsional)
                  </label>
                  <input
                    type="text"
                    value={incomingForm.notes}
                    onChange={(e) => setIncomingForm({ ...incomingForm, notes: e.target.value })}
                    placeholder="Contoh: Disampaikan via kurir resmi"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsIncomingModalOpen(false)}
                  className="px-4 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  {editingIncoming ? 'Simpan Perubahan' : 'Simpan Surat Masuk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: BUAT / EDIT SURAT KELUAR                                     */}
      {/* ===================================================================== */}
      {isOutgoingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 max-w-xl w-full space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                <Send className="w-5 h-5 text-emerald-600 shrink-0" />
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                  {editingOutgoing ? 'Edit Surat Keluar DKM' : 'Buat Surat Keluar Resmi DKM Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOutgoingModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!editingOutgoing && (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block mb-1.5">
                  Gunakan Template Cepat:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      'Surat Undangan',
                      'Surat Permohonan',
                      'Surat Keterangan',
                      'Surat Tugas',
                      'Surat Keputusan (SK)',
                    ] as OutgoingLetter['type'][]
                  ).map((tpl) => (
                    <button
                      key={tpl}
                      type="button"
                      onClick={() => handleTemplateSelect(tpl)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        outgoingForm.type === tpl
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {tpl}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSaveOutgoing} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Jenis Surat Keluar
                  </label>
                  <select
                    value={outgoingForm.type}
                    onChange={(e) =>
                      setOutgoingForm({
                        ...outgoingForm,
                        type: e.target.value as OutgoingLetter['type'],
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="Surat Undangan">Surat Undangan</option>
                    <option value="Surat Permohonan">Surat Permohonan Bantuan / Donasi</option>
                    <option value="Surat Keterangan">Surat Keterangan Mustahik</option>
                    <option value="Surat Tugas">Surat Tugas Imam / Amil</option>
                    <option value="Surat Keputusan (SK)">Surat Keputusan DKM (SK)</option>
                    <option value="Surat Pemberitahuan">Surat Pemberitahuan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Tujuan / Kepada Yth.
                  </label>
                  <input
                    type="text"
                    required
                    value={outgoingForm.recipient}
                    onChange={(e) =>
                      setOutgoingForm({ ...outgoingForm, recipient: e.target.value })
                    }
                    placeholder="Contoh: Pengurus RW 04 / Bpk. H. Hendra"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Perihal / Judul Surat
                  </label>
                  <input
                    type="text"
                    required
                    value={outgoingForm.title}
                    onChange={(e) => setOutgoingForm({ ...outgoingForm, title: e.target.value })}
                    placeholder="Contoh: Undangan Rapat Evaluasi & RKAP 2027"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Lampiran
                  </label>
                  <input
                    type="text"
                    value={outgoingForm.attachmentInfo}
                    onChange={(e) =>
                      setOutgoingForm({ ...outgoingForm, attachmentInfo: e.target.value })
                    }
                    placeholder="Contoh: 1 Berkas / -"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Isi Pokok Surat
                </label>
                <textarea
                  rows={5}
                  required
                  value={outgoingForm.content}
                  onChange={(e) => setOutgoingForm({ ...outgoingForm, content: e.target.value })}
                  placeholder="Tuliskan isi pokok surat resmi masjid di sini..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none resize-none leading-relaxed focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Nama Penandatangan
                  </label>
                  <input
                    type="text"
                    value={outgoingForm.signerName}
                    onChange={(e) =>
                      setOutgoingForm({ ...outgoingForm, signerName: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Jabatan
                  </label>
                  <input
                    type="text"
                    value={outgoingForm.signerPosition}
                    onChange={(e) =>
                      setOutgoingForm({ ...outgoingForm, signerPosition: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Status Surat
                  </label>
                  <select
                    value={outgoingForm.status}
                    onChange={(e) =>
                      setOutgoingForm({
                        ...outgoingForm,
                        status: e.target.value as OutgoingLetter['status'],
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="Diterbitkan">Diterbitkan</option>
                    <option value="Konsep">Konsep (Draf)</option>
                    <option value="Terkirim">Terkirim</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Catatan Singkat (Opsional)
                </label>
                <input
                  type="text"
                  value={outgoingForm.notes}
                  onChange={(e) => setOutgoingForm({ ...outgoingForm, notes: e.target.value })}
                  placeholder="Contoh: Dilampiri jadwal resmi"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOutgoingModalOpen(false)}
                  className="px-4 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  {editingOutgoing ? 'Simpan Perubahan' : 'Terbitkan Surat Resmi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modals for Delete */}
      <ConfirmDeleteModal
        isOpen={deleteConfirmTarget !== null}
        title={deleteConfirmTarget?.kind === 'incoming' ? 'Hapus Surat Masuk' : 'Hapus Surat Keluar'}
        itemName={deleteConfirmTarget?.label || 'Surat'}
        message="Surat yang dihapus tidak dapat dipulihkan. Apakah Anda yakin ingin menghapus data surat ini?"
        confirmText="Hapus Surat"
        onConfirm={handleConfirmDeleteSingle}
        onCancel={() => setDeleteConfirmTarget(null)}
      />

      <ConfirmDeleteModal
        isOpen={isMultiDeleteModalOpen}
        title="Hapus Massal Surat"
        count={selectedUids.length}
        message={`Sebanyak ${selectedUids.length} surat yang dipilih akan dihapus secara permanen dari sistem administrasi.`}
        confirmText={`Hapus ${selectedUids.length} Surat`}
        onConfirm={handleConfirmDeleteMulti}
        onCancel={() => setIsMultiDeleteModalOpen(false)}
      />

      {/* Printable Report Modal: Surat Masuk */}
      <ReportPrintModal
        isOpen={isIncomingReportPrintOpen}
        onClose={() => setIsIncomingReportPrintOpen(false)}
        title="BUKU AGENDA SURAT MASUK RESMI DKM"
        subtitle={`Sekretariat & Tata Usaha ${mosqueProfile.name || 'DKM Masjid'}`}
        periodText={`Tahun Dokumen ${new Date().getFullYear()}${filteredIncomingForReport.length !== incomingLetters.length ? ` • Filter Aktif (${filteredIncomingForReport.length} dari ${incomingLetters.length} Surat)` : ` • Semua Data (${incomingLetters.length} Surat)`}`}
        summaryCards={[
          { label: 'Total Surat Masuk', value: `${filteredIncomingForReport.length} Berkas`, color: 'emerald' },
          {
            label: 'Selesai Ditindaklanjuti',
            value: `${
              filteredIncomingForReport.filter((l) => l.status === 'Selesai Ditindaklanjuti').length
            } Surat`,
            color: 'blue',
          },
          {
            label: 'Perlu Tindak Lanjut',
            value: `${
              filteredIncomingForReport.filter(
                (l) => l.status === 'Belum Diproses' || l.status === 'Didisposisikan'
              ).length
            } Surat`,
            color: 'amber',
          },
          {
            label: 'Sifat Penting / Kilat',
            value: `${
              filteredIncomingForReport.filter(
                (l) => l.urgency === 'Kilat / Segera' || l.urgency === 'Penting'
              ).length
            } Surat`,
            color: 'purple',
          },
        ]}
        columns={[
          { header: 'No. Agenda', key: 'agenda', width: '13%' },
          { header: 'Tgl Terima', key: 'receivedDate', width: '10%' },
          { header: 'Nomor Surat Asal', key: 'letterNumber', width: '15%' },
          { header: 'Pengirim / Asal', key: 'sender', width: '22%' },
          { header: 'Perihal Surat', key: 'subject', width: '25%' },
          { header: 'Disposisi & Status', key: 'disposition', width: '15%' },
        ]}
        data={filteredIncomingForReport.map((l) => ({
          agenda: l.agendaNumber,
          receivedDate: l.receivedDate,
          letterNumber: l.letterNumber,
          sender: l.sender,
          subject: l.subject,
          disposition: `${l.dispositionTo ? `${l.dispositionTo}: ` : ''}${l.status}`,
        }))}
        notes="Buku agenda surat masuk ini merupakan arsip resmi tata usaha DKM untuk pencatatan korespondensi kelembagaan."
        signatures={getAgendaBaseSignatures()}
      />

      {/* Printable Report Modal: Surat Keluar */}
      <ReportPrintModal
        isOpen={isOutgoingReportPrintOpen}
        onClose={() => setIsOutgoingReportPrintOpen(false)}
        title="BUKU EKSPEDISI & AGENDA SURAT KELUAR RESMI"
        subtitle={`Sekretariat & Penerbitan Dokumen Resmi ${mosqueProfile.name || 'DKM Masjid'}`}
        periodText={`Tahun Dokumen ${new Date().getFullYear()}${filteredOutgoingForReport.length !== outgoingLetters.length ? ` • Filter Aktif (${filteredOutgoingForReport.length} dari ${outgoingLetters.length} Surat)` : ` • Semua Data (${outgoingLetters.length} Surat)`}`}
        summaryCards={[
          { label: 'Total Surat Keluar', value: `${filteredOutgoingForReport.length} Berkas`, color: 'emerald' },
          {
            label: 'Status Diterbitkan',
            value: `${filteredOutgoingForReport.filter((l) => l.status === 'Diterbitkan').length} Surat`,
            color: 'blue',
          },
          {
            label: 'Status Draf / Review',
            value: `${
              filteredOutgoingForReport.filter((l) => l.status !== 'Diterbitkan').length
            } Surat`,
            color: 'amber',
          },
        ]}
        columns={[
          { header: 'Nomor Surat DKM', key: 'number', width: '18%' },
          { header: 'Tanggal', key: 'date', width: '10%' },
          { header: 'Jenis Dokumen', key: 'type', width: '14%' },
          { header: 'Tujuan / Penerima', key: 'recipient', width: '23%' },
          { header: 'Perihal Dokumen', key: 'title', width: '25%' },
          { header: 'Status', key: 'status', width: '10%' },
        ]}
        data={filteredOutgoingForReport.map((l) => ({
          number: l.letterNumber,
          date: l.date,
          type: l.type,
          recipient: l.recipient,
          title: l.title,
          status: l.status,
        }))}
        notes="Buku ekspedisi surat keluar ini menjadi bukti sah korespondensi eksternal dan internal Dewan Kemakmuran Masjid."
        signatures={getAgendaBaseSignatures()}
      />

      {/* Digital Signature Pad Modal */}
      {activeLetterSigner && (
        <DigitalSignaturePadModal
          isOpen={true}
          onClose={() => setActiveLetterSigner(null)}
          signerRole={activeLetterSigner.role}
          signerName={activeLetterSigner.name}
          initialSignature={
            activeLetterSigner.target === 'disposition-recipient'
              ? dispositionRecipientSig
              : activeLetterSigner.target === 'disposition-chairman'
              ? dispositionChairmanSig
              : outgoingSig
          }
          onSave={(dataUrl, rememberSignature) => {
            if (activeLetterSigner.target === 'disposition-recipient') {
              setDispositionRecipientSig(dataUrl);
            } else if (activeLetterSigner.target === 'disposition-chairman') {
              setDispositionChairmanSig(dataUrl);
            } else {
              setOutgoingSig(dataUrl);
            }
            if (rememberSignature) {
              saveStoredSignatureForSigner(
                activeLetterSigner.role,
                activeLetterSigner.name,
                dataUrl
              );
            }
          }}
          onClearExisting={() => {
            if (activeLetterSigner.target === 'disposition-recipient') {
              setDispositionRecipientSig(null);
            } else if (activeLetterSigner.target === 'disposition-chairman') {
              setDispositionChairmanSig(null);
            } else {
              setOutgoingSig(null);
            }
            saveStoredSignatureForSigner(
              activeLetterSigner.role,
              activeLetterSigner.name,
              null
            );
          }}
        />
      )}
    </div>
  );
};
