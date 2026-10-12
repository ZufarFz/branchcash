import React, { useState, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import { User, UserRole } from '../../../types';
import { UserManagementStats } from './components/UserManagementStats';
import { UserManagementFilterBar } from './components/UserManagementFilterBar';
import { UserTableRow } from './components/UserTableRow';
import { EditUserModal } from './modals/EditUserModal';
import { Users, RefreshCw, UserCheck } from 'lucide-react';

export const UserManagementView: React.FC = () => {
  const { 
    currentUser, 
    allUsers, 
    branches, 
    approveUser, 
    rejectUser, 
    adminUpdateUser,
    refreshFromSupabase,
    isSyncing 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const visibleUsers = useMemo(() => {
    return (allUsers || []).filter((u) => {
      if (currentUser.role !== 'AUDIT_PUSAT_ADMIN' && u.role === 'AUDIT_PUSAT_ADMIN') {
        return false;
      }
      return true;
    });
  }, [allUsers, currentUser.role]);

  const pendingCount = visibleUsers.filter((u) => u.status === 'PENDING').length;
  const activeCount = visibleUsers.filter((u) => u.status === 'ACTIVE').length;
  const inactiveCount = visibleUsers.filter((u) => u.status === 'INACTIVE').length;

  const filteredUsers = useMemo(() => {
    return visibleUsers.filter((u) => {
      if (statusFilter !== 'ALL' && u.status !== statusFilter) return false;
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (branchFilter !== 'ALL' && u.branchId !== branchFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = u.name.toLowerCase().includes(q);
        const matchEmail = u.email.toLowerCase().includes(q);
        const matchUsername = (u.username || '').toLowerCase().includes(q);
        const matchRole = u.role.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchUsername && !matchRole) return false;
      }
      return true;
    });
  }, [visibleUsers, statusFilter, roleFilter, branchFilter, searchQuery]);

  const showNotification = (text: string, type: 'success' | 'error') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleApprove = async (userId: string) => {
    setProcessingUserId(userId);
    try {
      const res = await approveUser(userId);
      if (res.success) {
        showNotification('Pengguna berhasil disetujui dan diaktifkan.', 'success');
      } else {
        showNotification(res.error || 'Gagal menyetujui pengguna.', 'error');
      }
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleReject = async (userId: string) => {
    if (!window.confirm('Yakin ingin menolak pendaftaran pengguna ini?')) return;
    setProcessingUserId(userId);
    try {
      const res = await rejectUser(userId);
      if (res.success) {
        showNotification('Pengguna berhasil ditolak (status non-aktif).', 'success');
      } else {
        showNotification(res.error || 'Gagal menolak pengguna.', 'error');
      }
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const actionLabel = nextStatus === 'ACTIVE' ? 'mengaktifkan kembali' : 'menonaktifkan';
    if (!window.confirm(`Yakin ingin ${actionLabel} akun pengguna ini?`)) return;

    setProcessingUserId(userId);
    try {
      const res = nextStatus === 'ACTIVE' ? await approveUser(userId) : await rejectUser(userId);
      if (res.success) {
        showNotification(`Akun berhasil di-${actionLabel}.`, 'success');
      } else {
        showNotification(res.error || `Gagal ${actionLabel} akun.`, 'error');
      }
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleSaveEditedUser = async (
    userId: string,
    data: { name: string; role: UserRole; branchId?: string | null; status: 'PENDING' | 'ACTIVE' | 'INACTIVE' }
  ) => {
    setProcessingUserId(userId);
    try {
      const targetUser = allUsers.find((u) => u.id === userId);
      const res = await adminUpdateUser(userId, data, targetUser?.role);
      if (res.success) {
        showNotification('Data pengguna berhasil diperbarui.', 'success');
      } else {
        showNotification(res.error || 'Gagal memperbarui pengguna.', 'error');
      }
    } finally {
      setProcessingUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Manajemen Pengguna</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola status akun, otorisasi peran, penempatan cabang, dan persetujuan (ACC) pendaftaran baru.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => refreshFromSupabase()}
          disabled={isSyncing}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-xs cursor-pointer transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-600' : ''}`} />
          <span>Sinkronkan Data</span>
        </button>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between transition-all ${
          actionMessage.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <span>{actionMessage.text}</span>
          <button type="button" onClick={() => setActionMessage(null)} className="font-bold cursor-pointer">×</button>
        </div>
      )}

      {/* KPI Stats */}
      <UserManagementStats users={visibleUsers} />

      {/* Filter and Tab Section */}
      <UserManagementFilterBar
        totalCount={visibleUsers.length}
        pendingCount={pendingCount}
        activeCount={activeCount}
        inactiveCount={inactiveCount}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        roleFilter={roleFilter}
        setRoleFilter={setRoleFilter}
        branchFilter={branchFilter}
        setBranchFilter={setBranchFilter}
        branches={branches}
        currentUserRole={currentUser.role}
      />

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3">Pengguna</th>
                <th className="px-4 py-3">Peran (Role)</th>
                <th className="px-4 py-3">Cabang</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Terdaftar</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-xs text-slate-500">
                    <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <span>Tidak ada data pengguna yang sesuai dengan filter.</span>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <UserTableRow
                    key={u.id}
                    user={u}
                    currentUser={currentUser}
                    isProcessing={processingUserId === u.id}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onToggleActive={handleToggleActive}
                    onEdit={(target) => {
                      setEditingUser(target);
                      setIsEditModalOpen(true);
                    }}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Edit Pengguna */}
      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingUser(null);
        }}
        user={editingUser}
        branches={branches}
        onSave={handleSaveEditedUser}
        isProcessing={processingUserId !== null}
        currentUserRole={currentUser.role}
      />
    </div>
  );
};
