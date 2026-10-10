import React from 'react';
import { Modal } from '../../common/Modal';
import { CashReport, CashDenominationItem } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

interface ForceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: CashReport | null;
  denoms: CashDenominationItem[];
  onChangeDenomSubtotal: (denomId: string, rawVal: string) => void;
  computerCashTunai: string;
  setComputerCashTunai: (val: string) => void;
  computerCashNonTunai: string;
  setComputerCashNonTunai: (val: string) => void;
  reason: string;
  setReason: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const ForceEditModal: React.FC<ForceEditModalProps> = ({
  isOpen,
  onClose,
  report,
  denoms,
  onChangeDenomSubtotal,
  computerCashTunai,
  setComputerCashTunai,
  computerCashNonTunai,
  setComputerCashNonTunai,
  reason,
  setReason,
  onSubmit,
}) => {
  if (!isOpen || !report) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Force Edit: ${report.reportNumber}`}
      subtitle="Koreksi khusus untuk laporan yang sudah APPROVED. Alasan perubahan wajib dicatat dalam Audit Log."
      maxWidth="2xl"
    >
      <form onSubmit={onSubmit} className="space-y-4 text-xs">
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block">Perhatian Khusus Audit Pusat:</strong>
              Laporan ini telah berstatus <strong>APPROVED</strong> dan terkunci. Setiap perubahan data denominasi atau Computer Cash akan dicatat secara permanen di <strong>Audit Log</strong> lengkap dengan data Sebelum & Sesudah.
            </div>
          </div>
        </div>

        {/* Mandatory Reason Input */}
        <div>
          <label className="font-bold text-slate-800 block mb-1">
            Alasan Force Edit (Wajib Sesuai PRD) *
          </label>
          <input
            id="input-force-edit-reason"
            type="text"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Contoh: Koreksi audit brankas ditemukan selip 2 lembar Rp 100.000 pada register 1"
            className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
          />
        </div>

        {/* Denomination Adjustments */}
        <div>
          <label className="font-bold text-slate-800 block mb-2">
            Koreksi Total Nominal Pecahan Uang Tunai (Rp):
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200">
            {denoms.map((d, idx) => (
              <div key={d.denomId || d.id || idx} className="p-2 bg-white rounded border border-slate-200 flex items-center justify-between gap-2">
                <div className="leading-tight">
                  <span className="font-bold text-slate-800 text-xs block">
                    {d.denomLabel || (d.denomValue ? formatCurrency(d.denomValue) : d.denomCode || 'Pecahan')}
                  </span>
                  {d.calculatedPcs !== undefined && d.calculatedPcs > 0 && (
                    <span className="text-[10px] text-slate-500 font-medium">
                      {d.calculatedPcs.toLocaleString('id-ID')} lbr
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 font-mono text-[10px]">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={d.subtotal === 0 ? '' : d.subtotal.toLocaleString('id-ID')}
                    placeholder="0"
                    onChange={(e) =>
                      onChangeDenomSubtotal(d.denomId || `denom-${d.denomValue}`, e.target.value)
                    }
                    className="w-24 text-right py-1 px-1.5 border border-slate-200 rounded font-mono font-bold text-xs focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Computer Cash Adjustment (Tunai & Non-Tunai) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-bold text-slate-800 block mb-1">
              Koreksi POS Tunai (Rp)
            </label>
            <input
              id="input-force-edit-computer-cash-tunai"
              type="number"
              min="0"
              value={computerCashTunai}
              onChange={(e) => setComputerCashTunai(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg font-mono font-bold focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
              placeholder="0"
            />
          </div>

          <div>
            <label className="font-bold text-slate-800 block mb-1">
              Koreksi POS Non-Tunai (Rp)
            </label>
            <input
              id="input-force-edit-computer-cash-nontunai"
              type="number"
              min="0"
              value={computerCashNonTunai}
              onChange={(e) => setComputerCashNonTunai(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg font-mono font-bold focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
              placeholder="0"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            Batal
          </button>
          <button
            id="btn-confirm-force-edit-submit"
            type="submit"
            className="px-4 py-2 font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" /> Simpan Force Edit & Catat Audit Log
          </button>
        </div>
      </form>
    </Modal>
  );
};
