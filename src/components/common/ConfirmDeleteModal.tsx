import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  itemName?: string;
  count?: number;
  confirmText?: string;
  cancelText?: string;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title = 'Konfirmasi Hapus Data',
  message,
  itemName,
  count,
  confirmText = 'Ya, Hapus',
  cancelText = 'Batal',
}) => {
  const handleClose = () => {
    if (onClose) onClose();
    if (onCancel) onCancel();
  };

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onCancel]);

  if (!isOpen) return null;

  const isMulti = typeof count === 'number' && count > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 max-w-md w-full space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Close icon button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning Icon & Title Header */}
        <div className="flex items-start gap-3.5 pr-6">
          <div className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 flex-shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug">
              {title || (isMulti ? 'Konfirmasi Hapus Massal' : 'Konfirmasi Hapus Data')}
            </h3>
            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
              Peringatan: Tindakan ini permanen
            </p>
          </div>
        </div>

        {/* Message Body */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {message ? (
            <p>{message}</p>
          ) : isMulti ? (
            <p>
              Apakah Anda yakin ingin menghapus{' '}
              <strong className="text-rose-600 dark:text-rose-400 font-bold">{count} {itemName || 'data'}</strong>{' '}
              yang telah dipilih? Seluruh data terpilih akan dihapus secara permanen.
            </p>
          ) : (
            <p>
              Apakah Anda yakin ingin menghapus data{' '}
              {itemName ? (
                <strong className="text-slate-900 dark:text-white font-semibold">"{itemName}"</strong>
              ) : (
                'ini'
              )}
              ? Data yang telah dihapus tidak dapat dipulihkan kembali.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={() => {
              onConfirm();
              handleClose();
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-98 rounded-xl shadow-md shadow-rose-600/25 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
