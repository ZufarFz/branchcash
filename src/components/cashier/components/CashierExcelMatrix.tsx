import React from 'react';
import { DenomConfig, DenomBreakdownItem, CashReport } from '../../../types';
import { getShortLabel, getDenomDataFromReport } from '../utils/cashierDenomHelpers';
import { CashierCellPopoverData } from '../modals/CashierCellPopover';
import { Plus, Info } from 'lucide-react';

interface CashierExcelMatrixProps {
  activeReport: CashReport | null;
  cashierName: string;
  activeMasterList: DenomConfig[];
  isLocked: boolean;
  activeCellPopover: CashierCellPopoverData | null;
  onCellClick: (e: React.MouseEvent<HTMLElement>, id: string, master: DenomConfig, item: DenomBreakdownItem, isImplicit?: boolean) => void;
  onOpenBreakdownModal: (master: DenomConfig) => void;
}

export const CashierExcelMatrix: React.FC<CashierExcelMatrixProps> = ({
  activeReport,
  cashierName,
  activeMasterList,
  isLocked,
  activeCellPopover,
  onCellClick,
  onOpenBreakdownModal
}) => {
  const maxMatrixRows = Math.max(
    1,
    ...activeMasterList.map((master) => {
      const data = getDenomDataFromReport(activeReport, master);
      const bList = data.breakdown || [];
      if (bList.length > 0) return bList.length;
      if (data.subtotal > 0) return 1;
      return 0;
    })
  );

  return (
    <div className="hidden lg:block space-y-3">
      <div className="border border-slate-300 rounded-xl overflow-hidden shadow-sm bg-white">
        <table className="w-full text-xs border-collapse table-fixed">
          <colgroup>
            <col className="w-[88px] xl:w-[96px]" />
            {activeMasterList.map((m) => (
              <col key={`col-${m.id}`} />
            ))}
          </colgroup>

          <thead>
            <tr className="bg-sky-200 text-sky-950 font-bold border-b-2 border-sky-300">
              <th className="py-2.5 px-2 border-r border-sky-300 text-left bg-sky-300/90 font-mono text-xs shadow-xs text-sky-950 font-black">
                Kasir
              </th>
              {activeMasterList.map((master) => (
                <th key={`m-head-${master.id}`} className="py-2 px-1 border-r border-sky-300 text-center font-mono align-middle bg-sky-200">
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    <div className="flex items-center justify-center gap-1 w-full">
                      <span className="font-extrabold text-sky-950 text-[11px] xl:text-xs tracking-tight">
                        {getShortLabel(master)}
                      </span>
                      <button
                        type="button"
                        title={isLocked ? `Laporan terkunci` : `Tambah rincian ${master.label}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isLocked) {
                            alert('Laporan telah disetujui & terkunci.');
                            return;
                          }
                          onOpenBreakdownModal(master);
                        }}
                        className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors shadow-2xs shrink-0 ${
                          isLocked ? 'bg-sky-400/90 text-sky-900 cursor-not-allowed opacity-75' : 'bg-sky-700 hover:bg-sky-900 text-white cursor-pointer'
                        }`}
                      >
                        <Plus className="w-2.5 h-2.5 stroke-[3]" />
                      </button>
                    </div>
                    <span className="text-[8px] font-bold text-sky-900 bg-sky-300/80 px-1 py-0.2 rounded uppercase tracking-wider border border-sky-400/40">
                      {master.type}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 font-mono text-slate-800">
            {Array.from({ length: maxMatrixRows }).map((_, rowIndex) => (
              <tr key={`m-row-${rowIndex}`} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                <td className="py-2 px-2 font-semibold text-slate-700 border-r border-slate-200 bg-slate-50/90 select-none truncate text-[11px]">
                  {rowIndex === 0 ? (
                    <span className="font-bold text-slate-900 block truncate" title={cashierName}>
                      {cashierName}
                    </span>
                  ) : (
                    <span className="text-slate-500 text-[10px] block">
                      Rincian #{rowIndex + 1}
                    </span>
                  )}
                </td>

                {activeMasterList.map((master) => {
                  const denomData = getDenomDataFromReport(activeReport, master);
                  const bList = denomData.breakdown || [];
                  
                  let item: DenomBreakdownItem | undefined = bList[rowIndex];
                  if (!item && rowIndex === 0 && bList.length === 0 && denomData.subtotal > 0) {
                    item = {
                      id: `implicit-${master.id}`,
                      subtotal: denomData.subtotal,
                      calculatedPcs: denomData.calculatedPcs,
                    };
                  }

                  const cellId = `m-cell-${master.id}-${rowIndex}`;
                  const isActive = activeCellPopover?.id === cellId;

                  return (
                    <td key={cellId} className="py-1.5 px-0.5 text-right border-r border-slate-200 overflow-hidden">
                      {item ? (
                        <button
                          type="button"
                          onClick={(e) => onCellClick(e, cellId, master, item!, item!.id.startsWith('implicit-'))}
                          className={`w-full font-extrabold rounded px-1 py-1 transition-all cursor-pointer text-right group ${
                            isActive ? 'bg-sky-100 text-sky-950 ring-2 ring-sky-500 shadow-xs' : 'text-slate-900 hover:text-sky-800 hover:bg-sky-50'
                          }`}
                          title="Klik untuk melihat / edit rincian"
                        >
                          <span className="truncate text-[11px] font-mono group-hover:underline">
                            {item.subtotal.toLocaleString('id-ID')}
                          </span>
                        </button>
                      ) : (
                        <span className="text-slate-300 text-center block text-[11px] select-none">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr className="bg-sky-200/90 text-slate-900 font-bold border-t-2 border-sky-400 shadow-2xs">
              <td className="py-2.5 px-2 border-r border-sky-300 text-left font-black text-sky-950 bg-sky-300 text-[11px] uppercase tracking-wider">
                TOTAL
              </td>
              {activeMasterList.map((master) => {
                const denomData = getDenomDataFromReport(activeReport, master);
                const subtotal = denomData.subtotal;
                return (
                  <td key={`m-total-${master.id}`} className="py-2 px-1 text-right border-r border-sky-300 font-mono text-[11px] font-extrabold bg-sky-100/90 text-slate-900">
                    {subtotal > 0 ? (
                      <div>
                        <div className="text-slate-900 font-bold truncate">
                          {subtotal.toLocaleString('id-ID')}
                        </div>
                        {master.type === 'KERTAS' && master.nominal && master.nominal > 0 && (
                          <div className="text-[9px] text-slate-500 font-normal truncate">
                            {(denomData.calculatedPcs || Math.floor(subtotal / master.nominal)).toLocaleString('id-ID')} lbr
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 font-normal text-[11px]">-</span>
                    )}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="p-2.5 bg-sky-50/80 rounded-xl border border-sky-100 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-sky-700 shrink-0" />
          <span className="text-[11px]">
            Gunakan tombol <strong>+</strong> pada judul kolom pecahan untuk menambah rincian baru.
          </span>
        </div>
      </div>
    </div>
  );
};
