import { Transaction, InventoryItem, Mustahik, MosqueEvent, SecurityConfig, IncomingLetter, OutgoingLetter, MosqueProfile, FridayKajianItem, ZakatRecord } from '../types/index.ts';

const STORAGE_KEYS = {
  TRANSACTIONS: 'sabiluna_transactions',
  INVENTORY: 'sabiluna_inventory',
  MUSTAHIK: 'sabiluna_mustahik_records',
  EVENTS: 'sabiluna_events',
  SECURITY: 'sabiluna_security',
  SETTINGS: 'sabiluna_settings',
  INCOMING_LETTERS: 'sabiluna_incoming_letters',
  OUTGOING_LETTERS: 'sabiluna_outgoing_letters',
  FRIDAY_SCHEDULES: 'sabiluna_friday_schedules',
  ZAKAT_RECORDS: 'sabiluna_zakat_records',
  SIGNATURES: 'sabiluna_digital_signatures',
  REPORT_SIGNERS: 'sabiluna_report_signers',
};

// Realistic Initial Mosque Data for Masjid Jami' Al-Barkah
const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'TRX-2026-001',
    type: 'in',
    category: 'Infaq Jumat',
    amount: 8750000,
    date: '2026-10-24',
    description: 'Kotak Infaq Sholat Jumat Berkah 24 Oktober 2026',
    donorName: 'Jamaah Sholat Jumat',
    isAnonymous: true,
    paymentMethod: 'Tunai',
    receiptNumber: 'KAS-IN-1001',
    encryptedNominal: 'aes256:d8f7a6e19b...4c2',
    createdBy: 'H. Ahmad Sobari (Bendahara)',
    createdAt: '2026-10-24T13:45:00Z',
  },
  {
    id: 'TRX-2026-002',
    type: 'in',
    category: 'Zakat Maal',
    amount: 15000000,
    date: '2026-10-25',
    description: 'Zakat Maal Perdagangan Tahunan',
    donorName: 'Ir. H. Muhammad Ridwan',
    isAnonymous: false,
    paymentMethod: 'Transfer Bank',
    receiptNumber: 'KAS-IN-1002',
    encryptedNominal: 'aes256:7b2c9e4a01...f9a',
    createdBy: 'H. Ahmad Sobari (Bendahara)',
    createdAt: '2026-10-25T09:12:00Z',
  },
  {
    id: 'TRX-2026-003',
    type: 'in',
    category: 'Donasi Renovasi',
    amount: 25000000,
    date: '2026-10-26',
    description: 'Wakaf dan Donasi Renovasi Tempat Wudhu & Toilet Akhwat',
    donorName: 'Hj. Siti Fatimah',
    isAnonymous: false,
    paymentMethod: 'Transfer Bank',
    receiptNumber: 'KAS-IN-1003',
    encryptedNominal: 'aes256:3e4a9b1c8d...001',
    createdBy: 'H. Ahmad Sobari (Bendahara)',
    createdAt: '2026-10-26T14:30:00Z',
  },
  {
    id: 'TRX-2026-004',
    type: 'out',
    category: 'Listrik, Air & Internet',
    amount: 2450000,
    date: '2026-10-27',
    description: 'Pembayaran Tagihan Listrik PLN Pascabayar Daya 11.000 VA & PDAM',
    donorName: 'PLN & PDAM Tirta',
    isAnonymous: false,
    paymentMethod: 'Transfer Bank',
    receiptNumber: 'KAS-OUT-2001',
    encryptedNominal: 'aes256:9a8b7c6d5e...432',
    createdBy: 'H. Ahmad Sobari (Bendahara)',
    createdAt: '2026-10-27T10:00:00Z',
  },
  {
    id: 'TRX-2026-005',
    type: 'out',
    category: 'Santunan Anak Yatim & Dhuafa',
    amount: 7500000,
    date: '2026-10-28',
    description: 'Penyaluran Santunan Bulanan untuk 25 Anak Yatim & Janda Dhuafa',
    donorName: 'Mustahik Lingkungan RW 04 & RW 05',
    isAnonymous: false,
    paymentMethod: 'Tunai',
    receiptNumber: 'KAS-OUT-2002',
    encryptedNominal: 'aes256:1a2b3c4d5e...789',
    createdBy: 'Ust. Farhan Basalamah (Sekretaris)',
    createdAt: '2026-10-28T16:20:00Z',
  },
  {
    id: 'TRX-2026-006',
    type: 'out',
    category: 'Honor Ustadz & Khotib',
    amount: 1500000,
    date: '2026-10-24',
    description: 'Bisyarah / Kafalah Khotib & Imam Sholat Jumat Ust. Dr. H. Khalid M.',
    donorName: 'Ust. Dr. H. Khalid M.',
    isAnonymous: false,
    paymentMethod: 'Tunai',
    receiptNumber: 'KAS-OUT-2003',
    encryptedNominal: 'aes256:2b4c6d8e0f...112',
    createdBy: 'H. Ahmad Sobari (Bendahara)',
    createdAt: '2026-10-24T13:50:00Z',
  },
  {
    id: 'TRX-2026-007',
    type: 'in',
    category: 'Kotak Amal Harian',
    amount: 1250000,
    date: '2026-10-29',
    description: 'Pembukaan Kotak Amal Harian Selasar & Gerbang Utama',
    donorName: 'Hamba Allah',
    isAnonymous: true,
    paymentMethod: 'Tunai',
    receiptNumber: 'KAS-IN-1004',
    encryptedNominal: 'aes256:4f5e6d7c8b...990',
    createdBy: 'Pak Sukardi (Marbot)',
    createdAt: '2026-10-29T18:00:00Z',
  },
  {
    id: 'TRX-2026-008',
    type: 'out',
    category: 'Kebersihan & Sanitasi',
    amount: 850000,
    date: '2026-10-29',
    description: 'Pembelian Sabun Cuci Karpet, Pewangi Ruangan, Karbol & Plastik Sampah',
    donorName: 'Toko Berkah Sanitasi',
    isAnonymous: false,
    paymentMethod: 'Tunai',
    receiptNumber: 'KAS-OUT-2004',
    encryptedNominal: 'aes256:3a5c7e9f1a...345',
    createdBy: 'Pak Sukardi (Marbot)',
    createdAt: '2026-10-29T11:15:00Z',
  },
];

