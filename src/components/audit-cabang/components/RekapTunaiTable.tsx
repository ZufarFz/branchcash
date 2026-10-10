import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { CashReport, DenomConfig } from '../../../types';
import { formatDate } from '../../../utils/formatters';
import { CellPopoverData } from '../modals/CellPopover';
import { getShortLabel, getReportDenomData } from '../utils/auditDenomHelpers';
import { CashierMatrixRow } from './CashierMatrixRow';
import { Coins, Eye, EyeOff, Calculator, Info } from 'lucide-react';

interface RekapTunaiTableProps {
  filteredReports: CashReport[];
  activeMasterList: DenomConfig[];
  isExpandedDetails: boolean;
  setIsExpandedDetails: (val: boolean) => void;
  posColumnMode: 'KOMPUTER' | 'SELISIH';
  setPosColumnMode: (mode: 'KOMPUTER' | 'SELISIH') => void;
  selectedDate: string;
  branchTunaiTotal: number;
  branchPOSTunaiTotal: number;
  activeCellPopover: CellPopoverData | null;
  onCellClick: (e: React.MouseEvent, id: string, cashierName: string, master: DenomConfig, dData: any, singleItem?: any) => void;
  onOpenInputModal: (report: CashReport) => void;
}

export const RekapTunaiTable: React.FC<RekapTunaiTableProps> = ({
  filteredReports,
  activeMasterList,
  isExpandedDetails,
  setIsExpandedDetails,
  posColumnMode,
  setPosColumnMode,
  selectedDate,
  branchTunaiTotal,
  branchPOSTunaiTotal,
  activeCellPopover,
  onCellClick,
  onOpenInputModal
}) => {
  const denomColumnTotals = useMemo(() => {
    const totals: Record<string, { subtotal: number }> = {};
    activeMasterList.forEach((master) => {
      let subtotal = 0;
      filteredReports.forEach((rep) => {
        const dData = getReportDenomData(rep, master);
        subtotal += dData.subtotal || 0;
      });
      totals[master.id] = { subtotal };
    });
    return totals;
  }, [activeMasterList, filteredReports]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
      {/* Sub-Container 1: Header Judul */}
      <div className="bg-sky-50/80 border border-sky-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-sky-100 text-sky-800 rounded-lg shadow-2xs">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              1. Rekapitulasi Kas Fisik Uang Tunai (Format Excel Kasir)
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Pecahan fisik uang tunai ditumpuk per Kasir • Tanggal: <strong>{selectedDate === 'ALL' ? 'Semua Tanggal' : formatDate(selectedDate)}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <span className="text-xs font-bold text-sky-950 bg-sky-100 px-3 py-1.5 rounded-md border border-sky-200 font-mono">
            Total Tunai Cabang: {branchTunaiTotal.toLocaleString('id-ID')}
          </span>

          <button
            id="btn-toggle-unhide-detail"
            type="button"
            onClick={() => setIsExpandedDetails(!isExpandedDetails)}
            className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer border shadow-2xs ${
              isExpandedDetails
                ? 'bg-sky-700 hover:bg-sky-800 text-white border-sky-800 ring-2 ring-sky-300'
                : 'bg-white hover:bg-sky-100 text-sky-900 border-sky-300'
            }`}
            title={isExpandedDetails ? 'Sembunyikan detail rincian kasir' : 'Tampilkan detail per rincian'}
          >
            {isExpandedDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Sub-Container 2: Tabel Matriks Fisik Tunai */}
      <motion.div layout transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
        <div className="w-full overflow-hidden">
          <table className="w-full text-xs text-left border-collapse select-text table-fixed">
            <colgroup>
              <col className="w-[115px] xl:w-[135px]" />
              {activeMasterList.map((m) => (
                <col key={`col-${m.id}`} />
              ))}
              <col className="w-[85px] xl:w-[100px]" />
              <col className="w-[90px] xl:w-[105px]" />
            </colgroup>

            <thead>
              <tr className="bg-sky-200 text-sky-950 font-bold border-b-2 border-sky-300">
                <th className="py-2.5 px-2.5 border-r border-sky-300 text-left bg-sky-300/90 font-mono text-xs text-sky-950 font-black">
                  Kasir / Status
                </th>
                {activeMasterList.map((master) => (
                  <th key={`m-head-${master.id}`} className="py-2 px-1 border-r border-sky-300 text-center font-mono align-middle bg-sky-200">
                    <div className="flex flex-col items-center justify-center gap-0.5">
                      <span className="font-extrabold text-sky-950 text-[11px] xl:text-xs tracking-tight">{getShortLabel(master)}</span>
                      <span className="text-[8px] font-bold text-sky-900 bg-sky-300/80 px-1 py-0.2 rounded uppercase tracking-wider border border-sky-400/40">
                        {master.type}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="py-2.5 px-1.5 border-r border-sky-300 text-right bg-sky-300/90 font-mono text-[11px] xl:text-xs text-sky-950 font-black">
                  Total Tunai
                </th>
                <th className="py-2 px-1.5 text-right bg-sky-300/90 font-mono text-xs select-none text-sky-950 font-black">
                  <div className="flex items-center justify-end gap-1">
                    <span className="font-extrabold text-sky-950 text-[10px] xl:text-[11px] truncate">
                      {posColumnMode === 'KOMPUTER' ? 'Komputer' : 'Selisih'}
                    </span>
                    <button
                      id="btn-switch-komputer-selisih"
                      type="button"
                      onClick={() => setPosColumnMode(posColumnMode === 'KOMPUTER' ? 'SELISIH' : 'KOMPUTER')}
                      className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 ${
                        posColumnMode === 'SELISIH' ? 'bg-purple-700 border-purple-800' : 'bg-sky-200 border-sky-400'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full shadow-xs transition duration-200 ${
                        posColumnMode === 'SELISIH' ? 'translate-x-4 bg-white' : 'translate-x-0.5 bg-slate-800'
                      }`} />
                    </button>
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 font-mono text-slate-800">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={activeMasterList.length + 3} className="py-12 text-center text-slate-400 font-sans">
                    <Calculator className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                    <p className="font-semibold text-slate-600">Belum ada laporan kas kasir untuk tanggal ini</p>
                  </td>
                </tr>
              ) : (
                filteredReports.map((report, rIndex) => (
                  <CashierMatrixRow
                    key={report.id}
                    report={report}
                    rIndex={rIndex}
                    activeMasterList={activeMasterList}
                    isExpandedDetails={isExpandedDetails}
                    posColumnMode={posColumnMode}
                    activeCellPopover={activeCellPopover}
                    onCellClick={onCellClick}
                    onOpenInputModal={onOpenInputModal}
                  />
                ))
              )}
            </tbody>

            <tfoot>
              <tr className="bg-sky-200/90 text-slate-900 font-bold border-t-2 border-sky-400">
                <td className="py-3 px-2.5 border-r border-sky-300 text-left font-black text-sky-950 bg-sky-300 text-xs uppercase tracking-wider truncate">
                  TOTAL TUNAI CABANG
                </td>
                {activeMasterList.map((master) => {
                  const colTotal = denomColumnTotals[master.id] || { subtotal: 0 };
                  return (
                    <td key={`total-col-${master.id}`} className="py-2.5 px-1 text-right border-r border-sky-300 font-mono text-[11px] font-extrabold bg-sky-100/90 text-slate-900">
                      {colTotal.subtotal > 0 ? colTotal.subtotal.toLocaleString('id-ID') : '-'}
                    </td>
                  );
                })}
                <td className="py-3 px-1.5 text-right border-r border-sky-300 font-mono font-black text-indigo-950 bg-sky-300 text-xs truncate">
                  {branchTunaiTotal.toLocaleString('id-ID')}
                </td>
                <td className="py-3 px-1.5 text-right font-mono text-xs bg-sky-300">
                  {posColumnMode === 'KOMPUTER' ? (
                    <span className="font-black text-purple-950 block truncate">{branchPOSTunaiTotal.toLocaleString('id-ID')}</span>
                  ) : (
                    <span className={`font-black block truncate ${branchTunaiTotal - branchPOSTunaiTotal === 0 ? 'text-emerald-800' : branchTunaiTotal - branchPOSTunaiTotal < 0 ? 'text-rose-800' : 'text-blue-800'}`}>
                      {(branchTunaiTotal - branchPOSTunaiTotal) === 0 ? '0' : (branchTunaiTotal - branchPOSTunaiTotal).toLocaleString('id-ID')}
                    </span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </motion.div>

      <div className="bg-purple-50/80 border border-purple-200/90 rounded-xl p-3 sm:px-4 flex items-center gap-3 text-xs text-purple-950 shadow-2xs">
        <div className="w-7 h-7 rounded-lg bg-purple-200/80 text-purple-800 flex items-center justify-center shrink-0">
          <Info className="w-4 h-4" />
        </div>
        <p className="leading-relaxed">
          Audit Cabang klik tombol <strong className="text-purple-900 font-bold">+ Input</strong> pada kolom <strong className="text-purple-900 font-bold">Komputer</strong> untuk menginput nilai cash komputer (POS).
        </p>
      </div>
    </div>
  );
};
