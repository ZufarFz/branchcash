import React, { useState, useEffect } from 'react';
import { CashReport } from '../../../../types';
import { formatCurrency } from '../../../../utils/formatters';
import { Save, Check, ExternalLink, Loader2 } from 'lucide-react';

interface AuditDashboardPosTableProps {
  reports: CashReport[];
  isAuditCabangRole: boolean;
  onSaveRowPos: (reportId: string, tunai: number, nonTunai: number) => Promise<{ success: boolean; message?: string }>;
  onOpenModal: (report: CashReport) => void;
}

export const AuditDashboardPosTable: React.FC<AuditDashboardPosTableProps> = ({
  reports,
  isAuditCabangRole,
  onSaveRowPos,
  onOpenModal,
}) => {
  // Local state map for inline editing: [reportId]: { tunai: string, nonTunai: string, isDirty: boolean, isSaving: boolean, isSuccess: boolean }
  const [rowInputs, setRowInputs] = useState<Record<string, {
    tunai: string;
    nonTunai: string;
    isDirty: boolean;
    isSaving: boolean;
    isSuccess: boolean;
  }>>({});

  useEffect(() => {
    const nextInputs: Record<string, any> = {};
    reports.forEach((r) => {
      const rawTunai = r.computerCashTunai !== null && r.computerCashTunai !== undefined
        ? r.computerCashTunai
        : (r.computerCashTotal ? r.computerCashTotal : 0);
      const rawNonTunai = r.computerCashNonTunai !== null && r.computerCashNonTunai !== undefined
        ? r.computerCashNonTunai
        : 0;

      nextInputs[r.id] = {
        tunai: rawTunai > 0 ? rawTunai.toString() : (r.computerCashTunai === 0 ? '0' : ''),
        nonTunai: rawNonTunai > 0 ? rawNonTunai.toString() : (r.computerCashNonTunai === 0 ? '0' : ''),
        isDirty: false,
        isSaving: false,
        isSuccess: false,
      };
    });
    setRowInputs(nextInputs);
  }, [reports]);

  const handleInputChange = (reportId: string, field: 'tunai' | 'nonTunai', value: string) => {
    setRowInputs((prev) => {
      const current = prev[reportId] || { tunai: '', nonTunai: '', isDirty: false, isSaving: false, isSuccess: false };
      return {
        ...prev,
        [reportId]: {
          ...current,
          [field]: value,
          isDirty: true,
          isSuccess: false,
        },
      };
    });
  };

  const handleSaveRow = async (reportId: string) => {
    const row = rowInputs[reportId];
    if (!row || !isAuditCabangRole) return;

    const numTunai = parseFloat(row.tunai.replace(/[^0-9]/g, '')) || 0;
    const numNonTunai = parseFloat(row.nonTunai.replace(/[^0-9]/g, '')) || 0;

    setRowInputs((prev) => ({
      ...prev,
      [reportId]: { ...prev[reportId], isSaving: true },
    }));

    const res = await onSaveRowPos(reportId, numTunai, numNonTunai);

    setRowInputs((prev) => ({
      ...prev,
      [reportId]: {
        ...prev[reportId],
        isSaving: false,
        isDirty: !res.success,
        isSuccess: res.success,
      },
    }));

    if (res.success) {
      setTimeout(() => {
        setRowInputs((prev) => {
          if (!prev[reportId]) return prev;
          return { ...prev, [reportId]: { ...prev[reportId], isSuccess: false } };
        });
      }, 2500);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Input Kas Komputer (POS) & Rekonsiliasi Real-Time Kasir ({reports.length})
        </h4>
        <span className="text-[11px] text-slate-500 font-semibold">
          Ketik angka langsung di tabel & tekan simpan
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3">Kasir & Laporan</th>
              <th className="py-2.5 px-3 text-right">Kas Fisik (Tunai)</th>
              <th className="py-2.5 px-3 text-right">Kas Fisik (Non-Tunai)</th>
              <th className="py-2.5 px-3 text-right font-black text-slate-900">Total Fisik</th>
              <th className="py-2.5 px-3 text-center w-36">POS Tunai (Rp)</th>
              <th className="py-2.5 px-3 text-center w-36">POS Non-Tunai (Rp)</th>
              <th className="py-2.5 px-3 text-right font-black text-purple-900">Total POS</th>
              <th className="py-2.5 px-3 text-center">Selisih</th>
              <th className="py-2.5 px-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {reports.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                  Belum ada laporan kasir yang masuk pada tanggal ini.
                </td>
              </tr>
            ) : (
              reports.map((r) => {
                const row = rowInputs[r.id] || { tunai: '', nonTunai: '', isDirty: false, isSaving: false, isSuccess: false };
                const numTunai = parseFloat(row.tunai.replace(/[^0-9]/g, '')) || 0;
                const numNonTunai = parseFloat(row.nonTunai.replace(/[^0-9]/g, '')) || 0;
                const currentTotalPos = numTunai + numNonTunai;
                const currentVariance = r.totalPhysical - currentTotalPos;

                const isKlop = (row.tunai !== '' || row.nonTunai !== '' || r.computerCashTotal !== null) && currentVariance === 0;
                const isMinus = (row.tunai !== '' || row.nonTunai !== '' || r.computerCashTotal !== null) && currentVariance < 0;
                const isPlus = (row.tunai !== '' || row.nonTunai !== '' || r.computerCashTotal !== null) && currentVariance > 0;
                const hasPos = row.tunai !== '' || row.nonTunai !== '' || r.computerCashTotal !== null;

                return (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Kasir & Laporan */}
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{r.cashierName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {r.reportNumber || 'Belum Submit'} • <span className={`font-semibold ${
                          r.status === 'APPROVED' ? 'text-emerald-600' : r.status === 'REJECTED' ? 'text-rose-600' : 'text-amber-600'
                        }`}>{r.status}</span>
                      </div>
                    </td>

                    {/* Fisik Tunai */}
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-700">
                      {formatCurrency(r.totalCash)}
                    </td>

                    {/* Fisik Non Tunai */}
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-teal-700">
                      {formatCurrency(r.totalNonCash)}
                    </td>

                    {/* Total Fisik */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 bg-slate-50/50">
                      {formatCurrency(r.totalPhysical)}
                    </td>

                    {/* Input POS Tunai */}
                    <td className="py-2 px-2 text-center">
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={row.tunai}
                          onChange={(e) => handleInputChange(r.id, 'tunai', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRow(r.id);
                          }}
                          disabled={!isAuditCabangRole || row.isSaving}
                          className="w-full text-xs font-mono font-bold text-right px-2 py-1 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-purple-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </div>
                    </td>

                    {/* Input POS Non Tunai */}
                    <td className="py-2 px-2 text-center">
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={row.nonTunai}
                          onChange={(e) => handleInputChange(r.id, 'nonTunai', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRow(r.id);
                          }}
                          disabled={!isAuditCabangRole || row.isSaving}
                          className="w-full text-xs font-mono font-bold text-right px-2 py-1 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-purple-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </div>
                    </td>

                    {/* Total POS Komputer */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-900 bg-purple-50/30">
                      {hasPos ? formatCurrency(currentTotalPos) : <span className="text-slate-400 italic font-normal text-[11px]">Belum diisi</span>}
                    </td>

                    {/* Selisih Real-time */}
                    <td className="py-2.5 px-3 text-center font-mono">
                      {!hasPos ? (
                        <span className="text-slate-400 text-[10px]">-</span>
                      ) : isKlop ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <Check className="w-2.5 h-2.5" /> Klop
                        </span>
                      ) : isMinus ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                          {formatCurrency(currentVariance)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                          +{formatCurrency(currentVariance)}
                        </span>
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="py-2 px-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        {isAuditCabangRole && (
                          <button
                            type="button"
                            onClick={() => handleSaveRow(r.id)}
                            disabled={row.isSaving || (!row.isDirty && !row.isSuccess)}
                            title={row.isDirty ? 'Simpan nilai POS' : 'Tersimpan'}
                            className={`p-1.5 rounded transition-all cursor-pointer ${
                              row.isSuccess
                                ? 'bg-emerald-600 text-white'
                                : row.isDirty
                                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-2xs'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 opacity-60'
                            }`}
                          >
                            {row.isSaving ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : row.isSuccess ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <Save className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onOpenModal(r)}
                          title="Buka modal detail & status"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
