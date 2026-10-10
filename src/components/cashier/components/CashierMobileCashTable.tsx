import React from 'react';
import { DenomConfig, CashReport } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';
import { getDenomDataFromReport } from '../utils/cashierDenomHelpers';
import { AlertCircle, Layers } from 'lucide-react';

interface CashierMobileCashTableProps {
  activeReport: CashReport | null;
  activeMasterList: DenomConfig[];
  denomErrors: Record<string, string>;
  isLocked: boolean;
  onSubtotalChange: (master: DenomConfig, rawInput: string) => void;
  onQuickAddNominal: (master: DenomConfig, multiplier: number) => void;
  onOpenBreakdownModal: (master: DenomConfig) => void;
}

export const CashierMobileCashTable: React.FC<CashierMobileCashTableProps> = ({
  activeReport,
  activeMasterList,
  denomErrors,
  isLocked,
  onSubtotalChange,
  onQuickAddNominal,
  onOpenBreakdownModal
}) => {
  return (
    <div className="block lg:hidden space-y-3">
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Denominasi</th>
                <th className="py-2.5 px-3 text-right w-44">Total Uang (Rp)</th>
                <th className="py-2.5 px-3 text-center w-28">Hitung Lembar</th>
                <th className="py-2.5 px-3 w-40 text-center">Rincian Multi-Input</th>
                <th className="py-2.5 px-3">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeMasterList.map((master) => {
                const denomInfo = getDenomDataFromReport(activeReport, master);
                const hasError = !!denomErrors[master.id];
                const breakdownList = denomInfo.breakdown || [];

                return (
                  <tr key={master.id} className={`hover:bg-slate-50/60 transition-colors ${hasError ? 'bg-rose-50/40' : ''}`}>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {master.label}
                        </span>
                        {master.type === 'KERTAS' && (
                          <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                            Kertas
                          </span>
                        )}
                        {master.type === 'KOIN' && (
                          <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                            Koin
                          </span>
                        )}
                        {master.type === 'MIX' && (
                          <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
                            Campur
                          </span>
                        )}
                      </div>
                      {hasError && (
                        <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          {denomErrors[master.id]}
                        </p>
                      )}
                    </td>

                    <td className="py-2 px-3 text-right">
                      <div className="space-y-1">
                        <div className="relative flex items-center">
                          <span className="absolute left-2.5 text-slate-400 font-mono text-xs select-none">Rp</span>
                          <input
                            id={`input-denom-subtotal-${master.code}`}
                            type="text"
                            inputMode="numeric"
                            disabled={isLocked}
                            value={denomInfo.subtotal === 0 ? '' : denomInfo.subtotal.toLocaleString('id-ID')}
                            placeholder="0"
                            onChange={(e) => onSubtotalChange(master, e.target.value)}
                            className={`w-full text-right py-1.5 pl-8 pr-2.5 border rounded-lg font-mono text-xs font-bold transition-all focus:outline-hidden ${
                              hasError 
                                ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-2 focus:ring-rose-300' 
                                : 'border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500'
                            } disabled:bg-slate-100 disabled:text-slate-500`}
                          />
                        </div>

                        {!isLocked && master.nominal && master.nominal > 0 && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => onQuickAddNominal(master, 1)}
                              className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                              title={`+1 lembar (${formatCurrency(master.nominal)})`}
                            >
                              +1 lbr
                            </button>
                            <button
                              type="button"
                              onClick={() => onQuickAddNominal(master, 10)}
                              className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                              title={`+10 lembar (${formatCurrency(master.nominal * 10)})`}
                            >
                              +10 lbr
                            </button>
                            <button
                              type="button"
                              onClick={() => onSubtotalChange(master, '0')}
                              className="px-1 py-0.5 text-[10px] font-medium rounded bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-500 transition-colors"
                              title="Reset ke 0"
                            >
                              C
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      {master.type === 'KERTAS' && master.nominal ? (
                        <div className="inline-flex flex-col items-center">
                          <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                            denomInfo.subtotal > 0 && !hasError 
                              ? 'bg-indigo-100 text-indigo-900' 
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {(denomInfo.calculatedPcs || 0).toLocaleString('id-ID')} lbr
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            @{formatCurrency(master.nominal)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>

                    <td className="py-2 px-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <button
                          type="button"
                          id={`btn-open-breakdown-${master.code}`}
                          onClick={() => onOpenBreakdownModal(master)}
                          disabled={isLocked}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all border ${
                            breakdownList.length > 0
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
                          } disabled:opacity-50 disabled:pointer-events-none`}
                        >
                          <Layers className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{breakdownList.length > 0 ? `${breakdownList.length}x Input` : '+ Multi-Input'}</span>
                        </button>
                        {breakdownList.length > 0 && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            {formatCurrency(denomInfo.subtotal)}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-2 px-3">
                      {breakdownList.length > 0 && breakdownList.some(b => b.note) ? (
                        <div className="text-[11px] text-purple-700 italic space-y-0.5">
                          {breakdownList.map((b, i) => b.note ? (
                            <span key={i} className="block truncate max-w-[200px]" title={b.note}>
                              • {b.note}
                            </span>
                          ) : null)}
                        </div>
                      ) : master.type === 'MIX' ? (
                        <span className="text-[11px] text-purple-600 font-medium italic">
                          Gunakan Multi-Input untuk rincian
                        </span>
                      ) : master.type === 'KOIN' ? (
                        <span className="text-[11px] text-slate-500 italic">Total semua koin</span>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50/90 font-bold border-t border-slate-200 text-slate-900">
              <tr>
                <td className="py-3 px-3 font-semibold text-slate-700">Total Akumulasi Fisik Tunai:</td>
                <td className="py-3 px-3 text-right text-indigo-700 text-sm font-mono font-extrabold">
                  {formatCurrency(activeReport?.totalCash || 0)}
                </td>
                <td colSpan={3} className="py-3 px-3 text-xs text-slate-500 font-normal">
                  * Khusus uang kertas, sistem otomatis menghitung lembar.
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
