import React from 'react';
import { Trash2, X, CheckSquare } from 'lucide-react';

export interface MultiDeleteBarProps {
  selectedCount: number;
  totalCount?: number;
  onDeleteSelected: () => void;
  onClearSelection: () => void;
  itemName?: string;
  label?: string;
  isDeleting?: boolean;
  onToggleSelectAll?: () => void;
  isAllSelected?: boolean;
}

export const MultiDeleteBar: React.FC<MultiDeleteBarProps> = ({
  selectedCount,
  onDeleteSelected,
  onClearSelection,
  itemName = 'data',
  label,
  isDeleting = false,
  onToggleSelectAll,
  isAllSelected = false,
}) => {
  const displayName = label || itemName;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5 bg-emerald-50/90 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 rounded-xl shadow-xs text-xs animate-in fade-in slide-in-from-top-1 duration-150">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-semibold">
          <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>
            {selectedCount > 0 ? (
              <>
                <strong className="font-bold text-emerald-700 dark:text-emerald-300">{selectedCount}</strong> {displayName} terpilih
              </>
            ) : (
              <span>Pilih {displayName} yang ingin dihapus</span>
            )}
          </span>
        </div>

        {onToggleSelectAll && (
          <button
            type="button"
            onClick={onToggleSelectAll}
            className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer"
          >
            {isAllSelected ? 'Batalkan Semua' : 'Pilih Semua'}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
        <button
          type="button"
          onClick={onClearSelection}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-xs"
        >
          <X className="w-3.5 h-3.5" />
          <span>Batal</span>
        </button>

        <button
          type="button"
          disabled={isDeleting || selectedCount === 0}
          onClick={onDeleteSelected}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all shadow-xs ${
            selectedCount > 0
              ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-rose-600/30'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-700'
          }`}
          title={selectedCount > 0 ? `Hapus ${selectedCount} ${displayName} terpilih` : 'Pilih data terlebih dahulu'}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Hapus Terpilih ({selectedCount})</span>
        </button>
      </div>
    </div>
  );
};
