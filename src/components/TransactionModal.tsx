import React, { useState, useEffect } from 'react';
import { X, Check, Wallet, ArrowDownRight, ArrowUpRight, Lock } from 'lucide-react';
import { Transaction, TransactionType, TransactionCategory } from '../types/index.ts';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (trx: Omit<Transaction, 'id' | 'createdAt'>, editId?: string) => void;
  editItem?: Transaction | null;
  currentUser: string;
}

const CATEGORIES_IN: TransactionCategory[] = [
  'Infaq Jumat',
  'Zakat Maal',
  'Zakat Fitrah',
  'Wakaf Tunai',
  'Donasi Renovasi',
  'Kotak Amal Harian',
  'Sponsor Kegiatan',
  'Lain-lain',
];

const CATEGORIES_OUT: TransactionCategory[] = [
  'Operasional Rutin',
  'Kebersihan & Sanitasi',
  'Listrik, Air & Internet',
  'Honor Ustadz & Khotib',
  'Santunan Anak Yatim & Dhuafa',
  'Perawatan Bangunan',
  'Lain-lain',
];

const getLocalDateString = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editItem,
  currentUser,
}) => {
  const [type, setType] = useState<TransactionType>('in');
  const [category, setCategory] = useState<TransactionCategory>('Infaq Jumat');
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState<string>(getLocalDateString);
  const [description, setDescription] = useState('');
  const [donorName, setDonorName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Tunai' | 'Transfer Bank' | 'QRIS' | 'Cek'>('Tunai');
  const [receiptNumber, setReceiptNumber] = useState('');

  useEffect(() => {
    if (editItem) {
      setType(editItem.type);
      setCategory(editItem.category);
      setAmount(editItem.amount);
      setDate(editItem.date);
      setDescription(editItem.description);
      setDonorName(editItem.donorName || '');
      setIsAnonymous(!!editItem.isAnonymous);
      setPaymentMethod(editItem.paymentMethod);
      setReceiptNumber(editItem.receiptNumber);
    } else {
      setType('in');
      setCategory('Infaq Jumat');
      setAmount('');
      setDate(getLocalDateString());
      setDescription('');
      setDonorName('');
      setIsAnonymous(false);
      setPaymentMethod('Tunai');
      setReceiptNumber(`KAS-IN-${Math.floor(1000 + Math.random() * 9000)}`);
    }
  }, [editItem, isOpen]);

  // Sync category default when type flips
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'in') {
      setCategory('Infaq Jumat');
      if (!editItem) setReceiptNumber(`KAS-IN-${Math.floor(1000 + Math.random() * 9000)}`);
    } else {
      setCategory('Operasional Rutin');
      if (!editItem) setReceiptNumber(`KAS-OUT-${Math.floor(1000 + Math.random() * 9000)}`);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    onSave(
      {
        type,
        category,
        amount: Number(amount),
        date,
        description: description.trim() || (type === 'in' ? 'Pemasukan Kas' : 'Pengeluaran Kas'),
        donorName: isAnonymous ? 'Hamba Allah' : donorName.trim() || 'Hamba Allah',
        isAnonymous,
        paymentMethod,
        receiptNumber: receiptNumber || `KAS-${Date.now().toString().slice(-4)}`,
        encryptedNominal: `aes256:${Math.random().toString(36).substring(2, 8)}...enc`,
        createdBy: currentUser,
      },
      editItem?.id
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${
              type === 'in' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
            }`}>
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editItem ? 'Edit Transaksi Kas Masjid' : 'Catat Transaksi Kas Baru'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pencatatan akurat, transparan & amanah
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Transaction Type Tabs */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
              Jenis Transaksi:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => handleTypeChange('in')}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                  type === 'in'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <ArrowDownRight className="w-4 h-4" />
                Pemasukan (Infaq / Zakat / Wakaf)
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('out')}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                  type === 'out'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                Pengeluaran (Operasional / Santunan)
              </button>
            </div>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Nominal (Rupiah) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Contoh: 500000"
                  className="w-full pl-9 pr-3 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Tanggal Transaksi <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Category & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Kategori <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TransactionCategory)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                {(type === 'in' ? CATEGORIES_IN : CATEGORIES_OUT).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Metode Pembayaran
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="Tunai">Tunai (Kotak Kas / Amplop)</option>
                <option value="Transfer Bank">Transfer Bank (BSI / Muamalat / Lainnya)</option>
                <option value="QRIS">QRIS Masjid</option>
                <option value="Cek">Cek / Bilyet Giro</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Uraian / Keterangan Transaksi <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Infaq kotak jumat selasar barat & pengimaman"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Donor Name & Anonymous Toggle */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {type === 'in' ? 'Pemberi / Donatur:' : 'Penerima / Vendor:'}
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <Lock className="w-3 h-3 text-slate-400" />
                Anonim / Hamba Allah
              </label>
            </div>

            <input
              type="text"
              disabled={isAnonymous}
              value={isAnonymous ? 'Hamba Allah (Identitas Dirahasiakan)' : donorName}
              onChange={(e) => setDonorName(e.target.value)}
              placeholder="Contoh: H. Ahmad Muzammil atau Toko Bangunan Berkah"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:text-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Receipt Number */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 px-1">
            <span>No. Kwitansi / Bukti: <strong className="font-mono text-slate-700 dark:text-slate-200">{receiptNumber}</strong></span>
            <span>Pencatat: {currentUser}</span>
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex flex-wrap items-center justify-end gap-2 sm:gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20"
            >
              <Check className="w-4 h-4" />
              {editItem ? 'Simpan Perubahan' : 'Catat Transaksi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