const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'INV-001',
    code: 'AST-SND-01',
    name: 'Sound System Wireless TOA & Mixer Yamaha 16 Channel',
    category: 'Elektronik & Sound',
    quantity: 1,
    unit: 'Paket',
    condition: 'Baik',
    location: 'Ruang Operator Sound Lantai 2',
    purchaseDate: '2024-03-15',
    estimatedValue: 18500000,
    notes: 'Rutin service tiap 6 bulan, suara jernih dan bebas feedback.',
    updatedAt: '2026-10-20',
  },
  {
    id: 'INV-002',
    code: 'AST-KRP-02',
    name: 'Karpet Sajadah Tebal Grade A Turki (Roll 12 x 1.2m)',
    category: 'Perlengkapan Ibadah',
    quantity: 14,
    unit: 'Roll',
    condition: 'Baik',
    location: 'Ruang Sholat Utama',
    purchaseDate: '2023-08-10',
    estimatedValue: 42000000,
    notes: 'Dicuci berkala sebelum Ramadhan & Idul Adha.',
    updatedAt: '2026-10-15',
  },
  {
    id: 'INV-003',
    code: 'AST-AC-03',
    name: 'AC Daikin Inverter 2 PK (Standing & Wall Mounted)',
    category: 'Elektronik & Sound',
    quantity: 6,
    unit: 'Unit',
    condition: 'Baik',
    location: 'Ruang Sholat Utama & Ruang Rapat DKM',
    purchaseDate: '2024-01-20',
    estimatedValue: 54000000,
    notes: 'Jadwal cuci AC rutin setiap 3 bulan sekali.',
    updatedAt: '2026-10-28',
  },
  {
    id: 'INV-004',
    code: 'AST-GNST-04',
    name: 'Genset Silent Yamaha 7500 Watt Otomatis ATS',
    category: 'Elektronik & Sound',
    quantity: 1,
    unit: 'Unit',
    condition: 'Baik',
    location: 'Ruang Mesin Belakang Masjid',
    purchaseDate: '2023-11-05',
    estimatedValue: 26000000,
    notes: 'Bahan bakar pertalite selalu terisi minimal 75%.',
    updatedAt: '2026-10-12',
  },
  {
    id: 'INV-005',
    code: 'AST-VCM-05',
    name: 'Vacuum Cleaner Wet & Dry Industrial Karcher 30L',
    category: 'Kebersihan',
    quantity: 2,
    unit: 'Unit',
    condition: 'Baik',
    location: 'Gudang Marbot',
    purchaseDate: '2025-05-18',
    estimatedValue: 5800000,
    notes: '1 unit kondisi prima, 1 unit filter butuh diganti segera.',
    updatedAt: '2026-10-25',
  },
  {
    id: 'INV-006',
    code: 'AST-MMB-06',
    name: 'Mimbar Khotbah Ukir Kayu Jati Jepara & Tongkat Khotib',
    category: 'Mebel & Ruang',
    quantity: 1,
    unit: 'Set',
    condition: 'Baik',
    location: 'Pengimaman Depan',
    purchaseDate: '2022-04-10',
    estimatedValue: 16500000,
    notes: 'Wakaf dari keluarga Alm. H. Abdullah.',
    updatedAt: '2026-10-01',
  },
  {
    id: 'INV-007',
    code: 'AST-JAM-07',
    name: 'Jam Digital Jadwal Sholat Running Text & Iqomah Timer',
    category: 'Elektronik & Sound',
    quantity: 2,
    unit: 'Unit',
    condition: 'Baik',
    location: 'Dinding Utama & Lantai 2',
    purchaseDate: '2024-07-22',
    estimatedValue: 7200000,
    notes: 'Tersinkronisasi otomatis dengan waktu GPS/Internet.',
    updatedAt: '2026-10-18',
  },
];

