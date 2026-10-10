import React from 'react';
import { Branch } from '../../../types';
import { Filter, Search } from 'lucide-react';

interface AuditPusatFilterBarProps {
  selectedBranch: string;
  setSelectedBranch: (val: string) => void;
  selectedStatus: string;
  setSelectedStatus: (val: string) => void;
  dateFilter: string;
  setDateFilter: (val: string) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  branches: Branch[];
}

export const AuditPusatFilterBar: React.FC<AuditPusatFilterBarProps> = ({
  selectedBranch,
  setSelectedBranch,
  selectedStatus,
  setSelectedStatus,
  dateFilter,
  setDateFilter,
  searchQuery,
  setSearchQuery,
  branches,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
        <Filter className="w-4 h-4 text-slate-500" />
        <span>Filter Laporan Kas Seluruh Cabang:</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Cabang */}
        <div>
          <label className="text-[11px] font-semibold text-slate-500 block mb-1">Cabang</label>
          <select
            id="filter-audit-branch"
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer"
          >
            <option value="ALL">Semua Cabang</option>
            {branches.map((b) => (
              <option key={b.id} value={b.code}>
                {b.code} - {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="text-[11px] font-semibold text-slate-500 block mb-1">Status Laporan</label>
          <select
            id="filter-audit-status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer"
          >
            <option value="ALL">Semua Status</option>
            <option value="DRAFT">Draft / Menunggu Approval (DRAFT)</option>
            <option value="APPROVED">Disetujui (APPROVED / Locked)</option>
            <option value="REJECTED">Ditolak (REJECTED)</option>
          </select>
        </div>

        {/* Tanggal */}
        <div>
          <label className="text-[11px] font-semibold text-slate-500 block mb-1">Tanggal Bisnis</label>
          <input
            id="filter-audit-date"
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer"
          />
        </div>

        {/* Search */}
        <div>
          <label className="text-[11px] font-semibold text-slate-500 block mb-1">Cari Laporan / Kasir</label>
          <div className="relative">
            <input
              id="filter-audit-search"
              type="text"
              placeholder="No. Laporan / Nama Kasir..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs p-2 pl-7 bg-slate-50 border border-slate-200 rounded-lg"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5" />
          </div>
        </div>
      </div>
    </div>
  );
};
