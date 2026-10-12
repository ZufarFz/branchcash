import React from 'react';
import { Users, Clock, UserCheck, UserX } from 'lucide-react';
import { User } from '../../../../types';

interface UserManagementStatsProps {
  users: User[];
}

export const UserManagementStats: React.FC<UserManagementStatsProps> = ({ users }) => {
  const total = users.length;
  const pending = users.filter((u) => u.status === 'PENDING').length;
  const active = users.filter((u) => u.status === 'ACTIVE').length;
  const inactive = users.filter((u) => u.status === 'INACTIVE').length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
          <Users className="w-5 h-5 text-indigo-600" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Pengguna</p>
          <p className="text-xl font-bold text-slate-900 mt-0.5">{total}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-amber-200/90 shadow-xs flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5 text-amber-600" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-amber-800 uppercase tracking-wider">Menunggu ACC</p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xl font-bold text-amber-900">{pending}</p>
            {pending > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                Butuh ACC
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-emerald-200/90 shadow-xs flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
          <UserCheck className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-emerald-800 uppercase tracking-wider">Akun Aktif</p>
          <p className="text-xl font-bold text-emerald-900 mt-0.5">{active}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
          <UserX className="w-5 h-5 text-slate-600" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Non-Aktif</p>
          <p className="text-xl font-bold text-slate-800 mt-0.5">{inactive}</p>
        </div>
      </div>
    </div>
  );
};
