import React from 'react';
import { Branch } from '../../../../types';
import { Search, Filter, Clock } from 'lucide-react';

interface UserManagementFilterBarProps {
  totalCount: number;
  pendingCount: number;
  activeCount: number;
  inactiveCount: number;
  statusFilter: 'ALL' | 'PENDING' | 'ACTIVE' | 'INACTIVE';
  setStatusFilter: (status: 'ALL' | 'PENDING' | 'ACTIVE' | 'INACTIVE') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  roleFilter: string;
  setRoleFilter: (r: string) => void;
  branchFilter: string;
  setBranchFilter: (b: string) => void;
  branches: Branch[];
  currentUserRole?: string;
}

export const UserManagementFilterBar: React.FC<UserManagementFilterBarProps> = ({
  totalCount,
  pendingCount,
  activeCount,
  inactiveCount,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  roleFilter,
  setRoleFilter,
  branchFilter,
  setBranchFilter,
  branches,
  currentUserRole,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3.5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Segmented Status Tabs */}
        <div className="flex p-1 bg-slate-100 rounded-xl overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'PENDING' ? 'bg-white text-amber-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Menunggu ACC ({pendingCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'ACTIVE' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Aktif ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('INACTIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === 'INACTIVE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Non-Aktif ({inactiveCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, email, username..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder-slate-400 outline-none transition-all"
          />
        </div>
      </div>

      {/* Secondary Filters (Role & Branch) */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 font-medium">
          <Filter className="w-3.5 h-3.5" />
          <span>Filter:</span>
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="ALL">Semua Peran (Role)</option>
          <option value="KASIR">Kasir</option>
          <option value="SPV">SPV</option>
          <option value="KEPALA_CABANG">Kepala Cabang</option>
          <option value="AUDIT_CABANG">Audit Cabang</option>
          <option value="PERBANKAN">Perbankan</option>
          <option value="AUDIT_PUSAT">Audit Pusat</option>
          {currentUserRole === 'AUDIT_PUSAT_ADMIN' && (
            <option value="AUDIT_PUSAT_ADMIN">Super Admin</option>
          )}
        </select>

        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="ALL">Semua Unit Cabang</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.code} - {b.name}
            </option>
          ))}
        </select>

        {(roleFilter !== 'ALL' || branchFilter !== 'ALL' || searchQuery) && (
          <button
            type="button"
            onClick={() => {
              setRoleFilter('ALL');
              setBranchFilter('ALL');
              setSearchQuery('');
            }}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer underline ml-auto"
          >
            Reset Filter
          </button>
        )}
      </div>
    </div>
  );
};
