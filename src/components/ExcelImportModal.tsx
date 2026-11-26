import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  RefreshCw,
} from 'lucide-react';
import {
  parseTransactionsExcel,
  parseInventoryExcel,
  downloadTemplate,
  ParseResult,
} from '../services/excelService.ts';
import { Transaction, InventoryItem } from '../types/index.ts';
import { formatCurrencyIDR } from '../services/storage.ts';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'kas' | 'inventaris';
  onImportKas: (data: Transaction[]) => void;
  onImportInventory: (data: InventoryItem[]) => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'kas',
  onImportKas,
  onImportInventory,
}) => {
  const [importType, setImportType] = useState<'kas' | 'inventaris'>(defaultType);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult<any> | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setImportType(defaultType);
      setSelectedFile(null);
      setParseResult(null);
      setIsSuccess(false);
    }
  }, [isOpen, defaultType]);

  if (!isOpen) return null;

  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setIsParsing(true);
    setParseResult(null);
    setIsSuccess(false);

    try {
      if (importType === 'kas') {
        const res = await parseTransactionsExcel(file);
        setParseResult(res);
      } else {
        const res = await parseInventoryExcel(file);
        setParseResult(res);
      }
    } catch (err: any) {
      setParseResult({
        success: false,
        data: [],
        errors: [`Gagal membaca berkas: ${err?.message || 'Format tidak valid'}`],
        totalRows: 0,
        validRows: 0,
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleCommit = () => {
    if (!parseResult || parseResult.data.length === 0) return;

    if (importType === 'kas') {
      onImportKas(parseResult.data as Transaction[]);
    } else {
      onImportInventory(parseResult.data as InventoryItem[]);
    }

    setIsSuccess(true);
    setTimeout(() => {
      onClose();
      setSelectedFile(null);
      setParseResult(null);
      setIsSuccess(false);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Import Data Laporan dari Excel
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Mendukung format .xlsx, .xls, dan .csv
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

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1">
          {/* Target Type Selector & Template Download */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Pilih Jenis Data yang Akan Di-Import:
              </label>
              <div className="inline-flex flex-wrap rounded-lg p-0.5 bg-slate-200 dark:bg-slate-800 gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setImportType('kas');
                    setSelectedFile(null);
                    setParseResult(null);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    importType === 'kas'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Buku Kas Masjid
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImportType('inventaris');
                    setSelectedFile(null);
                    setParseResult(null);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    importType === 'inventaris'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Inventaris & Aset
                </button>
              </div>
            </div>

            {/* Template Download Button */}
            <button
              type="button"
              onClick={() => downloadTemplate(importType)}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors self-start sm:self-center"
            >
              <Download className="w-3.5 h-3.5" />
              Download Template Excel Resmi
            </button>
          </div>

          {/* Drag & Drop File Upload Box */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-5 sm:p-8 text-center cursor-pointer bg-slate-50/50 dark:bg-slate-800/20 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 transition-colors"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />

            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
              <Upload className="w-6 h-6" />
            </div>

            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {selectedFile ? selectedFile.name : 'Tarik & Letakkan file Excel Anda di sini'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              atau <span className="text-emerald-600 dark:text-emerald-400 font-medium underline">pilih dari komputer</span> (.xlsx, .xls, .csv)
            </p>
          </div>

          {/* Parsing State */}
          {isParsing && (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-slate-600 dark:text-slate-400">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
              Memproses & memvalidasi struktur Excel...
            </div>
          )}

          {/* Validation Warnings / Errors */}
          {parseResult && parseResult.errors.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Catatan Validasi Data:
              </div>
              <ul className="list-disc pl-5 space-y-0.5">
                {parseResult.errors.slice(0, 4).map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
              {parseResult.errors.length > 4 && (
                <p className="text-[11px] text-amber-600 font-medium">
                  dan {parseResult.errors.length - 4} catatan lainnya...
                </p>
              )}
            </div>
          )}

          {/* Preview Table */}
          {parseResult && parseResult.validRows > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <FileCheck className="w-4 h-4" />
                  Pratinjau {parseResult.validRows} Baris Siap Di-Import
                </div>
                <span className="text-slate-400 text-[11px]">
                  (Menampilkan maks. 5 data teratas)
                </span>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl max-h-52 overflow-auto">
                <table className="w-full min-w-[540px] text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 sticky top-0">
                    <tr>
                      <th className="p-2.5">No</th>
                      {importType === 'kas' && (
                        <>
                          <th className="p-2.5">Tanggal</th>
                          <th className="p-2.5">Tipe</th>
                          <th className="p-2.5">Kategori</th>
                          <th className="p-2.5">Uraian</th>
                          <th className="p-2.5 text-right">Nominal</th>
                        </>
                      )}
                      {importType === 'inventaris' && (
                        <>
                          <th className="p-2.5">Kode</th>
                          <th className="p-2.5">Nama Barang</th>
                          <th className="p-2.5">Kategori</th>
                          <th className="p-2.5">Kondisi</th>
                          <th className="p-2.5">Lokasi</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                    {parseResult.data.slice(0, 5).map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 text-slate-400">{idx + 1}</td>
                        {importType === 'kas' && (
                          <>
                            <td className="p-2.5">{row.date}</td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                row.type === 'in' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {row.type === 'in' ? 'Masuk' : 'Keluar'}
                              </span>
                            </td>
                            <td className="p-2.5">{row.category}</td>
                            <td className="p-2.5 max-w-[200px] truncate">{row.description}</td>
                            <td className="p-2.5 text-right font-semibold">
                              {formatCurrencyIDR(row.amount)}
                            </td>
                          </>
                        )}
                        {importType === 'inventaris' && (
                          <>
                            <td className="p-2.5 font-mono text-slate-500">{row.code}</td>
                            <td className="p-2.5 font-medium">{row.name}</td>
                            <td className="p-2.5">{row.category}</td>
                            <td className="p-2.5">{row.condition}</td>
                            <td className="p-2.5">{row.location}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Success Message */}
          {isSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-emerald-800 dark:text-emerald-300 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">Alhamdulillah, Data Berhasil Di-Import!</p>
                <p className="text-xs">Database masjid telah diperbarui secara otomatis.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2 sm:gap-3 bg-slate-50 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={!parseResult || parseResult.validRows === 0 || isSuccess}
            onClick={handleCommit}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-emerald-600/20 transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            Simpan {parseResult?.validRows || 0} Data ke Sistem
          </button>
        </div>
      </div>
    </div>
  );
};
