import React, { useMemo, useState, useEffect } from 'react';
import {
  Transaction,
  InventoryItem,
  IncomingLetter,
  OutgoingLetter,
  ZakatRecord,
  Mustahik,
} from '../types/index.ts';
import { formatCurrencyIDR } from '../services/storage.ts';
import {
  BarChart3,
  PieChart as PieChartIcon,
  Boxes,
  FileText,
  HeartHandshake,
  TrendingUp,
  TrendingDown,
  ChevronRight,
} from 'lucide-react';

interface DashboardChartsProps {
  transactions: Transaction[];
  inventory: InventoryItem[];
  incomingLetters: IncomingLetter[];
  outgoingLetters: OutgoingLetter[];
  zakatRecords: ZakatRecord[];
  mustahikList: Mustahik[];
  cardBgClass: string;
  section?: 'all' | 'charts' | 'operational';
  onNavigate?: (tab: string) => void;
  canAccessInventory?: boolean;
  canAccessZakat?: boolean;
  canAccessLetters?: boolean;
  canAccessFinance?: boolean;
  onSelectFinanceCategory?: (category: string, type: 'in' | 'out') => void;
}

const DONUT_COLORS = [
  '#10b981', // emerald-500
  '#0ea5e9', // sky-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
];

const formatCompactIDR = (val: number): string => {
  const abs = Math.abs(val);
  if (abs >= 1_000_000_000) {
    return `Rp ${(val / 1_000_000_000).toFixed(1).replace('.', ',')} M`;
  }
  if (abs >= 1_000_000) {
    return `Rp ${(val / 1_000_000).toFixed(1).replace('.', ',')} Jt`;
  }
  if (abs >= 1_000) {
    return `Rp ${Math.round(val / 1_000)} Rb`;
  }
  return `Rp ${val}`;
};