export const INITIAL_MUSTAHIK: Mustahik[] = [
  {
    id: 'MST-001',
    name: 'Ibu Maryamah',
    nik: '3201155403720004',
    noKK: '3201152001150012',
    asnaf: 'Fakir',
    address: 'Gang Salak III No. 05, Kp. Sukamaju',
    rtRw: 'RT 01 / RW 05',
    phone: '0857-1234-9876',
    familyDependents: 4,
    economicCondition: 'Janda lansia dhuafa, tidak memiliki penghasilan tetap, merawat 3 anak & cucu yatim',
    eligibilityStatus: 'Layak Terima',
    totalAssistanceReceived: 750000,
    totalRiceReceived: 20,
    lastAssistanceDate: '2026-10-25',
    notes: 'Prioritas utama santunan bulanan & beras fitrah',
    registeredAt: '2026-01-15',
  },
  {
    id: 'MST-002',
    name: 'Bpk. Suparno',
    nik: '3201151112880004',
    noKK: '3201151405080021',
    asnaf: 'Miskin',
    address: 'Jl. Kenanga Ujung No. 23, Kp. Sukamaju',
    rtRw: 'RT 04 / RW 04',
    phone: '0878-1122-3344',
    familyDependents: 5,
    economicCondition: 'Buruh harian serabutan & istri buruh cuci, penghasilan di bawah UMR',
    eligibilityStatus: 'Layak Terima',
    totalAssistanceReceived: 450000,
    totalRiceReceived: 15,
    lastAssistanceDate: '2026-10-26',
    notes: 'Anak sulung masih sekolah SMK butuh bantuan SPP',
    registeredAt: '2026-02-10',
  },
  {
    id: 'MST-003',
    name: 'Ustadz Ahmad Fauzi, S.Pd.I',
    nik: '3201151004850082',
    asnaf: 'Fisabilillah',
    address: 'Perumahan Griya Asri Blok C4 No. 12',
    rtRw: 'RT 05 / RW 08',
    phone: '0813-9988-7766',
    familyDependents: 3,
    economicCondition: 'Guru ngaji TPQ Masjid & Da\'i pembina mualaf pelosok tanpa gaji tetap instansi',
    eligibilityStatus: 'Layak Terima',
    totalAssistanceReceived: 1500000,
    totalRiceReceived: 10,
    lastAssistanceDate: '2026-10-28',
    notes: 'Program kafalah dakwah & santunan guru mengaji',
    registeredAt: '2026-03-01',
  },
  {
    id: 'MST-004',
    name: 'Ibu Yohana Dewi (Mualaf)',
    nik: '3201154508930091',
    asnaf: 'Mualaf',
    address: 'Jl. Kenanga No. 8B, RT 02/RW 01',
    rtRw: 'RT 02 / RW 01',
    phone: '0878-5544-3322',
    familyDependents: 2,
    economicCondition: 'Mualaf baru dibimbing DKM, membutuhkan penguatan ekonomi & pembinaan tauhid',
    eligibilityStatus: 'Layak Terima',
    totalAssistanceReceived: 1000000,
    totalRiceReceived: 10,
    lastAssistanceDate: '2026-10-15',
    notes: 'Program pembinaan mualaf & modal usaha mikro',
    registeredAt: '2026-04-20',
  },
  {
    id: 'MST-005',
    name: 'Bpk. Hendro Santoso',
    nik: '3201150802770145',
    asnaf: 'Gharimin',
    address: 'Jl. Dahlia RT 04/RW 03',
    rtRw: 'RT 04 / RW 03',
    phone: '0821-6677-8899',
    familyDependents: 4,
    economicCondition: 'Terlilit hutang biaya operasi medis darurat anak di RS, usaha bengkel sepi',
    eligibilityStatus: 'Layak Terima',
    totalAssistanceReceived: 2000000,
    totalRiceReceived: 0,
    lastAssistanceDate: '2026-10-05',
    notes: 'Bantuan pelunasan hutang medis darurat berobat RS',
    registeredAt: '2026-05-12',
  },
  {
    id: 'MST-006',
    name: 'Pak Sutarman (Marbot)',
    nik: '3201151206700019',
    asnaf: 'Amil',
    address: 'Paviliun Marbot Masjid Jami\' Al-Barkah',
    rtRw: 'RT 01 / RW 01',
    phone: '0858-4455-6677',
    familyDependents: 2,
    economicCondition: 'Marbot masjid & panitia pelaksana amil zakat musiman',
    eligibilityStatus: 'Layak Terima',
    totalAssistanceReceived: 800000,
    totalRiceReceived: 15,
    lastAssistanceDate: '2026-10-20',
    notes: 'Kompensasi amil pengumpul & penyalur zakat fitrah',
    registeredAt: '2026-01-01',
  },
];

