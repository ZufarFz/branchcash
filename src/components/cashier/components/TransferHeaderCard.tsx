import React from 'react';
import { formatDate } from '../../../utils/formatters';
import { BranchCashSession } from '../../../types';
import { Send, RefreshCw, AlertTriangle } from 'lucide-react';

interface TransferHeaderCardProps {
  currentSession: BranchCashSession | null;
  isUserBandar: boolean;
  selectedDate: string;
  onDateChange?: (date: string) => void;
  onOpenTransferModal: (type: 'MODAL' | 'SETOR') => void;
  onRefresh: () => void;
  totalModalGiven: number;
  totalSetorReceived: number;
  totalModalReceived: number;
  totalSetorSent: number;
}

export const TransferHeaderCard: React.FC<TransferHeaderCardProps> = ({
  currentSession,
  isUserBandar,
  selectedDate,
  onOpenTransferModal,
  onRefresh,
  totalModalGiven,
  totalSetorReceived,
  totalModalReceived,
  totalSetorSent
}) => {
  if (!currentSession) {
    return (
      <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-amber-950">Sesi Kas Cabang Belum Dibuka</h4>
            <p className="text-xs text-amber-900 leading-relaxed">
              Audit Cabang belum membuka sesi dan menunjuk Kasir Bandar untuk tanggal <strong>{formatDate(selectedDate)}</strong>. Perpindahan modal maupun setoran belum dapat diproses.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={onRefresh}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer shadow-2xs"
            title="Refresh Mutasi"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
              isUserBandar ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-purple-100 text-purple-800 border border-purple-200'
            }`}>
              {isUserBandar ? 'Kasir Bandar Hari Ini' : 'Kasir Harian'}
            </span>
            {!isUserBandar && (
              <span className="text-xs text-slate-600 font-medium">
                Bandar: <strong className="text-slate-900">{currentSession.bandarUserName}</strong>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Sesi Kas Cabang Tanggal {formatDate(selectedDate)} (Dibuka oleh {currentSession.assignedByName || 'Audit Cabang'})
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">

          {isUserBandar ? (
            <button
              type="button"
              onClick={() => onOpenTransferModal('MODAL')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Beri Modal ke Kasir</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenTransferModal('SETOR')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Setor Kas ke Bandar</span>
            </button>
          )}

          <button
            type="button"
            onClick={onRefresh}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            title="Refresh Mutasi"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Metrics Bar Mutasi Kas Sah (CONFIRMED) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
        {isUserBandar ? (
          <>
            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80">
              <span className="text-[11px] text-amber-800 font-semibold block">Total Modal Diserahkan (Sah):</span>
              <span className="text-base font-extrabold text-amber-950 font-mono mt-0.5 block">
                Rp {totalModalGiven.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80">
              <span className="text-[11px] text-emerald-800 font-semibold block">Total Setoran Diterima (Sah):</span>
              <span className="text-base font-extrabold text-emerald-950 font-mono mt-0.5 block">
                Rp {totalSetorReceived.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-600 font-semibold block">Saldo Kas Masuk Bersih:</span>
              <span className="text-base font-extrabold text-slate-900 font-mono mt-0.5 block">
                Rp {(totalSetorReceived - totalModalGiven).toLocaleString('id-ID')}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="p-3 bg-sky-50/70 rounded-xl border border-sky-200/80">
              <span className="text-[11px] text-sky-800 font-semibold block">Modal Diterima dari Bandar (Sah):</span>
              <span className="text-base font-extrabold text-sky-950 font-mono mt-0.5 block">
                Rp {totalModalReceived.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80">
              <span className="text-[11px] text-emerald-800 font-semibold block">Setoran Kas ke Bandar (Sah):</span>
              <span className="text-base font-extrabold text-emerald-950 font-mono mt-0.5 block">
                Rp {totalSetorSent.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-600 font-semibold block">Sisa Modal Bersih:</span>
              <span className="text-base font-extrabold text-slate-900 font-mono mt-0.5 block">
                Rp {(totalModalReceived - totalSetorSent).toLocaleString('id-ID')}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
