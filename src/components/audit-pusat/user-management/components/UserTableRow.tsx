import React from 'react';
import { User, UserRole } from '../../../../types';
import { Check, X, Pencil } from 'lucide-react';

interface UserTableRowProps {
  user: User;
  currentUser: User;
  isProcessing: boolean;
  onApprove: (userId: string) => void;
  onReject: (userId: string) => void;
  onEdit: (user: User) => void;
}

const ROLE_DISPLAY: Record<UserRole, { label: string; color: string }> = {
  KASIR: { label: 'Kasir', color: 'text-indigo-600' },
  SPV: { label: 'SPV', color: 'text-amber-600' },
  KEPALA_CABANG: { label: 'Kepala Cabang', color: 'text-blue-600' },
  AUDIT_CABANG: { label: 'Audit Cabang', color: 'text-purple-600' },
  PERBANKAN: { label: 'Perbankan', color: 'text-teal-600' },
  AUDIT_PUSAT: { label: 'Audit Pusat', color: 'text-rose-600' },
  AUDIT_PUSAT_ADMIN: { label: 'Super Admin', color: 'text-purple-700' },
};

export const UserTableRow: React.FC<UserTableRowProps> = ({
  user,
  currentUser,
  isProcessing,
  onApprove,
  onReject,
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

  const roleInfo = ROLE_DISPLAY[user.role] || { label: user.role, color: 'text-slate-600' };

  return (
    <tr className="hover:bg-slate-50/70 transition-colors border-b border-slate-100">
      {/* Pengguna */}
      <td className="px-4 py-3.5">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm">{user.name}</span>
            {isSelf && (
              <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                Anda
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 font-mono">
            <span>@{user.username || user.name.toLowerCase().replace(/[^a-z0-9_.]/g, '')}</span>
          </div>
        </div>
      </td>

      {/* Peran (Tanpa Kontainer, Warna Beda) */}
      <td className="px-4 py-3.5 whitespace-nowrap text-xs font-bold">
        <span className={roleInfo.color}>{roleInfo.label}</span>
      </td>

      {/* Cabang */}
      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-600 font-medium">
        {user.branchName || user.branchId || (
          <span className="text-slate-400 italic">Kantor Pusat</span>
        )}
      </td>

      {/* Status (Tanpa Kontainer, Teks + Dot Berwarna) */}
      <td className="px-4 py-3.5 whitespace-nowrap text-xs">
        {user.status === 'ACTIVE' && (
          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Aktif
          </span>
        )}
        {user.status === 'PENDING' && (
          <span className="inline-flex items-center gap-1.5 font-bold text-amber-600">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Menunggu ACC
          </span>
        )}
        {user.status === 'INACTIVE' && (
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Non-Aktif
          </span>
        )}
      </td>

      {/* Terdaftar */}
      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-500 font-mono">
        {formatDate(user.createdAt)}
      </td>

      {/* Aksi (Pending = 3 tombol, Aktif/Non-Aktif = 1 tombol) */}
      <td className="px-4 py-3.5 whitespace-nowrap text-right">
        <div className="inline-flex items-center gap-1 justify-end">
          {isSelf ? (
            <span className="text-[11px] text-slate-400 italic px-2">Akun Anda</span>
          ) : currentUser.role === 'AUDIT_PUSAT' && (user.role === 'AUDIT_PUSAT' || user.role === 'AUDIT_PUSAT_ADMIN') ? (
            <span className="text-[11px] text-slate-400 italic px-2">Hanya Super Admin</span>
          ) : (
            <>
              {/* Tombol Edit (Pensil) - selalu ada */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => onEdit(user)}
                className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/70 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
                title="Edit Data & Otorisasi Pengguna"
              >
                <Pencil className="w-4 h-4" />
              </button>

              {/* Jika akun PENDING: ada tombol Ceklis (Setujui) dan Silang (Tolak) */}
              {user.status === 'PENDING' && (
                <>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => onApprove(user.id)}
                    className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50/70 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
                    title="Setujui Akun (ACC)"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => onReject(user.id)}
                    className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50/70 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
                    title="Tolak Pendaftaran"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  );
};