const INITIAL_EVENTS: MosqueEvent[] = [
  {
    id: 'EVT-01',
    title: 'Kajian Shubuh Tafsir Al-Quran Tematik & Sarapan Bersama',
    speaker: 'Ust. Dr. H. Khalid Basalamah, M.A.',
    date: '2026-11-01',
    time: '04:45 - 06:15 WIB',
    location: 'Ruang Sholat Utama',
    category: 'Kajian Rutin',
    status: 'Akan Datang',
  },
  {
    id: 'EVT-02',
    title: 'Khutbah & Sholat Jumat Berjamaah',
    speaker: 'Prof. Dr. KH. Nasaruddin Umar, MA',
    date: '2026-11-06',
    time: '11:45 - 12:45 WIB',
    location: 'Masjid Jami Al-Barkah',
    category: 'Sholat Jumat',
    status: 'Akan Datang',
  },
  {
    id: 'EVT-03',
    title: 'Peringatan Maulid Nabi Muhammad SAW & Santunan 100 Anak Yatim',
    speaker: 'Habib Jindan bin Novel bin Salim Jindan',
    date: '2026-11-15',
    time: '19:30 - 22:00 WIB',
    location: 'Halaman & Aula Masjid',
    category: 'Peringatan Hari Besar',
    status: 'Akan Datang',
  },
  {
    id: 'EVT-04',
    title: 'Rapat Kerja Pengurus DKM: Evaluasi Laporan Keuangan & RKAP 2027',
    speaker: 'Ketua DKM & Seluruh Pengurus',
    date: '2026-11-08',
    time: '08:30 - 12:00 WIB',
    location: 'Ruang Pertemuan DKM',
    category: 'Rapat DKM',
    status: 'Akan Datang',
  },
];

const INITIAL_SECURITY_CONFIG: SecurityConfig = {
  neonDbHost: 'ep-spring-masjid-a1b2c3d4.ap-southeast-1.aws.neon.tech',
  neonDbPort: 5432,
  neonDbName: 'sabiluna_masjid_db',
  neonDbUser: 'sabiluna_admin',
  sslMode: 'require',
  jwtSecretMasked: 'sb_jwt_sec_99a8*******************f0',
  tokenExpiresIn: '24 Jam (86400s)',
  antiSqlInjectionActive: true,
  aes256EncryptionActive: true,
};

// Storage helper functions
export const getStoredTransactions = (): Transaction[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
      return INITIAL_TRANSACTIONS;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_TRANSACTIONS;
  }
};

export const saveStoredTransactions = (transactions: Transaction[]) => {
  const serialized = JSON.stringify(transactions);
  if (localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) === serialized) return;
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, serialized);
  window.dispatchEvent(new Event('transactions-updated'));
};

export const getStoredInventory = (): InventoryItem[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.INVENTORY);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(INITIAL_INVENTORY));
      return INITIAL_INVENTORY;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_INVENTORY;
  }
};

export const saveStoredInventory = (items: InventoryItem[]) => {
  const serialized = JSON.stringify(items);
  if (localStorage.getItem(STORAGE_KEYS.INVENTORY) === serialized) return;
  localStorage.setItem(STORAGE_KEYS.INVENTORY, serialized);
  window.dispatchEvent(new Event('inventory-updated'));
};

export const getStoredMustahik = (): Mustahik[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.MUSTAHIK);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.MUSTAHIK, JSON.stringify(INITIAL_MUSTAHIK));
      return INITIAL_MUSTAHIK;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_MUSTAHIK;
  }
};

export const saveStoredMustahik = (mustahikList: Mustahik[]) => {
  const serialized = JSON.stringify(mustahikList);
  localStorage.setItem(STORAGE_KEYS.MUSTAHIK, serialized);
  window.dispatchEvent(new Event('mustahik_records_updated'));
};

export const getStoredEvents = (): MosqueEvent[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.EVENTS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(INITIAL_EVENTS));
      return INITIAL_EVENTS;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_EVENTS;
  }
};

export const saveStoredEvents = (events: MosqueEvent[]) => {
  const serialized = JSON.stringify(events);
  if (localStorage.getItem(STORAGE_KEYS.EVENTS) === serialized) return;
  localStorage.setItem(STORAGE_KEYS.EVENTS, serialized);
  window.dispatchEvent(new Event('events-updated'));
};

export const getStoredSecurityConfig = (): SecurityConfig => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SECURITY);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.SECURITY, JSON.stringify(INITIAL_SECURITY_CONFIG));
      return INITIAL_SECURITY_CONFIG;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_SECURITY_CONFIG;
  }
};

export const saveStoredSecurityConfig = (config: SecurityConfig) => {
  localStorage.setItem(STORAGE_KEYS.SECURITY, JSON.stringify(config));
  window.dispatchEvent(new Event('security-config-updated'));
};

// Mask sensitive names and encrypt simulated payload
export const maskSensitiveName = (name: string, isAnonymous?: boolean): string => {
  if (isAnonymous) return 'Hamba Allah (Dirahasiakan)';
  if (!name || name.trim() === '') return 'Hamba Allah';
  return name;
};

