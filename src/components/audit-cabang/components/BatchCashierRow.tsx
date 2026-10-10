import React from 'react';
import { CashReport, ReportStatus } from '../../../types';
import { ChevronDown } from 'lucide-react';

interface BatchCashierRowProps {
  report: CashReport;
  idx: number;
  data: { tunai: string; nonTunai: string; notes: string; status: ReportStatus };
  openStatusDropdownId: string | null;
  setOpenStatusDropdownId: (id: string | null) => void;
  onInputChange: (reportId: string, field: 'tunai' | 'nonTunai' | 'notes', value: string) => void;
  onStatusChange: (reportId: string, status: ReportStatus) => void;
}

export const BatchCashierRow: React.FC<BatchCashierRowProps> = ({
  report,
  idx,
  data,
  openStatusDropdownId,
  setOpenStatusDropdownId,
  onInputChange,
  onStatusChange
}) => {
  const numTunai = parseFloat(data.tunai.replace(/[^0-9]/g, '')) || 0;
  const numNonTunai = parseFloat(data.nonTunai.replace(/[^0-9]/g, '')) || 0;
  const totalPOS = numTunai + numNonTunai;
  const currentStatus = data.status || report.status;

  const containerColorStyle = currentStatus === 'APPROVED'
    ? 'bg-emerald-50/70 border-emerald-300/90 shadow-emerald-100/50'
    : currentStatus === 'REJECTED'
    ? 'bg-rose-50/70 border-rose-300/90 shadow-rose-100/50'
    : 'bg-amber-50/70 border-amber-300/90 shadow-amber-100/50';

  const formatDisplayValue = (val: string | undefined): string => {
    if (!val || val === '0') return '';
    const num = Number(val);
    return isNaN(num) || num === 0 ? '' : num.toLocaleString('id-ID');
  };

  return (
    <div className={`rounded-xl border p-3.5 space-y-2.5 transition-all shadow-2xs ${containerColorStyle}`}>
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
            {idx + 1}
          </span>
          <h4 className="font-bold text-slate-900 text-xs">{report.cashierName}</h4>
        </div>

        <div className="flex items-center gap-1.5 relative">
          <label className="text-[10px] text-slate-500 font-medium select-none">Status:</label>
          <button
            type="button"
            onClick={() => setOpenStatusDropdownId(openStatusDropdownId === report.id ? null : report.id)}
            className={`px-2 py-1 rounded-lg border flex items-center gap-1 cursor-pointer font-bold transition-all text-xs shadow-2xs ${
              currentStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200' : currentStatus === 'REJECTED' ? 'bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200' : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
            }`}
          >
            <span className="font-black text-xs">{currentStatus === 'APPROVED' ? 'A' : currentStatus === 'REJECTED' ? 'R' : 'D'}</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>

          {openStatusDropdownId === report.id && (
            <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-xl py-1 min-w-[130px] text-xs font-semibold">
              <button type="button" onClick={() => { onStatusChange(report.id, 'DRAFT'); setOpenStatusDropdownId(null); }} className="w-full text-left px-2.5 py-1.5 flex items-center gap-2 hover:bg-amber-50 text-slate-800">
                <span className="w-5 h-5 rounded bg-amber-100 text-amber-900 font-extrabold flex items-center justify-center text-[10px]">D</span>
                <span>Draft</span>
              </button>
              <button type="button" onClick={() => { onStatusChange(report.id, 'REJECTED'); setOpenStatusDropdownId(null); }} className="w-full text-left px-2.5 py-1.5 flex items-center gap-2 hover:bg-rose-50 text-slate-800">
                <span className="w-5 h-5 rounded bg-rose-100 text-rose-900 font-extrabold flex items-center justify-center text-[10px]">R</span>
                <span>Rejected</span>
              </button>
              <button type="button" onClick={() => { onStatusChange(report.id, 'APPROVED'); setOpenStatusDropdownId(null); }} className="w-full text-left px-2.5 py-1.5 flex items-center gap-2 hover:bg-emerald-50 text-slate-800">
                <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-900 font-extrabold flex items-center justify-center text-[10px]">A</span>
                <span>Approved</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-700 block">Tunai (Kas Computer)*</label>
          <div className="text-[11px] font-mono font-semibold text-slate-700">Rp {report.totalCash.toLocaleString('id-ID')}</div>
          <div className="relative">
            <span className="absolute left-2.5 top-2 text-[11px] text-slate-400 font-mono select-none">Rp</span>
            <input
              type="text"
              inputMode="numeric"
              value={formatDisplayValue(data.tunai)}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, '');
                onInputChange(report.id, 'tunai', raw);
              }}
              placeholder="0"
              className="w-full text-xs font-mono font-bold pl-8 pr-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-hidden bg-white text-slate-900 placeholder:text-slate-300"
            />
          </div>
          <div className="text-[11px] font-mono pt-0.5">
            {(() => {
              const diff = report.totalCash - numTunai;
              if (diff === 0) return <span className="text-emerald-600 font-semibold">Rp 0</span>;
              if (diff > 0) return <span className="text-blue-600 font-semibold">+Rp {diff.toLocaleString('id-ID')}</span>;
              return <span className="text-rose-600 font-semibold">-Rp {Math.abs(diff).toLocaleString('id-ID')}</span>;
            })()}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-700 block">Non-Tunai (Kas Computer)*</label>
          <div className="text-[11px] font-mono font-semibold text-slate-700">Rp {report.totalNonCash.toLocaleString('id-ID')}</div>
          <div className="relative">
            <span className="absolute left-2.5 top-2 text-[11px] text-slate-400 font-mono select-none">Rp</span>
            <input
              type="text"
              inputMode="numeric"
              value={formatDisplayValue(data.nonTunai)}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, '');
                onInputChange(report.id, 'nonTunai', raw);
              }}
              placeholder="0"
              className="w-full text-xs font-mono font-bold pl-8 pr-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-hidden bg-white text-slate-900 placeholder:text-slate-300"
            />
          </div>
          <div className="text-[11px] font-mono pt-0.5">
            {(() => {
              const diff = report.totalNonCash - numNonTunai;
              if (diff === 0) return <span className="text-emerald-600 font-semibold">Rp 0</span>;
              if (diff > 0) return <span className="text-blue-600 font-semibold">+Rp {diff.toLocaleString('id-ID')}</span>;
              return <span className="text-rose-600 font-semibold">-Rp {Math.abs(diff).toLocaleString('id-ID')}</span>;
            })()}
          </div>
        </div>
      </div>

      <div className="bg-purple-50/70 px-2.5 py-1.5 rounded-lg border border-purple-100/80 flex items-center justify-between text-xs">
        <span className="text-slate-600 text-[11px] font-medium">Total Kas Computer:</span>
        <span className="font-mono font-bold text-purple-900 text-xs">Rp {totalPOS.toLocaleString('id-ID')}</span>
      </div>

      <div>
        <input
          type="text"
          value={data.notes}
          onChange={(e) => onInputChange(report.id, 'notes', e.target.value)}
          placeholder={currentStatus === 'REJECTED' ? 'Alasan penolakan kasir...' : 'Catatan audit (opsional)...'}
          className="w-full text-[11px] px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-purple-400 focus:outline-hidden text-slate-800 placeholder:text-slate-400"
        />
      </div>
    </div>
  );
};
