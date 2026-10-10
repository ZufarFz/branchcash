import React from 'react';
import { DenomConfig, DenomBreakdownItem } from '../../../types';
import { Coins, X } from 'lucide-react';

export interface CellPopoverData {
  id: string;
  anchorEl: HTMLElement;
  rect: DOMRect;
  cashierName: string;
  master: DenomConfig;
  subtotal: number;
  calculatedPcs?: number;
  breakdown: DenomBreakdownItem[];
  singleItem?: DenomBreakdownItem;
}

interface CellPopoverProps {
  data: CellPopoverData | null;
  onClose: () => void;
}

export const CellPopover: React.FC<CellPopoverProps> = ({ data, onClose }) => {
  if (!data) return null;

  const popoverWidth = 270;
  const isNearBottom = data.rect.bottom + 220 > window.innerHeight;
  let top = 0;
  let isPlacementTop = false;

  if (isNearBottom && data.rect.top > 200) {
    isPlacementTop = true;
    top = data.rect.top - 8;
  } else {
    isPlacementTop = false;
    top = data.rect.bottom + 8;
  }

  const cellCenterX = data.rect.left + data.rect.width / 2;
  const left = Math.max(12, Math.min(window.innerWidth - popoverWidth - 12, cellCenterX - popoverWidth + 30));
  const arrowLeft = Math.max(16, Math.min(popoverWidth - 32, cellCenterX - left - 8));

  return (
    <div
      id="light-cell-popover"
      data-cell-popover="true"
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        width: `${popoverWidth}px`,
        zIndex: 9999,
      }}
      className={`bg-white text-slate-900 rounded-xl shadow-xl border border-slate-200 p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-150 ${
        isPlacementTop ? '-translate-y-full' : ''
      }`}
    >
      {/* Arrow pointer */}
      {isPlacementTop ? (
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${arrowLeft}px`,
            top: '100%',
            marginTop: '-1px',
            width: '16px',
            height: '8px',
            zIndex: 30,
          }}
        >
          <svg width="16" height="8" viewBox="0 0 16 8" className="block overflow-visible">
            <polygon points="0,0 8,8 16,0" fill="#ffffff" />
            <line x1="1" y1="0" x2="15" y2="0" stroke="#ffffff" strokeWidth="2" />
            <polyline
              points="0,0 8,8 16,0"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      ) : (
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${arrowLeft}px`,
            bottom: '100%',
            marginBottom: '-1px',
            width: '16px',
            height: '8px',
            zIndex: 30,
          }}
        >
          <svg width="16" height="8" viewBox="0 0 16 8" className="block overflow-visible">
            <polygon points="0,8 8,0 16,8" fill="#ffffff" />
            <line x1="1" y1="8" x2="15" y2="8" stroke="#ffffff" strokeWidth="2" />
            <polyline
              points="0,8 8,0 16,8"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-1.5">
        <div>
          <div className="flex items-center gap-1.5 text-sky-900 font-bold text-xs">
            <Coins className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span>Pecahan {data.master.label}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[190px]">
            {data.cashierName}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Tutup (atau klik cell kembali)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Subtotal Summary */}
      <div className="bg-sky-50/60 border border-sky-100 rounded-lg p-2 font-mono text-xs">
        <div className="flex justify-between items-center">
          <span className="text-slate-600 font-sans text-[11px]">Total Pecahan:</span>
          <span className="font-bold text-slate-900">
            Rp {data.subtotal.toLocaleString('id-ID')}
          </span>
        </div>
      </div>

      {/* Breakdown items list */}
      {data.breakdown && data.breakdown.length > 0 ? (
        <div className="space-y-1 pt-0.5">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Rincian Pecahan ({data.breakdown.length}):
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1.5">
            {data.breakdown.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-2 bg-slate-50/90 border border-slate-200/80 rounded-lg text-xs space-y-0.5 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500">#{idx + 1}</span>
                  <span className="font-mono font-extrabold text-slate-900 text-[11px]">
                    Rp {item.subtotal.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 flex items-start gap-1">
                  <span className="text-slate-400 font-medium shrink-0">Ket:</span>
                  <span className={item.note ? 'text-slate-700 italic break-words' : 'text-slate-400 italic'}>
                    {item.note || '-'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Nominal:</span>
            <span className="font-mono font-bold text-slate-900">Rp {data.subtotal.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex items-start gap-1">
            <span className="text-slate-400 font-medium shrink-0">Ket:</span>
            <span className={data.singleItem?.note ? 'text-slate-700 italic' : 'text-slate-400 italic'}>
              {data.singleItem?.note || '-'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