export const formatCurrencyIDR = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const INITIAL_INCOMING_LETTERS: IncomingLetter[] = [
  {
    id: 'SM-2026-001',
    agendaNumber: '024/AGD-IN/X/2026',
    letterNumber: 'B-1082/Kua.11.02/BA.01/10/2026',
    sender: 'Kantor Urusan Agama (KUA) Kec. Margahayu',
    subject: 'Surat Edaran Panduan Standardisasi Pengelolaan Zakat & Jadwal Khutbah Jumat',
    category: 'Edaran Resmi',
    letterDate: '2026-10-22',
    receivedDate: '2026-10-24',
    urgency: 'Penting',
    dispositionTo: 'Ketua DKM & Seksi Dakwah',
    dispositionInstruction: 'Harap disesuaikan dengan SOP amil zakat masjid dan diarsipkan sebagai rujukan dewan syariah.',
    status: 'Selesai Ditindaklanjuti',
    summary: 'Petunjuk teknis pencatatan amil zakat 8 asnaf dan imbauan materi khutbah persatuan umat.',
    attachmentName: 'Edaran_KUA_Standardisasi_Zakat_2026.pdf',
    notes: 'Disampaikan via kurir resmi KUA.',
  },
  {
    id: 'SM-2026-002',
    agendaNumber: '025/AGD-IN/X/2026',
    letterNumber: '045/RW-04/MRG/X/2026',
    sender: 'Pengurus RW 04 Kelurahan Margahayu',
    subject: 'Permohonan Izin Pemakaian Halaman & Aula Masjid untuk Donor Darah PMI',
    category: 'Permohonan Kerjasama',
    letterDate: '2026-10-27',
    receivedDate: '2026-10-28',
    urgency: 'Kilat / Segera',
    dispositionTo: 'Ketua DKM & Seksi Sarana Prasarana',
    dispositionInstruction: 'Disetujui. Siapkan ruang aula utama dan koordinasikan kebersihan serta parkir bersama marbot.',
    status: 'Didisposisikan',
    summary: 'Kegiatan Bakti Sosial Donor Darah bekerjasama dengan PMI Kota pada hari Ahad pagi jam 08.00-12.00 WIB.',
    attachmentName: 'Proposal_Donor_Darah_RW04_PMI.pdf',
    notes: 'Memerlukan 6 meja dan 20 kursi lipat.',
  },
  {
    id: 'SM-2026-003',
    agendaNumber: '026/AGD-IN/X/2026',
    letterNumber: '012/YAYASAN-DAKWAH/X/2026',
    sender: 'Yayasan Cinta Yatim & Dhuafa Nusantara',
    subject: 'Undangan Menghadiri Silaturahmi Akbar & Pelatihan Manajemen Masjid Modern',
    category: 'Undangan',
    letterDate: '2026-10-29',
    receivedDate: '2026-10-30',
    urgency: 'Biasa',
    dispositionTo: 'Sekretaris DKM',
    dispositionInstruction: 'Sekretaris dimohon mewakili DKM untuk hadir pada tanggal 15 November 2026.',
    status: 'Belum Diproses',
    summary: 'Silaturahmi tahunan dan workshop akreditasi manajemen masjid modern serta digitalisasi keuangan.',
    attachmentName: 'Undangan_Workshop_Manajemen_Masjid.pdf',
    notes: 'Gratis biaya pendaftaran untuk 2 orang delegasi DKM.',
  },
];

export const INITIAL_OUTGOING_LETTERS: OutgoingLetter[] = [
  {
    id: 'SK-2026-001',
    letterNumber: '018/DKM-ALBARKAH/X/2026',
    type: 'Surat Undangan',
    title: 'Undangan Rapat Kerja Evaluasi Laporan Keuangan & RKAP 2027',
    recipient: 'Seluruh Pengurus DKM & Penasihat Masjid',
    date: '2026-10-28',
    content: 'Sehubungan dengan berakhirnya kuartal III tahun 2026, kami mengundang Bapak/Ibu pengurus DKM untuk hadir pada Rapat Pleno evaluasi keuangan dan penyusunan RKAP yang akan dilaksanakan pada Ahad, 08 November 2026 bertempat di Ruang Rapat DKM Lantai 2.',
    signerName: 'Drs. KH. Ahmad Muzammil',
    signerPosition: 'Ketua DKM Masjid Jami\' Al-Barkah',
    status: 'Diterbitkan',
    attachmentInfo: '1 Berkas Draf RKAP 2027',
    notes: 'Surat disebarkan via WhatsApp dan lembar cetak.',
  },
  {
    id: 'SK-2026-002',
    letterNumber: '019/DKM-ALBARKAH/X/2026',
    type: 'Surat Permohonan',
    title: 'Permohonan Bantuan Dana Wakaf Karpet & Sound System',
    recipient: 'Pimpinan PT. Sumber Berkah Sejahtera / Bpk. H. Hendra',
    date: '2026-10-29',
    content: 'Dalam rangka meningkatkan kenyamanan jamaah saat sholat fardhu dan sholat Jumat, DKM Masjid Jami\' Al-Barkah merencanakan pengadaan Karpet Sajadah Grade A Turki dan peremajaan sistem audio masjid. Bersama ini kami mengajukan permohonan donasi dan wakaf.',
    signerName: 'Drs. KH. Ahmad Muzammil',
    signerPosition: 'Ketua DKM Masjid Jami\' Al-Barkah',
    status: 'Diterbitkan',
    attachmentInfo: 'Proposal Rincian Anggaran & RAB',
    notes: 'Telah diantar langsung ke kantor donatur.',
  },
  {
    id: 'SK-2026-003',
    letterNumber: '020/DKM-ALBARKAH/X/2026',
    type: 'Surat Keterangan',
    title: 'Surat Keterangan Rekomendasi Warga Kurang Mampu (Mustahik)',
    recipient: 'Dinas Sosial & Baznas Kota',
    date: '2026-10-30',
    content: 'Menerangkan bahwa Ibu Maryamah adalah warga tetap lingkungan RW 04 Masjid Jami\' Al-Barkah berstatus janda dhuafa dan termasuk dalam kategori asnaf fakir mustahik yang layak menerima program bantuan beasiswa pendidikan anak yatim.',
    signerName: 'Ust. Farhan Basalamah, S.Kom',
    signerPosition: 'Sekretaris DKM',
    status: 'Diterbitkan',
    attachmentInfo: 'Fotokopi KK & KTP Pemohon',
    notes: 'Diberikan langsung kepada pemohon untuk pengajuan beasiswa.',
  },
  {
    id: 'SK-2026-004',
    letterNumber: '021/DKM-ALBARKAH/X/2026',
    type: 'Surat Tugas',
    title: 'Surat Tugas Tim Panitia Zakat Fitrah & Zakat Maal Ramadhan 1448 H',
    recipient: 'Ust. H. Syamsul Arifin & Tim Amil Zakat',
    date: '2026-10-31',
    content: 'Dengan ini memberikan mandat dan tugas kepada nama-nama terlampir sebagai Panitia Amil Zakat Masjid Jami\' Al-Barkah untuk menghimpun, mengadministrasikan, dan menyalurkan zakat fitrah, zakat maal, infaq, dan fidyah kepada 8 golongan Asnaf secara akuntabel.',
    signerName: 'Drs. KH. Ahmad Muzammil',
    signerPosition: 'Ketua DKM Masjid Jami\' Al-Barkah',
    status: 'Diterbitkan',
    attachmentInfo: 'Daftar Susunan Panitia Amil',
    notes: 'Surat mandat resmi DKM berstempel.',
  },
];

