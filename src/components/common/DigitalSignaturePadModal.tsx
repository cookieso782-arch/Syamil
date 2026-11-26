import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PenTool, Undo2, Eraser, Check, X, Trash2 } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
}

export interface DigitalSignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  signerRole: string;
  signerName: string;
  initialSignature?: string | null;
  onSave: (dataUrl: string, rememberSignature: boolean) => void;
  onClearExisting?: () => void;
}

const PEN_COLORS = [
  { label: 'Hitam Resmi', value: '#0f172a' },
  { label: 'Biru Tinta', value: '#1d4ed8' },
  { label: 'Hijau DKM', value: '#047857' },
];

const PEN_WIDTHS = [
  { label: 'Tipis', value: 2 },
  { label: 'Sedang', value: 3 },
  { label: 'Tebal', value: 4.5 },
];

export const DigitalSignaturePadModal: React.FC<DigitalSignaturePadModalProps> = ({
  isOpen,
  onClose,
  signerRole,
  signerName,
  initialSignature,
  onSave,
  onClearExisting,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const isDrawingRef = useRef(false);

  const [penColor, setPenColor] = useState<string>('#0f172a');
  const [penWidth, setPenWidth] = useState<number>(3);
  const [strokeCount, setStrokeCount] = useState<number>(0);
  const [rememberSignature, setRememberSignature] = useState<boolean>(true);

  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    const pts = stroke.points;
    if (pts.length === 0) return;

    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (pts.length === 1) {
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, stroke.width / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);

    for (let i = 1; i < pts.length - 1; i++) {
      const midX = (pts[i].x + pts[i + 1].x) / 2;
      const midY = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
    }

    const last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
  }, []);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const targetW = Math.max(1, Math.round(rect.width * dpr));
    const targetH = Math.max(1, Math.round(rect.height * dpr));

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    for (const stroke of strokesRef.current) {
      drawStroke(ctx, stroke);
    }
    if (currentStrokeRef.current) {
      drawStroke(ctx, currentStrokeRef.current);
    }
    ctx.restore();
  }, [drawStroke]);

  // Reset drawing state whenever modal opens
  useEffect(() => {
    if (!isOpen) return;
    strokesRef.current = [];
    currentStrokeRef.current = null;
    isDrawingRef.current = false;
    setStrokeCount(0);

    const frame = requestAnimationFrame(() => {
      redrawCanvas();
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen, redrawCanvas]);

  // Redraw on window resize
  useEffect(() => {
    if (!isOpen) return;
    const handleResize = () => redrawCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, redrawCanvas]);

  // Escape key handler (stop propagation so parent print modal stays open)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getPointerPos = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;

    const pt = getPointerPos(e);
    currentStrokeRef.current = {
      points: [pt],
      color: penColor,
      width: penWidth,
    };
    redrawCanvas();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    const pt = getPointerPos(e);
    const pts = currentStrokeRef.current.points;
    const last = pts[pts.length - 1];
    if (last && Math.hypot(pt.x - last.x, pt.y - last.y) < 1.5) return;

    pts.push(pt);
    redrawCanvas();
  };

  const finishStroke = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (currentStrokeRef.current && currentStrokeRef.current.points.length > 0) {
      strokesRef.current.push(currentStrokeRef.current);
      setStrokeCount(strokesRef.current.length);
    }
    currentStrokeRef.current = null;
    redrawCanvas();
  };

  const handleUndo = () => {
    if (strokesRef.current.length === 0) return;
    strokesRef.current.pop();
    setStrokeCount(strokesRef.current.length);
    redrawCanvas();
  };

  const handleClear = () => {
    strokesRef.current = [];
    currentStrokeRef.current = null;
    setStrokeCount(0);
    redrawCanvas();
  };

  const exportTrimmedSignature = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || strokesRef.current.length === 0) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const { width, height } = canvas;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let hasInk = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha > 8) {
          hasInk = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!hasInk) return null;

    const dpr = window.devicePixelRatio || 1;
    const pad = Math.round(14 * dpr);
    const sx = Math.max(0, minX - pad);
    const sy = Math.max(0, minY - pad);
    const sw = Math.min(width - sx, maxX - minX + pad * 2 + 1);
    const sh = Math.min(height - sy, maxY - minY + pad * 2 + 1);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = sw;
    outCanvas.height = sh;
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) return canvas.toDataURL('image/png');

    outCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
    return outCanvas.toDataURL('image/png');
  };

  const handleConfirmSave = () => {
    const dataUrl = exportTrimmedSignature();
    if (!dataUrl) return;
    onSave(dataUrl, rememberSignature);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/70 dark:bg-slate-800/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                Tanda Tangan Digital Langsung
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {signerRole} — <span className="font-semibold text-slate-700 dark:text-slate-200">{signerName}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto flex-1">
          {/* Pen Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-500 dark:text-slate-400">Tinta:</span>
              <div className="flex items-center gap-1.5">
                {PEN_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setPenColor(c.value)}
                    title={c.label}
                    className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                      penColor === c.value
                        ? 'border-emerald-500 scale-110 ring-2 ring-emerald-500/30'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-500 dark:text-slate-400 mr-1">Tebal:</span>
              {PEN_WIDTHS.map((w) => (
                <button
                  key={w.value}
                  type="button"
                  onClick={() => setPenWidth(w.value)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                    penWidth === w.value
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* Drawing Canvas Container */}
          <div className="relative rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white overflow-hidden shadow-inner">
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishStroke}
              onPointerCancel={finishStroke}
              className="w-full h-44 sm:h-56 block touch-none cursor-crosshair select-none"
            />

            {/* Signature baseline guide */}
            <div className="pointer-events-none absolute inset-x-10 bottom-9 border-b border-slate-200" />
            {strokeCount === 0 && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-slate-400 select-none px-4 text-center">
                <PenTool className="w-7 h-7 mb-1.5 opacity-40" />
                <p className="text-xs font-semibold text-slate-500">
                  Goreskan tanda tangan Anda di area ini
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Mendukung mouse, touchpad, stylus, maupun layar sentuh
                </p>
              </div>
            )}
          </div>

          {/* Canvas Actions & Existing Preview */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUndo}
                disabled={strokeCount === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Urungkan</span>
              </button>

              <button
                type="button"
                onClick={handleClear}
                disabled={strokeCount === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-700 dark:text-slate-200 hover:text-rose-600 font-semibold transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>Bersihkan Kanvas</span>
              </button>
            </div>

            {initialSignature && onClearExisting && (
              <button
                type="button"
                onClick={() => {
                  onClearExisting();
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus TTD Aktif</span>
              </button>
            )}
          </div>

          {/* Save Option */}
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberSignature}
              onChange={(e) => setRememberSignature(e.target.checked)}
              className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
            />
            <span>
              Simpan tanda tangan untuk <strong>{signerName}</strong> agar otomatis terpasang di laporan lainnya
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex flex-wrap items-center justify-end gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirmSave}
            disabled={strokeCount === 0}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            <span>Pasang Tanda Tangan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
