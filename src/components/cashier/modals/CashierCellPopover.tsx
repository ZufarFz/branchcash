import React from 'react';
import { DenomConfig, DenomBreakdownItem } from '../../../types';
import { Info, X, Pencil, Trash2 } from 'lucide-react';

export interface CashierCellPopoverData {
  id: string;
  anchorEl: HTMLElement;
  rect: DOMRect;
  master: DenomConfig;
  item: DenomBreakdownItem;
  isImplicit?: boolean;
}

interface CashierCellPopoverProps {
  data: CashierCellPopoverData | null;
  onClose: () => void;
  isLocked: boolean;
  isCashierRole: boolean;
  onEdit: (master: DenomConfig, item: DenomBreakdownItem) => void;
  onDelete: (master: DenomConfig, item: DenomBreakdownItem) => void;
}

export const CashierCellPopover: React.FC<CashierCellPopoverProps> = ({
  data,
  onClose,
  isLocked,
  isCashierRole,
  onEdit,
  onDelete
}) => {
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
      id="light-cashier-cell-popover"
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
      {/* Lancip Arrow pointer */}
      {isPlacementTop ? (
        <div className="absolute pointer-events-none" style={{ left: `${arrowLeft}px`, top: '100%', marginTop: '-1px', width: '16px', height: '8px', zIndex: 30 }}>
          <svg width="16" height="8" viewBox="0 0 16 8" className="block overflow-visible">
            <polygon points="0,0 8,8 16,0" fill="#ffffff" />
            <line x1="1" y1="0" x2="15" y2="0" stroke="#ffffff" strokeWidth="2" />
            <polyline points="0,0 8,8 16,0" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      ) : (
        <div className="absolute pointer-events-none" style={{ left: `${arrowLeft}px`, bottom: '100%', marginBottom: '-1px', width: '16px', height: '8px', zIndex: 30 }}>
          <svg width="16" height="8" viewBox="0 0 16 8" className="block overflow-visible">
            <polygon points="0,8 8,0 16,8" fill="#ffffff" />
            <line x1="1" y1="8" x2="15" y2="8" stroke="#ffffff" strokeWidth="2" />
            <polyline points="0,8 8,0 16,8" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs">
          <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span>Keterangan Pecahan {data.master.label}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Tutup"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Keterangan Content */}
      <div className="py-0.5">
        {data.item.note && data.item.note.trim() !== '' ? (
          <div className="p-2.5 bg-amber-50/80 border border-amber-200/90 rounded-lg text-xs text-slate-800 font-medium leading-relaxed break-words">
            <div className="text-[10px] uppercase font-bold text-amber-800/80 mb-1">Catatan:</div>
            {data.item.note}
          </div>
        ) : (
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-400 italic text-center">
            Tidak ada keterangan
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
        {!isLocked && isCashierRole ? (
          <div className="flex items-center gap-1.5 w-full">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(data.master, data.item);
              }}
              className="flex-1 py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs"
            >
              <Pencil className="w-3 h-3" /> Edit
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onDelete(data.master, data.item);
              }}
              className="py-1.5 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" /> Hapus
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        )}
      </div>
    </div>
  );
};