export const getStoredIncomingLetters = (): IncomingLetter[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.INCOMING_LETTERS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.INCOMING_LETTERS, JSON.stringify(INITIAL_INCOMING_LETTERS));
      return INITIAL_INCOMING_LETTERS;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_INCOMING_LETTERS;
  }
};

export const saveStoredIncomingLetters = (letters: IncomingLetter[]) => {
  localStorage.setItem(STORAGE_KEYS.INCOMING_LETTERS, JSON.stringify(letters));
  window.dispatchEvent(new Event('letters-updated'));
};

export const getStoredOutgoingLetters = (): OutgoingLetter[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.OUTGOING_LETTERS);
    if (!data) {
      // Check if legacy sabiluna_letters exists
      const legacy = localStorage.getItem('sabiluna_letters');
      if (legacy) {
        try {
          const parsed = JSON.parse(legacy);
          if (Array.isArray(parsed) && parsed.length > 0) {
            localStorage.setItem(STORAGE_KEYS.OUTGOING_LETTERS, JSON.stringify(parsed));
            return parsed;
          }
        } catch {
          // ignore
        }
      }
      localStorage.setItem(STORAGE_KEYS.OUTGOING_LETTERS, JSON.stringify(INITIAL_OUTGOING_LETTERS));
      return INITIAL_OUTGOING_LETTERS;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_OUTGOING_LETTERS;
  }
};

export const saveStoredOutgoingLetters = (letters: OutgoingLetter[]) => {
  localStorage.setItem(STORAGE_KEYS.OUTGOING_LETTERS, JSON.stringify(letters));
  window.dispatchEvent(new Event('letters-updated'));
};

export const DEFAULT_MOSQUE_PROFILE: MosqueProfile = {
  name: "Masjid Jami' Al-Barkah",
  simasNumber: '01.4.11.02.04.000142',
  foundedYear: '1988',
  address: 'Jl. Al-Barkah No. 01, Kelurahan Sejahtera, Jakarta Selatan',
  city: 'Kota Jakarta Selatan, DKI Jakarta 12870',
  phone: '(021) 7890-1234',
  adminPhone: '0811-2233-4455',
  email: 'sekretariat@masjidalbarkah.id',
  leadPerson: 'Drs. KH. Ahmad Muzammil',
  bankBSI: '7112-8899-001 (BSI)',
  bankAccountName: 'DKM Jami Al-Barkah',
  qrisMerchant: 'NMID: ID1020038891283 - QRIS Masjid Al-Barkah',
  portalBadge: 'SYAMIL · Sistem Manajemen Masjid Terpadu',
  portalDescription: 'Platform terpadu untuk mengelola administrasi, keuangan, aset, dan kegiatan masjid.',
  portalFeature1Title: 'Hak Akses Berbasis Peran (RBAC)',
  portalFeature1Desc: 'Pemisahan wewenang Admin, Sekretaris, Bendahara, dan Humas.',
  portalFeature2Title: 'Keamanan & Enkripsi Data',
  portalFeature2Desc: 'Pencegahan SQL Injection, password hash bcrypt, dan audit trail log.',
  portalFeature3Title: 'Autentikasi Token JWT HS256',
  portalFeature3Desc: 'Sesi aman terenkripsi dengan proteksi logout menyeluruh.',
  footerBrandTitle: 'SYAMIL v2.0',
  footerBrandSubtitle: 'Sistem Manajemen Masjid Terpadu',
  loginFooterCenter: '',
};

