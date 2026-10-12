import React from 'react';
import { User } from '../../../../types';
import { RoleBadge } from '../../../common/RoleBadge';
import { Check, X, Power, RotateCcw, Pencil } from 'lucide-react';

interface UserTableRowProps {
  user: User;
  currentUser: User;
  isProcessing: boolean;
  onApprove: (userId: string) => void;
  onReject: (userId: string) => void;
  onToggleActive: (userId: string, currentStatus: string) => void;
  onEdit: (user: User) => void;
}

export const UserTableRow: React.FC<UserTableRowProps> = ({
  user,
  currentUser,
  isProcessing,
  onApprove,
  onReject,
  onToggleActive,
  onEdit,
}) => {
  const isSelf = user.id === currentUser.id;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <tr className="hover:bg-slate-50/70 transition-colors border-b border-slate-100">
      <td className="px-4 py-3.5">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm">{user.name}</span>
            {isSelf && (
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold">
                Anda
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-mono">
            {user.username && <span>@{user.username}</span>}
            <span>•</span>
            <span className="font-sans">{user.email}</span>
          </div>
        </div>
      </td>

      <td className="px-4 py-3.5 whitespace-nowrap">
        <RoleBadge role={user.role} />
      </td>

      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-600 font-medium">
        {user.branchName || user.branchId || (
          <span className="text-slate-400 italic">Kantor Pusat</span>
        )}
      </td>

      <td className="px-4 py-3.5 whitespace-nowrap">
        {user.status === 'ACTIVE' && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Aktif
          </span>
        )}
        {user.status === 'PENDING' && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Menunggu ACC
          </span>
        )}
        {user.status === 'INACTIVE' && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Non-Aktif
          </span>
        )}
      </td>

      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-500 font-mono">
        {formatDate(user.createdAt)}
      </td>

      <td className="px-4 py-3.5 whitespace-nowrap text-right">
        <div className="inline-flex items-center gap-1.5">
          {isSelf ? (
            <span className="text-[11px] text-slate-400 italic px-2">Akun Anda</span>
          ) : currentUser.role === 'AUDIT_PUSAT' && (user.role === 'AUDIT_PUSAT' || user.role === 'AUDIT_PUSAT_ADMIN') ? (
            <span className="text-[11px] text-slate-400 italic px-2">Hanya Super Admin</span>
          ) : (
            <>
              {/* Tombol Edit Profil/Peran/Cabang */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => onEdit(user)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors disabled:opacity-50 cursor-pointer"
                title="Edit Data & Otorisasi Pengguna"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>

              {user.status === 'PENDING' ? (
                <>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => onApprove(user.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Setujui</span>
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => onReject(user.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Tolak</span>
                  </button>
                </>
              ) : user.status === 'ACTIVE' ? (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => onToggleActive(user.id, 'ACTIVE')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Power className="w-3.5 h-3.5 text-amber-600" />
                  <span>Nonaktifkan</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => onToggleActive(user.id, 'INACTIVE')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Aktifkan</span>
                </button>
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  );
};
