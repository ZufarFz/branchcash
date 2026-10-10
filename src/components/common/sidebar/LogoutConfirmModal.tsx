import React from 'react';
import { Modal } from '../Modal';
import { LogOut } from 'lucide-react';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmLogout: () => void;
  isLoggingOut: boolean;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirmLogout,
  isLoggingOut,
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isLoggingOut && onClose()}
      title="Konfirmasi Keluar Sesi"
      size="sm"
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-600">
          Apakah Anda yakin ingin keluar dari sistem BranchCash? Sesi Anda akan berakhir dan Anda perlu masuk kembali untuk melanjutkan.
        </p>
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            disabled={isLoggingOut}
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            Batal
          </button>
          <button
            id="btn-confirm-logout-action"
            type="button"
            disabled={isLoggingOut}
            onClick={onConfirmLogout}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{isLoggingOut ? 'Sedang Keluar...' : 'Ya, Keluar Sekarang'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
