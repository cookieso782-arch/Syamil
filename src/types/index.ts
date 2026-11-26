export type Role = 'admin' | 'sekretaris' | 'bendahara' | 'humas' | 'super_admin' | 'marbot' | 'jamaah';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  roleLabel: string;
  phone?: string;
  avatar?: string;
}

export type TransactionType = 'in' | 'out';

export type TransactionCategory =
  | 'Infaq Jumat'
  | 'Zakat Maal'
  | 'Zakat Fitrah'
  | 'Wakaf Tunai'
  | 'Donasi Renovasi'
  | 'Kotak Amal Harian'
  | 'Sponsor Kegiatan'
  | 'Operasional Rutin'
  | 'Kebersihan & Sanitasi'
  | 'Listrik, Air & Internet'
  | 'Honor Ustadz & Khotib'
  | 'Santunan Anak Yatim & Dhuafa'
  | 'Perawatan Bangunan'
  | 'Lain-lain';

export interface Transaction {
  id: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  date: string; // YYYY-MM-DD
  description: string;
  donorName?: string;
  isAnonymous?: boolean;
  paymentMethod: 'Tunai' | 'Transfer Bank' | 'QRIS' | 'Cek';
  receiptNumber: string;
  encryptedNominal?: string; // Simulation of AES-256 for secure storage
  createdBy: string;
  createdAt: string;
}

export type ItemCondition = 'Baik' | 'Rusak Ringan' | 'Rusak Berat';

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category: 'Elektronik & Sound' | 'Perlengkapan Ibadah' | 'Kebersihan' | 'Mebel & Ruang' | 'Lainnya';
  quantity: number;
  unit: string;
  condition: ItemCondition;
  location: string;
  purchaseDate: string;
  estimatedValue: number;
  notes?: string;
  updatedAt: string;
}

export type Asnaf8 = 'Fakir' | 'Miskin' | 'Amil' | 'Mualaf' | 'Riqab' | 'Gharimin' | 'Fisabilillah' | 'Ibnu Sabil';

export interface Mustahik {
  id: string;
  name: string;
  nik?: string;
  noKK?: string;
  asnaf: Asnaf8;
  address: string;
  rtRw?: string;
  phone: string;
  familyDependents: number;
  economicCondition: string;
  eligibilityStatus: 'Layak Terima' | 'Dalam Peninjauan' | 'Sudah Mandiri';
  totalAssistanceReceived?: number;
  totalRiceReceived?: number;
  lastAssistanceDate?: string;
  notes?: string;
  registeredAt: string;
}

export interface MosqueEvent {
  id: string;
  title: string;
  speaker: string;
  date: string;
  time: string;
  location: string;
  category: 'Kajian Rutin' | 'Sholat Jumat' | 'Peringatan Hari Besar' | 'Baksos & Santunan' | 'Rapat DKM' | 'Pelatihan Remaja';
  status: 'Akan Datang' | 'Sedang Berlangsung' | 'Selesai';
}

export type ThemeTemplate = 'emerald' | 'sapphire' | 'minimal' | 'sand';
export type TextSize = 'normal' | 'large' | 'xlarge';

export interface JWTPayload {
  sub: string;
  name: string;
  email: string;
  role: Role;
  iat: number;
  exp: number;
  iss: string;
}

export interface SecurityConfig {
  neonDbHost: string;
  neonDbPort: number;
  neonDbName: string;
  neonDbUser: string;
  sslMode: 'require' | 'verify-full' | 'disable';
  jwtSecretMasked: string;
  tokenExpiresIn: string;
  antiSqlInjectionActive: boolean;
  aes256EncryptionActive: boolean;
}

export interface IncomingLetter {
  id: string;
  agendaNumber: string;
  letterNumber: string;
  sender: string;
  subject: string;
  category: 'Edaran Resmi' | 'Undangan' | 'Permohonan Kerjasama' | 'Pemberitahuan' | 'Proposal Bantuan' | 'Lainnya';
  letterDate: string;
  receivedDate: string;
  urgency: 'Biasa' | 'Penting' | 'Kilat / Segera';
  dispositionTo: string;
  dispositionInstruction: string;
  status: 'Belum Diproses' | 'Didisposisikan' | 'Selesai Ditindaklanjuti' | 'Diarsipkan';
  summary: string;
  attachmentName?: string;
  notes?: string;
  createdAt?: string;
}

export interface OutgoingLetter {
  id: string;
  letterNumber: string;
  type: 'Surat Undangan' | 'Surat Permohonan' | 'Surat Keterangan' | 'Surat Tugas' | 'Surat Keputusan (SK)' | 'Surat Pemberitahuan';
  title: string;
  recipient: string;
  date: string;
  content: string;
  signerName: string;
  signerPosition: string;
  status: 'Diterbitkan' | 'Konsep' | 'Terkirim';
  attachmentInfo?: string;
  notes?: string;
  createdAt?: string;
}

export interface MosqueProfile {
  name: string;
  simasNumber?: string;
  foundedYear?: string;
  address?: string;
  city?: string;
  phone?: string;
  adminPhone?: string;
  email?: string;
  leadPerson?: string;
  bankBSI?: string;
  bankAccountName?: string;
  qrisMerchant?: string;
  portalBadge?: string;
  portalDescription?: string;
  portalFeature1Title?: string;
  portalFeature1Desc?: string;
  portalFeature2Title?: string;
  portalFeature2Desc?: string;
  portalFeature3Title?: string;
  portalFeature3Desc?: string;
  footerBrandTitle?: string;
  footerBrandSubtitle?: string;
  loginFooterCenter?: string;
}

export interface FridayKajianItem {
  id: string;
  type: 'Khutbah Jumat' | 'Kajian Rutin' | 'Kajian Akhwat' | 'Tahsin Al-Quran';
  title: string;
  speaker: string;
  imam?: string;
  muadzin?: string;
  date: string;
  time: string;
  location: string;
  status: 'Akan Datang' | 'Selesai';
  notes?: string;
}

export interface ZakatRecord {
  id: string;
  type: 'Zakat Fitrah' | 'Zakat Maal' | 'Fidyah' | 'Infaq Ramadhan';
  muzakkiName: string;
  familyCount: number;
  riceKg: number;
  cashAmount: number;
  asnafTarget?: string;
  recipientName?: string;
  status: 'Tersalurkan' | 'Tersimpan di Amil';
  date: string;
  receiptNumber: string;
  notes?: string;
}