const formatShortDate = (dateStr: string): string => {
  try {
    const [year, month, day] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const mIdx = parseInt(month, 10) - 1;
    if (year && day && months[mIdx]) {
      return `${parseInt(day, 10)} ${months[mIdx]}`;
    }
  } catch {
    // fallback
  }
  return dateStr;
};

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  transactions,
  inventory,
  incomingLetters,
  outgoingLetters,
  zakatRecords,
  mustahikList,
  cardBgClass,
  section = 'all',
  onNavigate,
  canAccessInventory = false,
  canAccessZakat = false,
  canAccessLetters = false,
  canAccessFinance = false,
  onSelectFinanceCategory,
}) => {
  const [cashViewMode, setCashViewMode] = useState<'daily' | 'summary'>('daily');
  const [hoveredBarKey, setHoveredBarKey] = useState<string | null>(null);
  const [donutType, setDonutType] = useState<'in' | 'out'>('in');
  const [hoveredSliceIdx, setHoveredSliceIdx] = useState<number | null>(null);

  useEffect(() => {
    setHoveredSliceIdx(null);
  }, [transactions, donutType]);

  useEffect(() => {
    setHoveredBarKey(null);
  }, [transactions, cashViewMode]);

  // 1. Cashflow Bar Chart Data (real-time from transactions)
  const dailyCashflow = useMemo(() => {
    const grouped: Record<string, { date: string; inAmount: number; outAmount: number; count: number }> = {};
    transactions.forEach((trx) => {
      const key = (trx.date || '').trim() || 'Lainnya';
      const amt = Number(trx.amount) || 0;
      if (!grouped[key]) {
        grouped[key] = { date: key, inAmount: 0, outAmount: 0, count: 0 };
      }
      if (trx.type === 'in') {
        grouped[key].inAmount += amt;
      } else {
        grouped[key].outAmount += amt;
      }
      grouped[key].count += 1;
    });

    const isIsoDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);
    return Object.values(grouped)
      .sort((a, b) => {
        const aIso = isIsoDate(a.date);
        const bIso = isIsoDate(b.date);
        if (aIso && !bIso) return 1;
        if (!aIso && bIso) return -1;
        return a.date.localeCompare(b.date);
      })
      .slice(-7);
  }, [transactions]);

  const totalIn = useMemo(
    () => transactions.filter((t) => t.type === 'in').reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
    [transactions]
  );
  const totalOut = useMemo(
    () => transactions.filter((t) => t.type === 'out').reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
    [transactions]
  );
  const netCash = totalIn - totalOut;

  const chartSeries = useMemo(() => {
    if (cashViewMode === 'summary') {
      return [
        {
          key: 'total-kas',
          label: 'Total Keseluruhan',
          inAmount: totalIn,
          outAmount: totalOut,
          count: transactions.length,
        },
      ];
    }
    return dailyCashflow.map((d) => ({
      key: d.date,
      label: formatShortDate(d.date),
      inAmount: d.inAmount,
      outAmount: d.outAmount,
      count: d.count,
    }));
  }, [cashViewMode, dailyCashflow, totalIn, totalOut, transactions.length]);

  const maxBarValue = useMemo(() => {
    const maxVal = chartSeries.reduce(
      (max, item) => Math.max(max, item.inAmount, item.outAmount),
      0
    );
    return maxVal > 0 ? maxVal : 1;
  }, [chartSeries]);

  // 2. Donut Chart Data (real-time from transactions by category)
  const donutData = useMemo(() => {
    const filtered = transactions.filter((t) => t.type === donutType && (Number(t.amount) || 0) > 0);
    const total = filtered.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const map: Record<string, number> = {};

    filtered.forEach((t) => {
      const categoryKey = (t.category || 'Lain-lain').trim();
      map[categoryKey] = (map[categoryKey] || 0) + (Number(t.amount) || 0);
    });

    const sorted = Object.entries(map)
      .filter(([, val]) => val > 0)
      .sort((a, b) => b[1] - a[1]);

    // Group categories beyond top 5 into "Lainnya" for clean readability
    const topItems = sorted.slice(0, 5);
    const restSum = sorted.slice(5).reduce((s, [, val]) => s + val, 0);
    if (restSum > 0) {
      topItems.push(['Kategori Lainnya', restSum]);
    }

    const radius = 58;
    const circumference = 2 * Math.PI * radius;
    let cumulativePercent = 0;

    const slices = topItems.map(([category, amount], idx) => {
      const percent = total > 0 ? (amount / total) * 100 : 0;
      const strokeLength = (percent / 100) * circumference;
      const dashOffset = -(cumulativePercent / 100) * circumference;
      cumulativePercent += percent;

      return {
        category,
        amount,
        percent,
        color: DONUT_COLORS[idx % DONUT_COLORS.length],
        strokeLength,
        dashOffset,
        circumference,
      };
    });

    return { total, slices, radius, circumference };
  }, [transactions, donutType]);

  // 3. Inventory Condition Stats
  const inventoryStats = useMemo(() => {
    const baik = inventory.filter((i) => i.condition === 'Baik').length;
    const ringan = inventory.filter((i) => i.condition === 'Rusak Ringan').length;
    const berat = inventory.filter((i) => i.condition === 'Rusak Berat').length;
    const totalItems = inventory.length;
    const totalUnits = inventory.reduce((sum, i) => sum + i.quantity, 0);
    return {
      baik,
      ringan,
      berat,
      totalItems,
      totalUnits,
      baikPct: totalItems > 0 ? Math.round((baik / totalItems) * 100) : 0,
      ringanPct: totalItems > 0 ? Math.round((ringan / totalItems) * 100) : 0,
      beratPct: totalItems > 0 ? Math.round((berat / totalItems) * 100) : 0,
    };
  }, [inventory]);

  // 4. Letters Status Stats
  const letterStats = useMemo(() => {
    const inCount = incomingLetters.length;
    const outCount = outgoingLetters.length;
    const total = inCount + outCount;
    const pendingIn = incomingLetters.filter(
      (l) => l.status === 'Belum Diproses' || l.status === 'Didisposisikan'
    ).length;
    const completedIn = incomingLetters.filter(
      (l) => l.status === 'Selesai Ditindaklanjuti' || l.status === 'Diarsipkan'
    ).length;

    return {
      inCount,
      outCount,
      total,
      pendingIn,
      completedIn,
      inPct: total > 0 ? Math.round((inCount / total) * 100) : 0,
      outPct: total > 0 ? Math.round((outCount / total) * 100) : 0,
    };
  }, [incomingLetters, outgoingLetters]);

  // 5. Zakat & Mustahik Stats
  const zakatStats = useMemo(() => {
    const totalRecords = zakatRecords.length;
    const distributedCount = zakatRecords.filter((z) => z.status === 'Tersalurkan').length;
    const storedCount = zakatRecords.filter((z) => z.status === 'Tersimpan di Amil').length;
    const totalCash = zakatRecords.reduce((sum, z) => sum + (z.cashAmount || 0), 0);
    const totalRice = zakatRecords.reduce((sum, z) => sum + (z.riceKg || 0), 0);
    const distributedPct = totalRecords > 0 ? Math.round((distributedCount / totalRecords) * 100) : 0;
    const storedPct = totalRecords > 0 ? 100 - distributedPct : 0;

    return {
      totalRecords,
      distributedCount,
      storedCount,
      totalCash,
      totalRice,
      distributedPct,
      storedPct,
      mustahikCount: mustahikList.length,
    };
  }, [zakatRecords, mustahikList]);

  const showCharts = section === 'all' || section === 'charts';
  const showOperational = section === 'all' || section === 'operational';

  return (
    <div className="space-y-5">
      {/* Main Interactive Charts Row */}
      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT: Bar Chart Arus Kas Masuk vs Keluar */}
        <div className={`p-4 sm:p-5 rounded-2xl border ${cardBgClass} lg:col-span-7 flex flex-col justify-between space-y-4 min-w-0`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 shrink-0">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Grafik Arus Kas Masuk & Keluar
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Perbandingan pemasukan & pengeluaran masjid secara langsung
                </p>
              </div>
            </div>

            <div className="inline-flex flex-wrap rounded-xl p-1 bg-slate-100 dark:bg-slate-800 text-xs self-start sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => setCashViewMode('daily')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  cashViewMode === 'daily'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Per Tanggal
              </button>
              <button
                type="button"
                onClick={() => setCashViewMode('summary')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  cashViewMode === 'summary'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Ringkasan Total
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
                Pemasukan
              </span>
              <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                <span className="w-3 h-3 rounded-sm bg-rose-500 inline-block" />
                Pengeluaran
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Arahkan kursor atau ketuk batang grafik untuk detail
            </span>
          </div>

          {/* Bar Chart Canvas */}
          {chartSeries.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              Belum ada data transaksi kas untuk ditampilkan.
            </div>
          ) : (
            <div className="relative pt-4 pb-1">
              <div className="flex items-stretch gap-2 sm:gap-3 h-52">
                {/* Y-axis scale */}
                <div className="flex flex-col justify-between text-[9px] sm:text-[10px] font-mono text-slate-400 pb-6 pr-1 text-right shrink-0 w-12 sm:w-16">
                  <span>{formatCompactIDR(maxBarValue)}</span>
                  <span>{formatCompactIDR(maxBarValue / 2)}</span>
                  <span>Rp 0</span>
                </div>

                {/* Plot area */}
                <div className="relative flex-1 min-w-0 overflow-x-auto overflow-y-visible flex flex-col">
                  <div className={`relative flex-1 flex flex-col ${chartSeries.length > 3 ? 'min-w-[260px] sm:min-w-0' : ''}`}>
                    {/* Horizontal Gridlines */}
                    <div className="relative flex-1 border-b border-slate-200 dark:border-slate-800">
                      <div className="absolute inset-x-0 top-0 border-t border-dashed border-slate-200/80 dark:border-slate-800/80" />
                      <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-200/80 dark:border-slate-800/80" />

                      {/* Bars Container */}
                      <div className="relative z-10 h-full flex items-end justify-around gap-1.5 sm:gap-2 px-1">
                        {chartSeries.map((item, idx) => {
                          const inPct = Math.max(item.inAmount > 0 ? 4 : 0, (item.inAmount / maxBarValue) * 100);
                          const outPct = Math.max(item.outAmount > 0 ? 4 : 0, (item.outAmount / maxBarValue) * 100);
                          const isHovered = hoveredBarKey === item.key;
                          const tooltipAlignClass =
                            chartSeries.length === 1
                              ? 'left-1/2 -translate-x-1/2'
                              : idx === 0
                              ? 'left-0 translate-x-0 sm:left-1/2 sm:-translate-x-1/2'
                              : idx === chartSeries.length - 1
                              ? 'right-0 translate-x-0 sm:left-1/2 sm:-translate-x-1/2'
                              : 'left-1/2 -translate-x-1/2';

                          return (
                            <div
                              key={item.key}
                              onMouseEnter={() => setHoveredBarKey(item.key)}
                              onMouseLeave={() => setHoveredBarKey(null)}
                              onClick={() => setHoveredBarKey(isHovered ? null : item.key)}
                              className="relative flex-1 max-w-[96px] h-full flex items-end justify-center gap-1 sm:gap-1.5 group cursor-pointer"
                            >
                              {/* Hover / Tap Tooltip */}
                              {isHovered && (
                                <div className={`absolute bottom-full mb-2 ${tooltipAlignClass} z-30 w-44 sm:w-48 p-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white shadow-xl border border-slate-700 text-[11px] pointer-events-none`}>
                                  <p className="font-bold text-slate-200 mb-1 border-b border-slate-700 pb-1">
                                    {item.label} ({item.count} transaksi)
                                  </p>
                                  <div className="flex justify-between gap-2 text-emerald-400">
                                    <span>Masuk:</span>
                                    <span className="font-mono font-bold">+{formatCurrencyIDR(item.inAmount)}</span>
                                  </div>
                                  <div className="flex justify-between gap-2 text-rose-400 mt-0.5">
                                    <span>Keluar:</span>
                                    <span className="font-mono font-bold">-{formatCurrencyIDR(item.outAmount)}</span>
                                  </div>
                                </div>
                              )}

                              {/* Highlight backdrop */}
                              <div
                                className={`absolute inset-x-0 inset-y-0 rounded-lg transition-colors -z-10 ${
                                  isHovered ? 'bg-slate-100/80 dark:bg-slate-800/40' : ''
                                }`}
                              />

                              {/* Income Bar */}
                              <div className="w-3.5 sm:w-6 h-full flex items-end">
                                <div
                                  style={{ height: `${inPct}%` }}
                                  className="w-full rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all duration-500 shadow-sm group-hover:brightness-110"
                                />
                              </div>

                              {/* Expense Bar */}
                              <div className="w-3.5 sm:w-6 h-full flex items-end">
                                <div
                                  style={{ height: `${outPct}%` }}
                                  className="w-full rounded-t-md bg-gradient-to-t from-rose-600 to-rose-400 transition-all duration-500 shadow-sm group-hover:brightness-110"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* X-axis Labels */}
                    <div className="h-6 flex items-center justify-around gap-1.5 sm:gap-2 px-1 pt-1.5">
                      {chartSeries.map((item) => (
                        <span
                          key={item.key}
                          className={`flex-1 max-w-[96px] text-center text-[10px] sm:text-[11px] font-semibold truncate ${
                            hoveredBarKey === item.key
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {item.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Cashflow Summary */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              Total tercatat: <strong className="text-slate-800 dark:text-slate-200">{transactions.length} transaksi</strong>
            </span>
            <span
              className={`font-bold flex items-center gap-1 ${
                netCash >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {netCash >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {netCash >= 0 ? 'Surplus Kas:' : 'Defisit Kas:'} {formatCurrencyIDR(Math.abs(netCash))}
            </span>
          </div>
        </div>

        {/* RIGHT: Donut Chart Komposisi Kategori */}
        <div className={`p-4 sm:p-5 rounded-2xl border ${cardBgClass} lg:col-span-5 flex flex-col justify-between space-y-4 min-w-0`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 shrink-0">
                <PieChartIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Proporsi Kategori Kas
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Persentase berdasarkan jenis transaksi
                </p>
              </div>
            </div>

            <div className="inline-flex flex-wrap rounded-xl p-1 bg-slate-100 dark:bg-slate-800 text-xs self-start sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => {
                  setDonutType('in');
                  setHoveredSliceIdx(null);
                }}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  donutType === 'in'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => {
                  setDonutType('out');
                  setHoveredSliceIdx(null);
                }}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  donutType === 'out'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Keluar
              </button>
            </div>
          </div>

          {donutData.slices.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              Belum ada transaksi {donutType === 'in' ? 'pemasukan' : 'pengeluaran'}.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row lg:flex-col 2xl:flex-row items-center gap-5 py-1">
              {/* SVG Donut */}
              <div className="relative w-36 h-36 sm:w-40 sm:h-40 shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r={donutData.radius}
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="22"
                    className="text-slate-100 dark:text-slate-800"
                  />
                  {donutData.slices.map((slice, idx) => {
                    const isHighlighted = hoveredSliceIdx === idx;
                    return (
                      <circle
                        key={slice.category}
                        cx="80"
                        cy="80"
                        r={donutData.radius}
                        fill="transparent"
                        stroke={slice.color}
                        strokeWidth={isHighlighted ? 26 : 22}
                        strokeDasharray={`${slice.strokeLength} ${donutData.circumference}`}
                        strokeDashoffset={slice.dashOffset}
                        onMouseEnter={() => setHoveredSliceIdx(idx)}
                        onMouseLeave={() => setHoveredSliceIdx(null)}
                        onClick={() => {
                          if (canAccessFinance && onSelectFinanceCategory) {
                            onSelectFinanceCategory(slice.category, donutType);
                          } else {
                            setHoveredSliceIdx(isHighlighted ? null : idx);
                          }
                        }}
                        className="transition-all duration-500 cursor-pointer"
                        style={{
                          opacity: hoveredSliceIdx !== null && !isHighlighted ? 0.45 : 1,
                        }}
                      />
                    );
                  })}
                </svg>

                {/* Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pointer-events-none">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    {hoveredSliceIdx !== null && donutData.slices[hoveredSliceIdx]
                      ? `${donutData.slices[hoveredSliceIdx].percent.toFixed(1)}%`
                      : donutType === 'in'
                      ? 'Total Masuk'
                      : 'Total Keluar'}
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white font-mono mt-0.5 leading-tight">
                    {hoveredSliceIdx !== null && donutData.slices[hoveredSliceIdx]
                      ? formatCompactIDR(donutData.slices[hoveredSliceIdx].amount)
                      : formatCompactIDR(donutData.total)}
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 w-full space-y-2 min-w-0">
                {donutData.slices.map((slice, idx) => {
                  const isHighlighted = hoveredSliceIdx === idx;
                  const canJump = canAccessFinance && !!onSelectFinanceCategory;
                  return (
                    <button
                      type="button"
                      key={slice.category}
                      onMouseEnter={() => setHoveredSliceIdx(idx)}
                      onMouseLeave={() => setHoveredSliceIdx(null)}
                      onClick={() => {
                        if (canJump) {
                          onSelectFinanceCategory(slice.category, donutType);
                        } else {
                          setHoveredSliceIdx(isHighlighted ? null : idx);
                        }
                      }}
                      title={
                        canJump
                          ? `Klik untuk lihat data ${slice.category} di Buku Kas Keuangan`
                          : slice.category
                      }
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-xs text-left transition-colors cursor-pointer group ${
                        isHighlighted
                          ? 'bg-slate-100 dark:bg-slate-800/80'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: slice.color }}
                        />
                        <span className="font-medium text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 truncate transition-colors">
                          {slice.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-right shrink-0">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {slice.percent.toFixed(0)}%
                        </span>
                        <span className="text-[10px] text-slate-400 ml-0.5 hidden sm:inline">
                          ({formatCompactIDR(slice.amount)})
                        </span>
                        {canJump && (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-transform group-hover:translate-x-0.5" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Total {donutType === 'in' ? 'Pemasukan' : 'Pengeluaran'}</span>
            <strong className="font-mono text-slate-900 dark:text-white">
              {formatCurrencyIDR(donutData.total)}
            </strong>
          </div>
        </div>
        </div>
      )}

      {/* Bottom Visual Progress Breakdown Row (Aset, Zakat, Surat) */}
      {showOperational && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {/* 1. Kondisi Aset & Inventaris */}
        <div
          onClick={() => canAccessInventory && onNavigate?.('inventory')}
          className={`p-4 sm:p-5 rounded-2xl border min-w-0 ${cardBgClass} space-y-3 transition-all ${
            canAccessInventory && onNavigate ? 'hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm cursor-pointer' : ''
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 shrink-0">
                <Boxes className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">Kondisi Aset &amp; Fasilitas</h4>
                <p className="text-[11px] text-slate-400 truncate">{inventoryStats.totalUnits} unit dari {inventoryStats.totalItems} jenis</p>
              </div>
            </div>
            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 font-mono shrink-0">
              {inventoryStats.baikPct}% Baik
            </span>
          </div>

          <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
            {inventoryStats.baik > 0 && (
              <div
                style={{ width: `${inventoryStats.baikPct}%` }}
                className="bg-emerald-500 transition-all duration-500"
                title={`Baik: ${inventoryStats.baik}`}
              />
            )}
            {inventoryStats.ringan > 0 && (
              <div
                style={{ width: `${inventoryStats.ringanPct}%` }}
                className="bg-amber-500 transition-all duration-500"
                title={`Rusak Ringan: ${inventoryStats.ringan}`}
              />
            )}
            {inventoryStats.berat > 0 && (
              <div
                style={{ width: `${inventoryStats.beratPct}%` }}
                className="bg-rose-500 transition-all duration-500"
                title={`Rusak Berat: ${inventoryStats.berat}`}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Baik: <strong className="text-slate-800 dark:text-slate-200">{inventoryStats.baik}</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Ringan: <strong className="text-slate-800 dark:text-slate-200">{inventoryStats.ringan}</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Berat: <strong className="text-slate-800 dark:text-slate-200">{inventoryStats.berat}</strong>
            </span>
          </div>
        </div>

        {/* 2. Statistik Zakat & Mustahik */}
        <div
          onClick={() => canAccessZakat && onNavigate?.('zakat')}
          className={`p-4 sm:p-5 rounded-2xl border min-w-0 ${cardBgClass} space-y-3 transition-all ${
            canAccessZakat && onNavigate ? 'hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm cursor-pointer' : ''
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 shrink-0">
                <HeartHandshake className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">Penyaluran Zakat &amp; Mustahik</h4>
                <p className="text-[11px] text-slate-400 truncate">
                  {formatCompactIDR(zakatStats.totalCash)} • {zakatStats.totalRice} kg beras
                </p>
              </div>
            </div>
            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 font-mono shrink-0">
              {zakatStats.distributedPct}% Salur
            </span>
          </div>

          <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
            {zakatStats.distributedCount > 0 && (
              <div
                style={{ width: `${zakatStats.distributedPct}%` }}
                className="bg-emerald-500 transition-all duration-500"
                title={`Tersalurkan: ${zakatStats.distributedCount}`}
              />
            )}
            {zakatStats.storedCount > 0 && (
              <div
                style={{ width: `${zakatStats.storedPct}%` }}
                className="bg-amber-400 transition-all duration-500"
                title={`Di Amil: ${zakatStats.storedCount}`}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Tersalurkan: <strong className="text-slate-800 dark:text-slate-200">{zakatStats.distributedCount}</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Amil: <strong className="text-slate-800 dark:text-slate-200">{zakatStats.storedCount}</strong>
            </span>
            <span className="text-slate-600 dark:text-slate-300 font-semibold">
              {zakatStats.mustahikCount} Mustahik
            </span>
          </div>
        </div>

        {/* 3. Statistik Surat & Administrasi */}
        <div
          onClick={() => canAccessLetters && onNavigate?.('letters')}
          className={`p-4 sm:p-5 rounded-2xl border min-w-0 ${cardBgClass} space-y-3 transition-all ${
            canAccessLetters && onNavigate ? 'hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm cursor-pointer' : ''
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">Rasio Surat &amp; Disposisi</h4>
                <p className="text-[11px] text-slate-400">Total {letterStats.total} berkas surat</p>
              </div>
            </div>
            <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 font-mono shrink-0">
              {letterStats.pendingIn} Aktif
            </span>
          </div>

          <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
            {letterStats.inCount > 0 && (
              <div
                style={{ width: `${letterStats.inPct}%` }}
                className="bg-sky-500 transition-all duration-500"
                title={`Surat Masuk: ${letterStats.inCount}`}
              />
            )}
            {letterStats.outCount > 0 && (
              <div
                style={{ width: `${letterStats.outPct}%` }}
                className="bg-violet-500 transition-all duration-500"
                title={`Surat Keluar: ${letterStats.outCount}`}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              Masuk: <strong className="text-slate-800 dark:text-slate-200">{letterStats.inCount}</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-violet-500" />
              Keluar: <strong className="text-slate-800 dark:text-slate-200">{letterStats.outCount}</strong>
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              Selesai: {letterStats.completedIn}
            </span>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