export const getStoredMosqueProfile = (): MosqueProfile => {
  try {
    const data = localStorage.getItem('sabiluna_mosque_profile');
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        return { ...DEFAULT_MOSQUE_PROFILE, ...parsed };
      }
    }
  } catch {
    // fallback
  }
  return DEFAULT_MOSQUE_PROFILE;
};

export const saveStoredMosqueProfile = (profile: MosqueProfile) => {
  localStorage.setItem('sabiluna_mosque_profile', JSON.stringify(profile));
  // Dispatch a global event so all components/tabs synchronize instantly
  window.dispatchEvent(new CustomEvent('mosque-profile-updated', { detail: profile }));
};

export const formatDkmHeaderTitle = (mosqueName?: string): string => {
  const raw = (mosqueName || DEFAULT_MOSQUE_PROFILE.name).trim();
  const upper = raw.toUpperCase();
  return upper.startsWith('MASJID ')
    ? `DEWAN KEMAKMURAN ${upper}`
    : `DEWAN KEMAKMURAN MASJID ${upper}`;
};

export const formatReportCity = (city?: string): string => {
  const raw = (city || DEFAULT_MOSQUE_PROFILE.city || 'Jakarta').trim();
  if (!raw) return 'Jakarta';
  const beforeComma = raw.split(',')[0].trim();
  const cleaned = beforeComma
    .replace(/^Kota\s+/i, '')
    .replace(/^Kabupaten\s+/i, '')
    .replace(/^Kab\.?\s+/i, '')
    .replace(/\s+\d{5}$/, '')
    .trim();
  return cleaned || 'Jakarta';
};

export const INITIAL_FRIDAY_SCHEDULES: FridayKajianItem[] = [
  {
    id: 'FK-01',
    type: 'Khutbah Jumat',
    title: 'Membangun Generasi Robbani yang Istiqomah di Era Modern',
    speaker: 'Prof. Dr. KH. Nasaruddin Umar, MA',
    imam: 'Ust. H. Syahrul Ramadhan, Lc.',
    muadzin: 'Ust. Bilal Al-Fatih',
    date: '2026-11-06',
    time: '11:45 - 12:45 WIB',
    location: "Masjid Jami' Al-Barkah (Ruang Utama)",
    status: 'Akan Datang',
    notes: 'Khotib hadir 30 menit sebelum adzan pertama',
  },
  {
    id: 'FK-02',
    type: 'Kajian Rutin',
    title: 'Kajian Shubuh Tafsir Jalalain & Tazkiyatun Nufus',
    speaker: 'Ust. Dr. H. Khalid Basalamah, M.A.',
    date: '2026-11-01',
    time: '04:45 - 06:15 WIB',
    location: 'Ruang Sholat Utama',
    status: 'Akan Datang',
    notes: 'Sarapan pagi bersama jamaah setelah kajian',
  },
  {
    id: 'FK-03',
    type: 'Khutbah Jumat',
    title: "Urgensi Menjaga Amanah Harta & Zakat dalam Islam",
    speaker: "Ust. Dr. Muhammad Syafi'i Antonio, M.Ec.",
    imam: 'Ust. M. Ridwan, Al-Hafidz',
    muadzin: 'Pak Sukardi (Marbot)',
    date: '2026-11-13',
    time: '11:45 - 12:45 WIB',
    location: "Masjid Jami' Al-Barkah",
    status: 'Akan Datang',
  },
  {
    id: 'FK-04',
    type: 'Kajian Akhwat',
    title: 'Fiqih Wanita & Manajemen Keluarga Sakinah',
    speaker: 'Ustadzah Hj. Oki Setiana Dewi, M.Pd.',
    date: '2026-11-08',
    time: '09:00 - 11:30 WIB',
    location: 'Aula Sakinah Lantai 2',
    status: 'Akan Datang',
  },
];

export const getStoredFridaySchedules = (): FridayKajianItem[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.FRIDAY_SCHEDULES);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.FRIDAY_SCHEDULES, JSON.stringify(INITIAL_FRIDAY_SCHEDULES));
      return INITIAL_FRIDAY_SCHEDULES;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_FRIDAY_SCHEDULES;
  }
};

export const saveStoredFridaySchedules = (items: FridayKajianItem[]) => {
  localStorage.setItem(STORAGE_KEYS.FRIDAY_SCHEDULES, JSON.stringify(items));
  window.dispatchEvent(new Event('friday-schedules-updated'));
};

