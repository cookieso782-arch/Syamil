import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Boxes } from 'lucide-react';
import { InventoryItem, ItemCondition } from '../types/index.ts';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<InventoryItem, 'id' | 'updatedAt'>, editId?: string) => void;
  editItem?: InventoryItem | null;
}

const UNIT_OPTIONS = [
  'Unit',
  'Buah',
  'Set',
  'Roll',
  'Dus / Box',
  'Paket',
  'Lembar',
  'Pasang',
  'Meter',
  'Batang',
  'Lainnya',
];

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editItem,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<InventoryItem['category']>('Elektronik & Sound');
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [unit, setUnit] = useState('Unit');
  const [selectedUnitType, setSelectedUnitType] = useState('Unit');
  const [customUnit, setCustomUnit] = useState('');
  const [condition, setCondition] = useState<ItemCondition>('Baik');
  const [location, setLocation] = useState('Ruang Sholat Utama');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [estimatedValue, setEstimatedValue] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const customInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedUnitType === 'Lainnya') {
      const timer = setTimeout(() => {
        customInputRef.current?.focus();
        customInputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [selectedUnitType]);

  useEffect(() => {
    if (editItem) {
      setCode(editItem.code);
      setName(editItem.name);
      setCategory(editItem.category);
      setQuantity(editItem.quantity);
      setCondition(editItem.condition);
      setLocation(editItem.location);
      setPurchaseDate(editItem.purchaseDate);
      setEstimatedValue(editItem.estimatedValue);
      setNotes(editItem.notes || '');

      const isPreset = UNIT_OPTIONS.filter((u) => u !== 'Lainnya').includes(editItem.unit);
      if (isPreset) {
        setSelectedUnitType(editItem.unit);
        setUnit(editItem.unit);
        setCustomUnit('');
      } else {
        setSelectedUnitType('Lainnya');
        setUnit(editItem.unit);
        setCustomUnit(editItem.unit);
      }
    } else {
      setCode(`AST-${Math.floor(100 + Math.random() * 900)}`);
      setName('');
      setCategory('Elektronik & Sound');
      setQuantity(1);
      setUnit('Unit');
      setSelectedUnitType('Unit');
      setCustomUnit('');
      setCondition('Baik');
      setLocation('Ruang Sholat Utama');
      setPurchaseDate(new Date().toISOString().slice(0, 10));
      setEstimatedValue('');
      setNotes('');
    }
  }, [editItem, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalUnit = selectedUnitType === 'Lainnya' ? (customUnit.trim() || 'Unit') : selectedUnitType;

    onSave(
      {
        code: code.trim() || `AST-${Date.now().toString().slice(-4)}`,
        name: name.trim(),
        category,
        quantity: Number(quantity) || 1,
        unit: finalUnit,
        condition,
        location: location.trim() || 'Gudang Masjid',
        purchaseDate,
        estimatedValue: Number(estimatedValue) || 0,
        notes: notes.trim() || undefined,
      },
      editItem?.id
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]">
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editItem ? 'Edit Aset / Inventaris' : 'Tambah Aset / Inventaris Baru'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Data perlengkapan dan sarana masjid
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Kode Aset / Barcode <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Kategori <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="Elektronik & Sound">Elektronik & Sound</option>
                <option value="Perlengkapan Ibadah">Perlengkapan Ibadah</option>
                <option value="Kebersihan">Kebersihan & Sanitasi</option>
                <option value="Mebel & Ruang">Mebel & Ruang</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Nama Barang / Aset <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: AC Standing Daikin 5 PK"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Jumlah <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Satuan <span className="text-rose-500">*</span>
              </label>
              <div className="space-y-1.5">
                <select
                  value={selectedUnitType}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedUnitType(val);
                    if (val !== 'Lainnya') {
                      setUnit(val);
                      setCustomUnit('');
                    } else {
                      setUnit(customUnit.trim() || '');
                    }
                  }}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="Unit">Unit</option>
                  <option value="Buah">Buah</option>
                  <option value="Set">Set</option>
                  <option value="Roll">Roll (Gulung)</option>
                  <option value="Dus / Box">Dus / Box</option>
                  <option value="Paket">Paket</option>
                  <option value="Lembar">Lembar</option>
                  <option value="Pasang">Pasang</option>
                  <option value="Meter">Meter</option>
                  <option value="Batang">Batang</option>
                  <option value="Lainnya">Lainnya (Ketik Sendiri)...</option>
                </select>

                {selectedUnitType === 'Lainnya' && (
                  <div className="p-2.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/60 border-2 border-emerald-500 dark:border-emerald-600 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    <label className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block">
                      Tulis Satuan Kustom: <span className="text-rose-500">*</span>
                    </label>
                    <input
                      ref={customInputRef}
                      type="text"
                      required
                      autoFocus
                      value={customUnit}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomUnit(val);
                        setUnit(val);
                      }}
                      placeholder="Misal: Lusin, Jerigen, Karung..."
                      className="w-full px-2.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg border border-emerald-400 dark:border-emerald-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
                    />
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                      *Otomatis tersimpan sebagai satuan aset
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Kondisi Fisik
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as ItemCondition)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="Baik">Baik (Prima)</option>
                <option value="Rusak Ringan">Rusak Ringan</option>
                <option value="Rusak Berat">Rusak Berat</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Lokasi Penempatan <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Contoh: Ruang Utama Lantai 1"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Taksiran Nilai (Rp)
              </label>
              <input
                type="number"
                min="0"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Contoh: 15000000"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Catatan / Riwayat Servis
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan tambahan, tanggal perawatan atau sumber wakaf..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none resize-none"
            />
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-end gap-2 sm:gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/20"
            >
              <Check className="w-4 h-4" />
              {editItem ? 'Simpan Perubahan' : 'Tambah Aset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
