import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CashReport, DenomConfig } from '../../../types';
import { StatusBadge } from '../../common/StatusBadge';
import { CellPopoverData } from '../modals/CellPopover';
import { getReportDenomData, getCashierBreakdownRows } from '../utils/auditDenomHelpers';
import { User as UserIcon, Plus, Pencil } from 'lucide-react';

interface CashierMatrixRowProps {
  report: CashReport;
  rIndex: number;
  activeMasterList: DenomConfig[];
  isExpandedDetails: boolean;
  posColumnMode: 'KOMPUTER' | 'SELISIH';
  activeCellPopover: CellPopoverData | null;
  onCellClick: (e: React.MouseEvent, id: string, cashierName: string, master: DenomConfig, dData: any, singleItem?: any) => void;
  onOpenInputModal: (report: CashReport) => void;
}

export const CashierMatrixRow: React.FC<CashierMatrixRowProps> = ({
  report,
  rIndex,
  activeMasterList,
  isExpandedDetails,
  posColumnMode,
  activeCellPopover,
  onCellClick,
  onOpenInputModal
}) => {
  const hasPOS = report.computerCashTotal !== null && report.computerCashTotal !== undefined && (report.computerCashTunai !== null || report.computerCashTotal > 0);
  const posTunai = report.computerCashTunai !== null && report.computerCashTunai !== undefined 
    ? report.computerCashTunai 
    : (report.computerCashTotal !== null && report.computerCashTotal !== undefined ? report.computerCashTotal : null);
  const expenseAdj = report.totalExpenseAdjustment || 0;
  const incomeAdj = report.totalIncomeAdjustment || 0;
  const expectedTunai = posTunai !== null ? (posTunai - expenseAdj + incomeAdj) : null;
  const selisihTunai = (hasPOS && expectedTunai !== null) ? (report.totalCash - expectedTunai) : null;
  const breakdownRows = isExpandedDetails ? getCashierBreakdownRows(report, activeMasterList) : [];

  return (
    <React.Fragment key={report.id}>
      <tr className={`hover:bg-amber-50/60 transition-colors ${
        isExpandedDetails ? 'bg-amber-50/40 border-t-2 border-amber-200 font-semibold' : rIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
      }`}>
        <td className="py-2.5 px-2.5 font-semibold text-slate-700 border-r border-slate-200 bg-slate-50/90 truncate">
          <div className="flex items-center gap-1.5">
            <UserIcon className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span className="font-bold text-slate-900 block truncate text-xs">{report.cashierName}</span>
          </div>
          <div className="mt-1 flex items-center gap-1 flex-wrap">
            <StatusBadge status={report.status} size="sm" />
            {(expenseAdj > 0 || incomeAdj > 0) && (
              <span 
                className="text-[9px] font-bold font-mono px-1 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300"
                title={`Penyesuaian Ops: -${expenseAdj.toLocaleString('id-ID')} / +${incomeAdj.toLocaleString('id-ID')}`}
              >
                Ops
              </span>
            )}
          </div>
        </td>

        {activeMasterList.map((master) => {
          const dData = getReportDenomData(report, master);
          const hasVal = dData.subtotal > 0;
          const cellId = `cell-${report.id}-${master.id}`;
          const isActive = activeCellPopover?.id === cellId;

          return (
            <td key={cellId} className={`py-1.5 px-0.5 text-right border-r border-slate-200 overflow-hidden ${hasVal ? 'text-slate-900 font-extrabold' : 'text-slate-300'}`}>
              {hasVal ? (
                <button
                  type="button"
                  onClick={(e) => onCellClick(e, cellId, report.cashierName, master, dData)}
                  className={`w-full text-right font-extrabold rounded px-1 py-1 transition-all cursor-pointer group ${
                    isActive ? 'bg-sky-100 text-sky-950 ring-2 ring-sky-500 shadow-xs' : 'text-slate-900 hover:text-sky-800 hover:bg-sky-50'
                  }`}
                >
                  <span className="text-[11px] xl:text-xs font-mono font-bold leading-tight block truncate group-hover:underline">
                    {dData.subtotal.toLocaleString('id-ID')}
                  </span>
                </button>
              ) : (
                <span className="text-center block text-[11px] text-slate-300 select-none">-</span>
              )}
            </td>
          );
        })}

        <td className="py-2.5 px-1.5 text-right border-r border-slate-200 font-mono font-bold text-indigo-700 bg-indigo-50/30 text-xs truncate">
          {report.totalCash.toLocaleString('id-ID')}
        </td>

        <td className="py-2.5 px-1.5 text-right font-mono text-xs">
          {posColumnMode === 'KOMPUTER' ? (
            hasPOS && posTunai !== null ? (
              <button
                type="button"
                onClick={() => onOpenInputModal(report)}
                className="w-full font-bold text-purple-900 hover:text-purple-700 hover:bg-purple-50 p-1 rounded transition-colors text-right cursor-pointer flex items-center justify-end gap-1 group"
              >
                <span className="truncate">{posTunai.toLocaleString('id-ID')}</span>
                <Pencil className="w-3 h-3 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            ) : (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => onOpenInputModal(report)}
                  className="inline-flex items-center justify-center px-2 py-0.5 gap-1 rounded bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] shadow-xs cursor-pointer"
                >
                  <Plus className="w-3 h-3 stroke-[2.5]" />
                  <span>Input</span>
                </button>
              </div>
            )
          ) : (
            selisihTunai !== null ? (
              <span className={`inline-block text-[11px] font-bold font-mono px-1.5 py-0.5 rounded truncate ${
                selisihTunai === 0 ? 'bg-emerald-100 text-emerald-800' : selisihTunai < 0 ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {selisihTunai === 0 ? '0' : selisihTunai.toLocaleString('id-ID')}
              </span>
            ) : (
              <span className="text-slate-400 text-[11px]">-</span>
            )
          )}
        </td>
      </tr>

      <AnimatePresence>
        {isExpandedDetails && breakdownRows.length > 0 && (
          breakdownRows.map((bRow) => (
            <motion.tr
              key={`bRow-${report.id}-${bRow.rowIndex}`}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="bg-amber-50/20 hover:bg-amber-50/40 text-slate-600 text-[11px] border-b border-amber-100/50"
            >
              <td className="py-1.5 px-2.5 border-r border-slate-200 pl-5 bg-slate-50/50 truncate">
                <span className="text-[10px] font-medium text-slate-600 block truncate">↳ {bRow.label}</span>
              </td>
              {activeMasterList.map((master) => {
                const itemData = bRow.denoms[master.id];
                const hasVal = itemData && itemData.subtotal > 0;
                const dData = getReportDenomData(report, master);
                const cellId = `bcell-${report.id}-${bRow.rowIndex}-${master.id}`;
                const isActive = activeCellPopover?.id === cellId;

                return (
                  <td key={cellId} className="py-1.5 px-0.5 text-right border-r border-slate-200 font-mono text-slate-600">
                    {hasVal ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          const bItem = dData.breakdown && dData.breakdown[bRow.rowIndex - 1] ? dData.breakdown[bRow.rowIndex - 1] : undefined;
                          onCellClick(e, cellId, `${report.cashierName} (${bRow.label})`, master, { subtotal: itemData.subtotal, calculatedPcs: bItem?.calculatedPcs, breakdown: bItem ? [bItem] : [] }, bItem);
                        }}
                        className={`w-full text-right font-medium rounded px-1 py-0.5 cursor-pointer ${
                          isActive ? 'bg-sky-100 text-sky-950 ring-2 ring-sky-500' : 'text-slate-800 hover:bg-sky-50'
                        }`}
                      >
                        <span className="text-[10px] font-medium block truncate">{itemData.subtotal.toLocaleString('id-ID')}</span>
                      </button>
                    ) : (
                      <span className="text-center block text-[10px] text-slate-300">-</span>
                    )}
                  </td>
                );
              })}
              <td className="py-1.5 px-1.5 text-right border-r border-slate-200 font-mono font-medium text-indigo-600 bg-indigo-50/10 text-[10px] truncate">
                {bRow.rowTotal > 0 ? bRow.rowTotal.toLocaleString('id-ID') : '0'}
              </td>
              <td className="py-1.5 px-1.5 text-center text-slate-300 text-[10px]">-</td>
            </motion.tr>
          ))
        )}
      </AnimatePresence>
    </React.Fragment>
  );
};