export const INITIAL_ZAKAT_RECORDS: ZakatRecord[] = [
  {
    id: 'ZKT-001',
    type: 'Zakat Fitrah',
    muzakkiName: 'Ir. H. Muhammad Ridwan & Keluarga',
    familyCount: 5,
    riceKg: 12.5,
    cashAmount: 0,
    asnafTarget: 'Fakir',
    recipientName: 'Ibu Maryamah (Janda Dhuafa)',
    status: 'Tersalurkan',
    date: '2026-10-25',
    receiptNumber: 'ZKT-FIT-101',
    notes: 'Beras pandan wangi kualitas super',
  },
  {
    id: 'ZKT-002',
    type: 'Zakat Fitrah',
    muzakkiName: 'Drs. H. Bambang Sudirman',
    familyCount: 4,
    riceKg: 0,
    cashAmount: 180000,
    asnafTarget: 'Miskin',
    recipientName: 'Bpk. Suparno (Buruh Harian)',
    status: 'Tersalurkan',
    date: '2026-10-26',
    receiptNumber: 'ZKT-FIT-102',
    notes: 'Setara 4 jiwa @ Rp 45.000',
  },
  {
    id: 'ZKT-003',
    type: 'Zakat Maal',
    muzakkiName: 'H. Hendra Gunawan (Toko Barokah)',
    familyCount: 1,
    riceKg: 0,
    cashAmount: 15000000,
    asnafTarget: 'Fisabilillah',
    recipientName: 'Ustadz Ahmad Fauzi (Guru Ngaji)',
    status: 'Tersalurkan',
    date: '2026-10-28',
    receiptNumber: 'ZKT-MAL-201',
    notes: 'Zakat perniagaan emas & saldo tabungan',
  },
  {
    id: 'ZKT-004',
    type: 'Fidyah',
    muzakkiName: 'Ibu Hj. Aminah',
    familyCount: 1,
    riceKg: 0,
    cashAmount: 450000,
    asnafTarget: 'Fakir',
    recipientName: 'Santunan Lansia Dhuafa',
    status: 'Tersimpan di Amil',
    date: '2026-10-29',
    receiptNumber: 'ZKT-FID-301',
    notes: 'Fidyah 15 hari puasa @ Rp 30.000',
  },
];

export const getStoredZakatRecords = (): ZakatRecord[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ZAKAT_RECORDS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.ZAKAT_RECORDS, JSON.stringify(INITIAL_ZAKAT_RECORDS));
      return INITIAL_ZAKAT_RECORDS;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_ZAKAT_RECORDS;
  }
};

export const saveStoredZakatRecords = (records: ZakatRecord[]) => {
  localStorage.setItem(STORAGE_KEYS.ZAKAT_RECORDS, JSON.stringify(records));
  window.dispatchEvent(new Event('zakat_records_updated'));
};

export const normalizeSignerKey = (role: string, name: string): string => {
  const cleanName = (name || '').trim().toLowerCase();
  const cleanRole = (role || '').trim().toLowerCase();
  return cleanName ? `name:${cleanName}` : `role:${cleanRole}`;
};

export const getStoredSignatures = (): Record<string, string> => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SIGNATURES);
    if (!data) return {};
    const parsed = JSON.parse(data);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const getStoredSignatureForSigner = (role: string, name: string): string | null => {
  const map = getStoredSignatures();
  const nameKey = normalizeSignerKey(role, name);
  if (map[nameKey]) return map[nameKey];
  const roleKey = `role:${(role || '').trim().toLowerCase()}`;
  return map[roleKey] || null;
};

export const saveStoredSignatureForSigner = (
  role: string,
  name: string,
  dataUrl: string | null
) => {
  const map = getStoredSignatures();
  const key = normalizeSignerKey(role, name);
  if (dataUrl) {
    map[key] = dataUrl;
  } else {
    delete map[key];
    const roleKey = `role:${(role || '').trim().toLowerCase()}`;
    delete map[roleKey];
  }
  localStorage.setItem(STORAGE_KEYS.SIGNATURES, JSON.stringify(map));
  window.dispatchEvent(new Event('signatures-updated'));
};

export interface StoredReportSignerOverride {
  name: string;
  position?: string;
}

export const normalizeReportSignerRoleKey = (role: string): string =>
  (role || '').trim().toLowerCase();

export const getStoredReportSigners = (): Record<string, StoredReportSignerOverride> => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.REPORT_SIGNERS);
    if (!data) return {};
    const parsed = JSON.parse(data);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const saveStoredReportSigners = (
  overrides: Record<string, StoredReportSignerOverride>
) => {
  localStorage.setItem(STORAGE_KEYS.REPORT_SIGNERS, JSON.stringify(overrides));
  window.dispatchEvent(new Event('report-signers-updated'));
};

export const removeStoredReportSignerKeys = (roles: string[]) => {
  const current = getStoredReportSigners();
  roles.forEach((role) => {
    delete current[normalizeReportSignerRoleKey(role)];
  });
  saveStoredReportSigners(current);
};

export const getDefaultOfficerName = (
  role: 'admin' | 'sekretaris' | 'bendahara' | 'humas',
  fallback: string
): string => {
  if (role === 'admin') {
    const profileLead = getStoredMosqueProfile().leadPerson?.trim();
    if (profileLead) return profileLead;
  }
  try {
    const savedUsers = localStorage.getItem('sabiluna_managed_users');
    if (savedUsers) {
      const parsed = JSON.parse(savedUsers);
      if (Array.isArray(parsed)) {
        const matched = parsed.find((u: { role?: string; name?: string }) =>
          role === 'admin'
            ? u?.role === 'admin' || u?.role === 'super_admin'
            : u?.role === role
        );
        if (matched?.name && String(matched.name).trim() !== '') {
          return String(matched.name).trim();
        }
      }
    }
  } catch {
    // ignore storage errors
  }
  return fallback;
};
