import * as XLSX from 'xlsx';
import { Transaction, InventoryItem, Mustahik, Asnaf8, TransactionType, TransactionCategory, ItemCondition, IncomingLetter, OutgoingLetter } from '../types/index.ts';
import { getStoredMosqueProfile } from './storage.ts';

export interface ParseResult<T> {
  success: boolean;
  data: T[];
  errors: string[];
  totalRows: number;
  validRows: number;
}

// ======================== EXPORT FUNCTIONS ========================

/**
 * Export Financial Transactions to Excel (.xlsx)
 */
export const exportTransactionsToExcel = (
  transactions: Transaction[],
  mosqueName = getStoredMosqueProfile().name,
  filename = "Laporan_Keuangan_Masjid"
) => {
  const totalIn = transactions.filter(t => t.type === 'in').reduce((acc, t) => acc + t.amount, 0);
  const totalOut = transactions.filter(t => t.type === 'out').reduce((acc, t) => acc + t.amount, 0);
  const saldo = totalIn - totalOut;

  // Header info rows
  const headerData = [
    ['SYAMIL - SISTEM MANAJEMEN MASJID'],
    [`Laporan Buku Kas Umum - ${mosqueName}`],
    [`Dicetak pada: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}`],
    [''],
    ['RINGKASAN ARUS KAS:'],
    ['Total Pemasukan:', totalIn, 'IDR'],
    ['Total Pengeluaran:', totalOut, 'IDR'],
    ['Saldo Akhir Kas:', saldo, 'IDR'],
    [''],
    ['DAFTAR TRANSAKSI:']
  ];

  // Table rows
  const tableData = transactions.map((t, idx) => ({
    'No': idx + 1,
    'No. Kwitansi': t.receiptNumber,
    'Tanggal': t.date,
    'Tipe': t.type === 'in' ? 'Pemasukan' : 'Pengeluaran',
    'Kategori': t.category,
    'Uraian / Keterangan': t.description,
    'Pemberi / Donatur / Penerima': t.isAnonymous ? 'Hamba Allah' : (t.donorName || '-'),
    'Metode Bayar': t.paymentMethod,
    'Nominal Masuk (Rp)': t.type === 'in' ? t.amount : 0,
    'Nominal Keluar (Rp)': t.type === 'out' ? t.amount : 0,
    'Petugas Pencatat': t.createdBy,
  }));

  const worksheet = XLSX.utils.aoa_to_sheet(headerData);
  XLSX.utils.sheet_add_json(worksheet, tableData, { origin: 'A11' });

  // Set column widths
  worksheet['!cols'] = [
    { wch: 6 },  // No
    { wch: 16 }, // Kwitansi
    { wch: 14 }, // Tanggal
    { wch: 14 }, // Tipe
    { wch: 22 }, // Kategori
    { wch: 42 }, // Uraian
    { wch: 26 }, // Donatur
    { wch: 16 }, // Metode
    { wch: 18 }, // Masuk
    { wch: 18 }, // Keluar
    { wch: 26 }, // Petugas
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Buku Kas Masjid');
  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

/**
 * Export Inventory Items to Excel (.xlsx)
 */
export const exportInventoryToExcel = (
  items: InventoryItem[],
  mosqueName = getStoredMosqueProfile().name
) => {
  const totalValuation = items.reduce((acc, i) => acc + (i.estimatedValue * i.quantity), 0);
  const totalCount = items.reduce((acc, i) => acc + i.quantity, 0);

  const headerData = [
    ['SYAMIL - DAFTAR INVENTARIS & ASET MASJID'],
    [`Lokasi: ${mosqueName}`],
    [`Total Nilai Aset Terdaftar: Rp ${totalValuation.toLocaleString('id-ID')} | Total Unit: ${totalCount}`],
    ['']
  ];

  const tableData = items.map((item, idx) => ({
    'No': idx + 1,
    'Kode Aset': item.code,
    'Nama Barang / Aset': item.name,
    'Kategori': item.category,
    'Jumlah': item.quantity,
    'Satuan': item.unit,
    'Kondisi': item.condition,
    'Lokasi Penempatan': item.location,
    'Tgl Pengadaan': item.purchaseDate,
    'Taksiran Nilai Perolehan (Rp)': item.estimatedValue,
    'Catatan / Keterangan': item.notes || '-',
  }));

  const worksheet = XLSX.utils.aoa_to_sheet(headerData);
  XLSX.utils.sheet_add_json(worksheet, tableData, { origin: 'A5' });

  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 38 },
    { wch: 20 },
    { wch: 10 },
    { wch: 10 },
    { wch: 14 },
    { wch: 28 },
    { wch: 14 },
    { wch: 22 },
    { wch: 35 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventaris Masjid');
  XLSX.writeFile(workbook, `Inventaris_Masjid_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

/**
 * Export Mustahik 8 Asnaf registry to Excel (.xlsx)
 */
export const exportMustahikToExcel = (
  mustahikList: Mustahik[],
  mosqueName = getStoredMosqueProfile().name
) => {
  const headerData = [
    ['SYAMIL - BUKU DATA MUSTAHIK & PENERIMA MANFAAT 8 ASNAF'],
    [`Masjid: ${mosqueName}`],
    [`Total Terdaftar: ${mustahikList.length} Kepala Keluarga`],
    ['']
  ];

  const tableData = mustahikList.map((m, idx) => ({
    'No': idx + 1,
    'ID Mustahik': m.id,
    'Nama Kepala Keluarga': m.name,
    'NIK KTP': m.nik || '-',
    'No KK': m.noKK || '-',
    'Golongan 8 Asnaf': m.asnaf,
    'Jumlah Jiwa Tanggungan': m.familyDependents,
    'Alamat Lengkap': m.address,
    'RT / RW': m.rtRw || '-',
    'Nomor HP / WA': m.phone || '-',
    'Kondisi Ekonomi / Kebutuhan': m.economicCondition,
    'Total Bantuan Tunai (Rp)': m.totalAssistanceReceived || 0,
    'Total Beras (Kg)': m.totalRiceReceived || 0,
    'Bantuan Terakhir': m.lastAssistanceDate || '-',
    'Status Kelayakan': m.eligibilityStatus,
    'Catatan': m.notes || '-',
    'Tanggal Terdaftar': m.registeredAt,
  }));

  const worksheet = XLSX.utils.aoa_to_sheet(headerData);
  XLSX.utils.sheet_add_json(worksheet, tableData, { origin: 'A5' });

  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 28 },
    { wch: 20 },
    { wch: 20 },
    { wch: 16 },
    { wch: 14 },
    { wch: 35 },
    { wch: 14 },
    { wch: 18 },
    { wch: 35 },
    { wch: 16 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 25 },
    { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Mustahik');
  XLSX.writeFile(workbook, `Data_Mustahik_Masjid_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

/**
 * Export Incoming Letters (Buku Agenda Surat Masuk) to Excel (.xlsx)
 */
export const exportIncomingLettersToExcel = (
  letters: IncomingLetter[],
  mosqueName = getStoredMosqueProfile().name
) => {
  const headerData = [
    ['SYAMIL - SISTEM MANAJEMEN MASJID'],
    [`Buku Agenda Surat Masuk & Disposisi - ${mosqueName}`],
    [`Dicetak pada: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}`],
    [''],
    ['Total Surat Masuk:', letters.length, 'Surat'],
    [''],
    ['DAFTAR AGENDA SURAT MASUK:']
  ];

  const tableData = letters.map((l, idx) => ({
    'No': idx + 1,
    'No. Agenda': l.agendaNumber,
    'No. Surat Pengirim': l.letterNumber,
    'Asal Pengirim / Instansi': l.sender,
    'Perihal / Judul Surat': l.subject,
    'Kategori': l.category,
    'Tingkat Urgensi': l.urgency,
    'Tanggal Surat': l.letterDate,
    'Tanggal Terima': l.receivedDate,
    'Disposisi Kepada': l.dispositionTo,
    'Instruksi / Arahan Disposisi': l.dispositionInstruction,
    'Status Tindak Lanjut': l.status,
    'Ringkasan Isi': l.summary,
    'Lampiran Fisik/File': l.attachmentName || '-',
    'Catatan': l.notes || '-'
  }));

  const worksheet = XLSX.utils.aoa_to_sheet(headerData);
  XLSX.utils.sheet_add_json(worksheet, tableData, { origin: 'A8' });

  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 28 },
    { wch: 32 },
    { wch: 36 },
    { wch: 20 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 24 },
    { wch: 35 },
    { wch: 20 },
    { wch: 40 },
    { wch: 26 },
    { wch: 24 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Surat Masuk');
  XLSX.writeFile(workbook, `Buku_Agenda_Surat_Masuk_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

/**
 * Export Outgoing Letters (Buku Agenda Surat Keluar) to Excel (.xlsx)
 */
export const exportOutgoingLettersToExcel = (
  letters: OutgoingLetter[],
  mosqueName = getStoredMosqueProfile().name
) => {
  const headerData = [
    ['SYAMIL - SISTEM MANAJEMEN MASJID'],
    [`Buku Agenda Surat Keluar Resmi DKM - ${mosqueName}`],
    [`Dicetak pada: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}`],
    [''],
    ['Total Surat Keluar Diterbitkan:', letters.length, 'Surat'],
    [''],
    ['DAFTAR AGENDA SURAT KELUAR:']
  ];

  const tableData = letters.map((l, idx) => ({
    'No': idx + 1,
    'No. Surat Resmi DKM': l.letterNumber,
    'Jenis Surat': l.type,
    'Perihal / Judul Surat': l.title,
    'Tujuan / Kepada Yth': l.recipient,
    'Tanggal Terbit': l.date,
    'Penandatangan': l.signerName,
    'Jabatan Penandatangan': l.signerPosition,
    'Lampiran': l.attachmentInfo || '-',
    'Status': l.status,
    'Ringkasan / Isi Surat': l.content.slice(0, 150) + (l.content.length > 150 ? '...' : ''),
    'Catatan': l.notes || '-'
  }));

  const worksheet = XLSX.utils.aoa_to_sheet(headerData);
  XLSX.utils.sheet_add_json(worksheet, tableData, { origin: 'A8' });

  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 26 },
    { wch: 20 },
    { wch: 36 },
    { wch: 32 },
    { wch: 14 },
    { wch: 24 },
    { wch: 26 },
    { wch: 20 },
    { wch: 14 },
    { wch: 45 },
    { wch: 24 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Surat Keluar');
  XLSX.writeFile(workbook, `Buku_Agenda_Surat_Keluar_${new Date().toISOString().slice(0, 10)}.xlsx`);
};


// ======================== TEMPLATE GENERATION ========================

/**
 * Download sample Excel template for fast importing
 */
export type ExcelTemplateType = 'kas' | 'inventaris' | 'mustahik' | 'zakat' | 'surat_masuk' | 'surat_keluar';

/**
 * Download sample Excel template for fast importing
 */
export const downloadTemplate = (type: ExcelTemplateType) => {
  const workbook = XLSX.utils.book_new();

  if (type === 'kas') {
    const sampleData = [
      {
        'Tanggal (YYYY-MM-DD)': '2026-11-01',
        'Tipe (Pemasukan/Pengeluaran)': 'Pemasukan',
        'Kategori': 'Infaq Jumat',
        'Nominal (Angka tanpa titik)': 5000000,
        'Keterangan Transaksi': 'Kotak Infaq Jumat Awal Bulan',
        'Nama Donatur': 'Jamaah Sholat Jumat',
        'Anonim (Ya/Tidak)': 'Ya',
        'Metode (Tunai/Transfer Bank/QRIS)': 'Tunai',
      },
      {
        'Tanggal (YYYY-MM-DD)': '2026-11-02',
        'Tipe (Pemasukan/Pengeluaran)': 'Pengeluaran',
        'Kategori': 'Kebersihan & Sanitasi',
        'Nominal (Angka tanpa titik)': 450000,
        'Keterangan Transaksi': 'Beli cairan pembersih lantai & karbol',
        'Nama Donatur': 'Toko Berkah',
        'Anonim (Ya/Tidak)': 'Tidak',
        'Metode (Tunai/Transfer Bank/QRIS)': 'Tunai',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    ws['!cols'] = [{ wch: 16 }, { wch: 16 }, { wch: 22 }, { wch: 18 }, { wch: 35 }, { wch: 24 }, { wch: 14 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(workbook, ws, 'Template Kas');
    XLSX.writeFile(workbook, 'Template_Import_Kas_Masjid.xlsx');
  } else if (type === 'inventaris') {
    const sampleData = [
      {
        'Kode Aset': 'AST-NEW-01',
        'Nama Barang': 'Microphone Wireless Shure Beta',
        'Kategori': 'Elektronik & Sound',
        'Jumlah': 2,
        'Satuan': 'Unit',
        'Kondisi (Baik/Rusak Ringan/Rusak Berat)': 'Baik',
        'Lokasi Penempatan': 'Ruang Sound System',
        'Tgl Pengadaan (YYYY-MM-DD)': '2026-11-01',
        'Taksiran Nilai (Rp)': 3200000,
        'Catatan': 'Wakaf dari hamba Allah',
      },
      {
        'Kode Aset': 'AST-NEW-02',
        'Nama Barang': 'Karpet Sajadah Shaf Tebal Turki',
        'Kategori': 'Perlengkapan Ibadah',
        'Jumlah': 10,
        'Satuan': 'Gulung',
        'Kondisi (Baik/Rusak Ringan/Rusak Berat)': 'Baik',
        'Lokasi Penempatan': 'Ruang Utama Sholat',
        'Tgl Pengadaan (YYYY-MM-DD)': '2026-11-02',
        'Taksiran Nilai (Rp)': 25000000,
        'Catatan': 'Pengadaan kas renovasi masjid',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    ws['!cols'] = [{ wch: 14 }, { wch: 32 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 18 }, { wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(workbook, ws, 'Template Inventaris');
    XLSX.writeFile(workbook, 'Template_Import_Inventaris_Masjid.xlsx');
  } else if (type === 'mustahik') {
    const sampleData = [
      {
        'Nama Kepala Keluarga': 'Ibu Maryamah',
        'NIK KTP (16 Digit)': '3201155403720004',
        'No KK': '3201152001150012',
        'Golongan 8 Asnaf (Fakir/Miskin/Amil/Mualaf/Gharimin/Fisabilillah/Ibnu Sabil/Riqab)': 'Fakir',
        'Jumlah Tanggungan Jiwa': 4,
        'Alamat Lengkap': 'Gang Salak III No. 05, Kp. Sukamaju',
        'RT / RW': 'RT 01 / RW 05',
        'Nomor HP / WA': '085712349876',
        'Kondisi Ekonomi / Kebutuhan': 'Janda dhuafa lansia dengan 3 cucu yatim',
        'Status Kelayakan (Layak Terima/Dalam Peninjauan/Sudah Mandiri)': 'Layak Terima',
        'Catatan Khusus': 'Prioritas utama santunan sembako',
      },
      {
        'Nama Kepala Keluarga': 'Bpk. Suparno',
        'NIK KTP (16 Digit)': '3201151205780009',
        'No KK': '3201152001150024',
        'Golongan 8 Asnaf (Fakir/Miskin/Amil/Mualaf/Gharimin/Fisabilillah/Ibnu Sabil/Riqab)': 'Miskin',
        'Jumlah Tanggungan Jiwa': 3,
        'Alamat Lengkap': 'Jl. Melati No. 12 RT 03 RW 02',
        'RT / RW': 'RT 03 / RW 02',
        'Nomor HP / WA': '081298765432',
        'Kondisi Ekonomi / Kebutuhan': 'Buruh harian lepas dengan tanggungan anak sekolah',
        'Status Kelayakan (Layak Terima/Dalam Peninjauan/Sudah Mandiri)': 'Layak Terima',
        'Catatan Khusus': 'Bantuan biaya seragam sekolah & beras',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    ws['!cols'] = [{ wch: 28 }, { wch: 20 }, { wch: 20 }, { wch: 22 }, { wch: 14 }, { wch: 35 }, { wch: 14 }, { wch: 16 }, { wch: 35 }, { wch: 18 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(workbook, ws, 'Template Mustahik');
    XLSX.writeFile(workbook, 'Template_Import_Mustahik_Masjid.xlsx');
  } else if (type === 'zakat') {
    const sampleData = [
      {
        'Jenis Zakat (Zakat Fitrah/Zakat Maal/Fidyah/Infaq Ramadhan)': 'Zakat Fitrah',
        'Nama Muzakki': 'Ir. H. Muhammad Ridwan & Keluarga',
        'Jumlah Jiwa': 5,
        'Beras (Kg)': 12.5,
        'Uang Tunai (Rp)': 0,
        'Golongan Asnaf Target': 'Fakir',
        'Nama Penerima (Jika Ada)': 'Ibu Maryamah',
        'Status (Tersalurkan/Tersimpan di Amil)': 'Tersalurkan',
        'Keterangan / Catatan': 'Beras pandan wangi kualitas super',
      },
      {
        'Jenis Zakat (Zakat Fitrah/Zakat Maal/Fidyah/Infaq Ramadhan)': 'Zakat Fitrah',
        'Nama Muzakki': 'Drs. H. Bambang Sudirman',
        'Jumlah Jiwa': 4,
        'Beras (Kg)': 0,
        'Uang Tunai (Rp)': 180000,
        'Golongan Asnaf Target': 'Miskin',
        'Nama Penerima (Jika Ada)': 'Bpk. Suparno',
        'Status (Tersalurkan/Tersimpan di Amil)': 'Tersalurkan',
        'Keterangan / Catatan': 'Setara 4 jiwa @ Rp 45.000',
      },
      {
        'Jenis Zakat (Zakat Fitrah/Zakat Maal/Fidyah/Infaq Ramadhan)': 'Zakat Maal',
        'Nama Muzakki': 'H. Hendra Gunawan (Toko Barokah)',
        'Jumlah Jiwa': 1,
        'Beras (Kg)': 0,
        'Uang Tunai (Rp)': 15000000,
        'Golongan Asnaf Target': 'Fisabilillah',
        'Nama Penerima (Jika Ada)': 'Ustadz Ahmad Fauzi',
        'Status (Tersalurkan/Tersimpan di Amil)': 'Tersalurkan',
        'Keterangan / Catatan': 'Zakat perniagaan emas & saldo tabungan',
      },
      {
        'Jenis Zakat (Zakat Fitrah/Zakat Maal/Fidyah/Infaq Ramadhan)': 'Fidyah',
        'Nama Muzakki': 'Ibu Hj. Aminah',
        'Jumlah Jiwa': 1,
        'Beras (Kg)': 0,
        'Uang Tunai (Rp)': 450000,
        'Golongan Asnaf Target': 'Fakir',
        'Nama Penerima (Jika Ada)': 'Santunan Lansia Dhuafa',
        'Status (Tersalurkan/Tersimpan di Amil)': 'Tersimpan di Amil',
        'Keterangan / Catatan': 'Fidyah 15 hari puasa @ Rp 30.000',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    ws['!cols'] = [
      { wch: 28 },
      { wch: 32 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 },
      { wch: 22 },
      { wch: 26 },
      { wch: 24 },
      { wch: 36 },
    ];
    XLSX.utils.book_append_sheet(workbook, ws, 'Template Zakat');
    XLSX.writeFile(workbook, 'Template_Import_Zakat_Masjid.xlsx');
  } else if (type === 'surat_masuk') {
    const sampleData = [
      {
        'No. Agenda': 'AGD-2026-001',
        'No. Surat Pengirim': '400/12/Kec.Skl/X/2026',
        'Asal Pengirim / Instansi': 'Kecamatan Sukamaju',
        'Perihal / Judul Surat': 'Undangan Rakor Lintas Ormas & DKM Masjid',
        'Kategori (Edaran Resmi/Undangan/Permohonan Kerjasama/Pemberitahuan/Proposal Bantuan/Lainnya)': 'Undangan',
        'Tingkat Urgensi (Biasa/Penting/Kilat / Segera)': 'Penting',
        'Tanggal Surat (YYYY-MM-DD)': '2026-10-20',
        'Tanggal Terima (YYYY-MM-DD)': '2026-10-22',
        'Disposisi Kepada': 'Ketua Umum DKM & Sekretaris',
        'Instruksi / Arahan Disposisi': 'Hadir dan wakili pengurus DKM tepat waktu',
        'Status Tindak Lanjut (Belum Diproses/Didisposisikan/Selesai Ditindaklanjuti/Diarsipkan)': 'Didisposisikan',
        'Ringkasan Isi': 'Rapat koordinasi persiapan safari Ramadhan dan pembinaan remaja masjid se-kecamatan.',
        'Catatan': 'Membawa buku panduan kegiatan DKM',
      },
      {
        'No. Agenda': 'AGD-2026-002',
        'No. Surat Pengirim': '018/PRM-SKM/XI/2026',
        'Asal Pengirim / Instansi': 'Panitia Remaja Masjid Al-Ikhlas',
        'Perihal / Judul Surat': 'Permohonan Peminjaman Sound System & Mimbar',
        'Kategori (Edaran Resmi/Undangan/Permohonan Kerjasama/Pemberitahuan/Proposal Bantuan/Lainnya)': 'Permohonan Kerjasama',
        'Tingkat Urgensi (Biasa/Penting/Kilat / Segera)': 'Biasa',
        'Tanggal Surat (YYYY-MM-DD)': '2026-11-01',
        'Tanggal Terima (YYYY-MM-DD)': '2026-11-02',
        'Disposisi Kepada': 'Koordinator Seksi Sarana & Prasarana',
        'Instruksi / Arahan Disposisi': 'Cek ketersediaan aset dan buatkan surat tanda terima',
        'Status Tindak Lanjut (Belum Diproses/Didisposisikan/Selesai Ditindaklanjuti/Diarsipkan)': 'Didisposisikan',
        'Ringkasan Isi': 'Peminjaman inventaris untuk kegiatan Tabligh Akbar pemuda.',
        'Catatan': 'Wajib dikembalikan dalam keadaan bersih dan berfungsi normal',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    ws['!cols'] = [
      { wch: 16 },
      { wch: 26 },
      { wch: 30 },
      { wch: 38 },
      { wch: 22 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 28 },
      { wch: 36 },
      { wch: 22 },
      { wch: 42 },
      { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(workbook, ws, 'Template Surat Masuk');
    XLSX.writeFile(workbook, 'Template_Agenda_Surat_Masuk.xlsx');
  } else if (type === 'surat_keluar') {
    const sampleData = [
      {
        'No. Surat Resmi DKM': '045/DKM-ALB/UND/XI/2026',
        'Jenis Surat (Surat Undangan/Surat Permohonan/Surat Keterangan/Surat Tugas/Surat Keputusan (SK)/Surat Pemberitahuan)': 'Surat Undangan',
        'Perihal / Judul Surat': 'Undangan Rapat Evaluasi Panitia Pembangunan & Renovasi Kubah',
        'Tujuan / Kepada Yth': 'Seluruh Pengurus DKM & Tokoh Warga RW 05',
        'Tanggal Terbit (YYYY-MM-DD)': '2026-11-02',
        'Penandatangan': 'H. Sulaiman Al-Habsyi',
        'Jabatan Penandatangan': 'Ketua Umum DKM',
        'Status (Diterbitkan/Konsep/Terkirim)': 'Diterbitkan',
        'Ringkasan / Isi Surat': 'Mengharap kehadiran Bapak/Ibu pengurus dalam agenda rapat evaluasi progres pembangunan lantai 2 masjid pada hari Ahad pukul 20.00 WIB.',
        'Catatan': 'Konfirmasi kehadiran melalui WhatsApp sekretariat',
      },
      {
        'No. Surat Resmi DKM': '046/DKM-ALB/KET/XI/2026',
        'Jenis Surat (Surat Undangan/Surat Permohonan/Surat Keterangan/Surat Tugas/Surat Keputusan (SK)/Surat Pemberitahuan)': 'Surat Keterangan',
        'Perihal / Judul Surat': 'Surat Keterangan Aktif Mengajar Guru TPA/TPQ',
        'Tujuan / Kepada Yth': 'Kementerian Agama Kota / Bagian Bimas Islam',
        'Tanggal Terbit (YYYY-MM-DD)': '2026-11-04',
        'Penandatangan': 'H. Sulaiman Al-Habsyi',
        'Jabatan Penandatangan': 'Ketua Umum DKM',
        'Status (Diterbitkan/Konsep/Terkirim)': 'Diterbitkan',
        'Ringkasan / Isi Surat': 'Menerangkan bahwa nama terlampir aktif sebagai pengajar Al-Quran di TPQ Masjid Al-Barkah sejak tahun 2023.',
        'Catatan': 'Dipergunakan untuk pendaftaran sertifikasi guru mengaji',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    ws['!cols'] = [
      { wch: 26 },
      { wch: 22 },
      { wch: 38 },
      { wch: 34 },
      { wch: 16 },
      { wch: 24 },
      { wch: 22 },
      { wch: 16 },
      { wch: 45 },
      { wch: 32 },
    ];
    XLSX.utils.book_append_sheet(workbook, ws, 'Template Surat Keluar');
    XLSX.writeFile(workbook, 'Template_Agenda_Surat_Keluar.xlsx');
  }
};

// ======================== IMPORT & PARSING FUNCTIONS ========================

/**
 * Parse uploaded Excel or CSV file for Cash Flow / Transactions
 */
export const parseTransactionsExcel = async (
  file: File,
  currentUser = 'Bendahara DKM'
): Promise<ParseResult<Transaction>> => {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        const errors: string[] = [];
        const parsed: Transaction[] = [];

        rawJson.forEach((row, index) => {
          const rowNum = index + 2; // account for header
          // Field resolution flexible with multiple variations of column names
          const dateRaw = row['Tanggal (YYYY-MM-DD)'] || row['Tanggal'] || row['Date'] || '';
          const typeRaw = (row['Tipe (Pemasukan/Pengeluaran)'] || row['Tipe'] || row['Type'] || '').toString().toLowerCase();
          const categoryRaw = row['Kategori'] || row['Category'] || 'Infaq Jumat';
          const nominalRaw = row['Nominal (Angka tanpa titik)'] || row['Nominal'] || row['Jumlah'] || row['Nominal Masuk (Rp)'] || row['Nominal Keluar (Rp)'] || 0;
          const descRaw = row['Keterangan Transaksi'] || row['Uraian / Keterangan'] || row['Keterangan'] || row['Deskripsi'] || '';
          const donorRaw = row['Nama Donatur'] || row['Pemberi / Donatur / Penerima'] || row['Donatur'] || '';
          const anonRaw = (row['Anonim (Ya/Tidak)'] || row['Anonim'] || '').toString().toLowerCase();
          const methodRaw = row['Metode (Tunai/Transfer Bank/QRIS)'] || row['Metode Bayar'] || row['Metode'] || 'Tunai';

          // Basic validation
          let amount = Number(String(nominalRaw).replace(/[^0-9.-]+/g, ''));
          if (isNaN(amount) || amount <= 0) {
            errors.push(`Baris ${rowNum}: Nominal tidak valid (${nominalRaw})`);
            return;
          }

          let type: TransactionType = 'in';
          if (typeRaw.includes('keluar') || typeRaw.includes('out') || typeRaw.includes('pengeluaran')) {
            type = 'out';
          }

          let dateStr = '';
          if (dateRaw instanceof Date) {
            dateStr = dateRaw.toISOString().slice(0, 10);
          } else if (typeof dateRaw === 'string' && dateRaw.trim().length >= 8) {
            dateStr = dateRaw.trim();
          } else {
            dateStr = new Date().toISOString().slice(0, 10);
          }

          const isAnonymous = anonRaw.includes('ya') || anonRaw.includes('yes') || anonRaw === 'true' || donorRaw.toLowerCase().includes('hamba allah');

          const now = new Date();
          const uniqueId = `TRX-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}-${rowNum}`;
          const receipt = `${type === 'in' ? 'KAS-IN' : 'KAS-OUT'}-${Math.floor(1000 + Math.random() * 9000)}`;

          parsed.push({
            id: uniqueId,
            type,
            category: (categoryRaw || 'Lain-lain') as TransactionCategory,
            amount,
            date: dateStr,
            description: descRaw || (type === 'in' ? 'Pemasukan Kas' : 'Pengeluaran Kas'),
            donorName: donorRaw || (isAnonymous ? 'Hamba Allah' : 'Jamaah'),
            isAnonymous,
            paymentMethod: (methodRaw as any) || 'Tunai',
            receiptNumber: receipt,
            encryptedNominal: `aes256:${Math.random().toString(36).substring(2, 10)}...enc`,
            createdBy: currentUser,
            createdAt: new Date().toISOString(),
          });
        });

        resolve({
          success: errors.length === 0,
          data: parsed,
          errors,
          totalRows: rawJson.length,
          validRows: parsed.length,
        });
      } catch (err: any) {
        resolve({
          success: false,
          data: [],
          errors: [`Gagal memproses berkas Excel: ${err?.message || 'Format tidak didukung'}`],
          totalRows: 0,
          validRows: 0,
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        data: [],
        errors: ['Gagal membaca berkas Excel. Silakan periksa kembali file Anda.'],
        totalRows: 0,
        validRows: 0,
      });
    };

    reader.readAsBinaryString(file);
  });
};

/**
 * Parse uploaded Excel or CSV file for Inventory
 */
export const parseInventoryExcel = async (file: File): Promise<ParseResult<InventoryItem>> => {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: 'binary', cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawJson: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        const errors: string[] = [];
        const parsed: InventoryItem[] = [];

        rawJson.forEach((row, index) => {
          const rowNum = index + 2;
          const code = row['Kode Aset'] || `AST-${Math.floor(100 + Math.random() * 900)}`;
          const name = row['Nama Barang'] || row['Nama Barang / Aset'] || row['Nama'] || '';
          const category = row['Kategori'] || 'Lainnya';
          const qtyRaw = row['Jumlah'] || row['Qty'] || 1;
          const unit = row['Satuan'] || 'Unit';
          const condRaw = row['Kondisi (Baik/Rusak Ringan/Rusak Berat)'] || row['Kondisi'] || 'Baik';
          const location = row['Lokasi Penempatan'] || row['Lokasi'] || 'Gudang Masjid';
          const dateRaw = row['Tgl Pengadaan (YYYY-MM-DD)'] || row['Tgl Pengadaan'] || new Date().toISOString().slice(0, 10);
          const valueRaw = row['Taksiran Nilai (Rp)'] || row['Taksiran Nilai Perolehan (Rp)'] || row['Nilai'] || 0;
          const notes = row['Catatan'] || row['Catatan / Keterangan'] || '';

          if (!name || name.trim() === '') {
            errors.push(`Baris ${rowNum}: Nama Barang wajib diisi.`);
            return;
          }

          let condition: ItemCondition = 'Baik';
          if (String(condRaw).toLowerCase().includes('berat')) condition = 'Rusak Berat';
          else if (String(condRaw).toLowerCase().includes('ringan')) condition = 'Rusak Ringan';

          let quantity = parseInt(String(qtyRaw), 10);
          if (isNaN(quantity) || quantity <= 0) quantity = 1;

          let value = Number(String(valueRaw).replace(/[^0-9.-]+/g, '')) || 0;

          parsed.push({
            id: `INV-${Date.now()}-${rowNum}`,
            code: String(code).trim(),
            name: String(name).trim(),
            category: category as any,
            quantity,
            unit: String(unit).trim(),
            condition,
            location: String(location).trim(),
            purchaseDate: typeof dateRaw === 'string' ? dateRaw : new Date().toISOString().slice(0, 10),
            estimatedValue: value,
            notes: notes ? String(notes).trim() : undefined,
            updatedAt: new Date().toISOString().slice(0, 10),
          });
        });

        resolve({
          success: errors.length === 0,
          data: parsed,
          errors,
          totalRows: rawJson.length,
          validRows: parsed.length,
        });
      } catch (err: any) {
        resolve({
          success: false,
          data: [],
          errors: [`Gagal memproses file inventaris: ${err?.message || 'Format tidak valid'}`],
          totalRows: 0,
          validRows: 0,
        });
      }
    };

    reader.readAsBinaryString(file);
  });
};

/**
 * Parse uploaded Excel or CSV file for Mustahik 8 Asnaf
 */
export const parseMustahikExcel = async (file: File): Promise<ParseResult<Mustahik>> => {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawJson: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        const errors: string[] = [];
        const parsed: Mustahik[] = [];

        rawJson.forEach((row, index) => {
          const rowNum = index + 2;
          const name = row['Nama Kepala Keluarga'] || row['Nama Lengkap'] || row['Nama'] || '';
          const nik = row['NIK KTP (16 Digit)'] || row['NIK'] || '';
          const noKK = row['No KK'] || row['Nomor KK'] || '';
          const asnafRaw = row['Golongan 8 Asnaf (Fakir/Miskin/Amil/Mualaf/Gharimin/Fisabilillah/Ibnu Sabil/Riqab)'] || row['Golongan Asnaf'] || row['Asnaf'] || 'Miskin';
          const familyRaw = row['Jumlah Tanggungan Jiwa'] || row['Jumlah Jiwa'] || row['Tanggungan'] || 1;
          const address = row['Alamat Lengkap'] || row['Alamat'] || 'Lingkungan Masjid';
          const rtRw = row['RT / RW'] || row['RTRW'] || 'RT 01 / RW 01';
          const phone = row['Nomor HP / WA'] || row['Nomor HP'] || row['HP'] || row['Telepon'] || '';
          const economicCondition = row['Kondisi Ekonomi / Kebutuhan'] || row['Kondisi Ekonomi'] || 'Memerlukan bantuan sembako / santunan';
          const statusRaw = row['Status Kelayakan (Layak Terima/Dalam Peninjauan/Sudah Mandiri)'] || row['Status Kelayakan'] || 'Layak Terima';
          const notes = row['Catatan Khusus'] || row['Catatan'] || '';

          if (!name || name.trim() === '') {
            errors.push(`Baris ${rowNum}: Nama Kepala Keluarga wajib diisi.`);
            return;
          }

          let asnaf: Asnaf8 = 'Miskin';
          const asnafStr = String(asnafRaw).toLowerCase();
          if (asnafStr.includes('fakir')) asnaf = 'Fakir';
          else if (asnafStr.includes('fisabilillah')) asnaf = 'Fisabilillah';
          else if (asnafStr.includes('mualaf')) asnaf = 'Mualaf';
          else if (asnafStr.includes('gharim')) asnaf = 'Gharimin';
          else if (asnafStr.includes('amil')) asnaf = 'Amil';
          else if (asnafStr.includes('ibnu')) asnaf = 'Ibnu Sabil';
          else if (asnafStr.includes('riqab')) asnaf = 'Riqab';

          let eligibilityStatus: Mustahik['eligibilityStatus'] = 'Layak Terima';
          const stStr = String(statusRaw).toLowerCase();
          if (stStr.includes('tinjau') || stStr.includes('survei')) eligibilityStatus = 'Dalam Peninjauan';
          else if (stStr.includes('mandiri')) eligibilityStatus = 'Sudah Mandiri';

          parsed.push({
            id: `MST-${Date.now()}-${rowNum}`,
            name: String(name).trim(),
            nik: nik ? String(nik).trim() : undefined,
            noKK: noKK ? String(noKK).trim() : undefined,
            asnaf,
            familyDependents: Number(familyRaw) || 1,
            address: String(address).trim(),
            rtRw: String(rtRw).trim(),
            phone: String(phone).trim(),
            economicCondition: String(economicCondition).trim(),
            eligibilityStatus,
            totalAssistanceReceived: 0,
            totalRiceReceived: 0,
            notes: notes ? String(notes).trim() : undefined,
            registeredAt: new Date().toISOString().slice(0, 10),
          });
        });

        resolve({
          success: errors.length === 0,
          data: parsed,
          errors,
          totalRows: rawJson.length,
          validRows: parsed.length,
        });
      } catch (err: any) {
        resolve({
          success: false,
          data: [],
          errors: [`Gagal memproses file data mustahik: ${err?.message || 'Format tidak valid'}`],
          totalRows: 0,
          validRows: 0,
        });
      }
    };

    reader.readAsBinaryString(file);
  });
};

/**
 * Parse uploaded Excel or CSV file for Zakat Records
 */
export const parseZakatExcel = async (file: File): Promise<ParseResult<any>> => {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawJson: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        const errors: string[] = [];
        const parsed: any[] = [];

        rawJson.forEach((row, index) => {
          const rowNum = index + 2;
          const typeRaw = row['Jenis Zakat (Zakat Fitrah/Zakat Maal/Fidyah/Infaq Ramadhan)'] || row['Jenis Zakat'] || row['Tipe'] || 'Zakat Fitrah';
          const muzakki = row['Nama Muzakki'] || row['Nama'] || '';
          const familyCount = Number(row['Jumlah Jiwa'] || row['Jiwa'] || 1) || 1;
          const riceKg = Number(row['Beras (Kg)'] || row['Beras'] || 0) || 0;
          const cashAmount = Number(String(row['Uang Tunai (Rp)'] || row['Uang Tunai'] || row['Nominal'] || 0).replace(/[^0-9.-]+/g, '')) || 0;
          const asnafTarget = row['Golongan Asnaf Target'] || row['Golongan Asnaf'] || row['Asnaf'] || 'Fakir';
          const recipientName = row['Nama Penerima (Jika Ada)'] || row['Penerima (Mustahik)'] || row['Penerima'] || '';
          const statusRaw = row['Status (Tersalurkan/Tersimpan di Amil)'] || row['Status'] || 'Tersimpan di Amil';
          const notes = row['Keterangan / Catatan'] || row['Catatan'] || '';

          if (!muzakki || !String(muzakki).trim()) {
            errors.push(`Baris ${rowNum}: Nama Muzakki wajib diisi.`);
            return;
          }

          let type = 'Zakat Fitrah';
          const tLower = String(typeRaw).toLowerCase();
          if (tLower.includes('maal')) type = 'Zakat Maal';
          else if (tLower.includes('fidyah')) type = 'Fidyah';
          else if (tLower.includes('infaq')) type = 'Infaq Ramadhan';

          let status = 'Tersimpan di Amil';
          if (String(statusRaw).toLowerCase().includes('salur')) {
            status = 'Tersalurkan';
          }

          parsed.push({
            id: `ZKT-${Date.now().toString().slice(-4)}-${rowNum}`,
            receiptNumber: `ZKT-${Math.floor(100 + Math.random() * 900)}`,
            type,
            muzakkiName: String(muzakki).trim(),
            familyCount,
            riceKg,
            cashAmount,
            asnafTarget,
            recipientName: recipientName ? String(recipientName).trim() : undefined,
            status,
            date: new Date().toISOString().slice(0, 10),
            notes: notes ? String(notes).trim() : undefined,
          });
        });

        resolve({
          success: errors.length === 0,
          data: parsed,
          errors,
          totalRows: rawJson.length,
          validRows: parsed.length,
        });
      } catch (err: any) {
        resolve({
          success: false,
          data: [],
          errors: [`Gagal memproses file zakat: ${err?.message || 'Format tidak valid'}`],
          totalRows: 0,
          validRows: 0,
        });
      }
    };

    reader.readAsBinaryString(file);
  });
};

