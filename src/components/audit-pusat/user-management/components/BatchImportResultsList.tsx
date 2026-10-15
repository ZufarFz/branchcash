import React from 'react';
import { AdminBatchResultItem } from '../../../../services/supabase/adminAccountActionService';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface BatchImportResultsListProps {
  batchResults: AdminBatchResultItem[];
}

export const BatchImportResultsList: React.FC<BatchImportResultsListProps> = ({ batchResults }) => {
  return (
    <div className="space-y-3">
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
        <h4 className="font-bold text-slate-800 text-xs mb-2">Hasil Eksekusi Pendaftaran:</h4>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {batchResults.map((res, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-white border border-slate-100"
            >
              <div className="flex items-center gap-2">
                {res.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                )}
                <span className="font-bold text-slate-800">
                  {res.name} (@{res.username})
                </span>
              </div>
              <span className={res.success ? 'text-emerald-700 font-bold' : 'text-rose-700 font-semibold'}>
                {res.success ? 'Berhasil Aktif' : res.error || 'Gagal'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
