import React, { useState } from 'react';
import { Modal } from '../../common/Modal';
import { User } from '../../../types';
import { Clock, Users, UserCheck, Check, X } from 'lucide-react';

interface UserApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  allUsers: User[];
  currentUser: User;
  onApproveUser: (userId: string) => void;
  onRejectUser: (userId: string) => void;
  processingUserId: string | null;
}

export const UserApprovalModal: React.FC<UserApprovalModalProps> = ({
  isOpen,
  onClose,
  allUsers,
  currentUser,
  onApproveUser,
  onRejectUser,
  processingUserId,
}) => {
  const [tab, setTab] = useState<'PENDING' | 'ALL'>('PENDING');

  if (!isOpen) return null;

  const pendingUsers = allUsers.filter(u => u.status === 'PENDING');
  const displayUsers = tab === 'PENDING' ? pendingUsers : allUsers;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Persetujuan & Manajemen Akun Pengguna"
      size="xl"
    >
      <div className="space-y-4">
        {/* Tab switch */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            type="button"
            onClick={() => setTab('PENDING')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              tab === 'PENDING'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Menunggu Persetujuan ({pendingUsers.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('ALL')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              tab === 'ALL'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Semua Pengguna ({allUsers.length})</span>
          </button>
        </div>

        {/* User List */}
        {displayUsers.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
            <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <span>
              {tab === 'PENDING'
                ? 'Tidak ada pendaftaran pengguna baru yang menunggu persetujuan.'
                : 'Belum ada pengguna terdaftar.'}
            </span>
          </div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {displayUsers.map((u) => {
              const isProcessing = processingUserId === u.id;
              const isSelf = u.id === currentUser.id;

              return (
                <div
                  key={u.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">{u.name}</span>
                      {u.username && (
                        <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          @{u.username}
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        u.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : u.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {u.status === 'ACTIVE' ? 'Aktif' : u.status === 'PENDING' ? 'Menunggu ACC' : 'Non-Aktif'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                      <span>{u.email}</span>
                      <span>•</span>
                      <span className="font-semibold text-slate-700">{u.role}</span>
                      {u.branchName && (
                        <>
                          <span>•</span>
                          <span className="text-slate-600">{u.branchName}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {u.status === 'PENDING' && (
                      <>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => onApproveUser(u.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Setujui (ACC)</span>
                        </button>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => onRejectUser(u.id)}
                          className="px-3 py-1.5 bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Tolak</span>
                        </button>
                      </>
                    )}

                    {u.status === 'ACTIVE' && !isSelf && (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => onRejectUser(u.id)}
                        className="px-2.5 py-1 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
                      >
                        Nonaktifkan
                      </button>
                    )}

                    {u.status === 'INACTIVE' && (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => onApproveUser(u.id)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Aktifkan Kembali</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </Modal>
  );
};
