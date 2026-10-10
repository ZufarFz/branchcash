import React, { useState, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import { TransferHeaderCard } from '../components/TransferHeaderCard';
import { TransferMutationLogTable } from '../components/TransferMutationLogTable';
import { ConfirmTransferActionModal } from '../modals/ConfirmTransferActionModal';
import { EditRejectedModalModal } from '../modals/EditRejectedModalModal';
import { CashierCashTransfer } from '../../../types';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

interface CashierTransfersTabProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  onOpenTransferModal: (type: 'MODAL' | 'SETOR') => void;
}

export const CashierTransfersTab: React.FC<CashierTransfersTabProps> = ({
  selectedDate,
  onDateChange,
  onOpenTransferModal
}) => {
  const { 
    currentUser, 
    cashSessions, 
    cashTransfers, 
    confirmCashTransfer, 
    editAndResubmitTransfer,
    refreshFromSupabase 
  } = useApp();

  const currentSession = useMemo(() => {
    return cashSessions.find(
      (s) => (s.branchId === currentUser.branchId || !currentUser.branchId) && s.businessDate === selectedDate
    ) || null;
  }, [cashSessions, currentUser.branchId, selectedDate]);

  const isUserBandar = Boolean(currentSession?.bandarUserId && currentSession.bandarUserId === currentUser.id);

  const myTransfers = useMemo(() => {
    return (cashTransfers || []).filter((t) => {
      const matchBranch = !currentUser.branchId || t.branchId === currentUser.branchId;
      const matchDate = t.businessDate === selectedDate;
      const isMine = t.userId === currentUser.id || t.partnerUserId === currentUser.id;
      return matchBranch && matchDate && isMine;
    });
  }, [cashTransfers, currentUser.branchId, currentUser.id, selectedDate]);

  const totalModalReceived = myTransfers
    .filter((t) => t.userId === currentUser.id && t.transferType === 'MODAL' && t.direction === 'IN' && t.status === 'CONFIRMED')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalModalGiven = myTransfers
    .filter((t) => t.userId === currentUser.id && t.transferType === 'MODAL' && t.direction === 'OUT' && t.status === 'CONFIRMED')
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const totalSetorReceived = myTransfers
    .filter((t) => t.userId === currentUser.id && t.transferType === 'SETOR' && t.direction === 'IN' && t.status === 'CONFIRMED')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalSetorSent = myTransfers
    .filter((t) => t.userId === currentUser.id && t.transferType === 'SETOR' && t.direction === 'OUT' && t.status === 'CONFIRMED')
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const [confirmingTransferId, setConfirmingTransferId] = useState<string | null>(null);
  const [transferFeedbackMessage, setTransferFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [actionTarget, setActionTarget] = useState<{
    tx: CashierCashTransfer;
    action: 'CONFIRM' | 'REJECT';
  } | null>(null);
  const [editingTransferTarget, setEditingTransferTarget] = useState<CashierCashTransfer | null>(null);
  const [isResubmittingTransfer, setIsResubmittingTransfer] = useState<boolean>(false);

  const handleConfirmTransfer = async (transferId: string, action: 'CONFIRM' | 'REJECT') => {
    const targetTx = myTransfers.find(t => t.id === transferId);
    const isModal = targetTx?.transferType === 'MODAL';
    setConfirmingTransferId(transferId);
    try {
      const res = await confirmCashTransfer(transferId, action);
      if (res && !res.success) {
        setTransferFeedbackMessage({ type: 'error', text: res.error || 'Gagal memproses mutasi kas.' });
      } else {
        setTransferFeedbackMessage({
          type: 'success',
          text: action === 'CONFIRM'
            ? `Berhasil menerima ${isModal ? 'modal' : 'setoran'} kas Rp ${targetTx ? Math.abs(targetTx.amount).toLocaleString('id-ID') : ''} dan mengonfirmasi fisik uang!`
            : `Mutasi transfer kas telah ditolak.`
        });
        setTimeout(() => setTransferFeedbackMessage(null), 4000);
      }
    } catch (err: any) {
      setTransferFeedbackMessage({
        type: 'error',
        text: `Gagal memproses konfirmasi transfer: ${err.message || 'Error tidak diketahui'}`
      });
    } finally {
      setConfirmingTransferId(null);
      setActionTarget(null);
    }
  };

  const handleResubmitTransfer = async (newAmount: number, newNotes?: string) => {
    if (!editingTransferTarget) return;
    setIsResubmittingTransfer(true);
    try {
      const res = await editAndResubmitTransfer(editingTransferTarget.id, newAmount, newNotes);
      if (!res.success) {
        setTransferFeedbackMessage({ type: 'error', text: res.error || 'Gagal mengajukan ulang modal kas.' });
      } else {
        setTransferFeedbackMessage({
          type: 'success',
          text: `Berhasil merevisi modal kas menjadi Rp ${newAmount.toLocaleString('id-ID')}. Status kembali PENDING menunggu konfirmasi kasir harian!`
        });
        setEditingTransferTarget(null);
        setTimeout(() => setTransferFeedbackMessage(null), 4000);
      }
    } catch (err: any) {
      setTransferFeedbackMessage({
        type: 'error',
        text: `Error: ${err.message || 'Terjadi kesalahan saat mengajukan ulang'}`
      });
    } finally {
      setIsResubmittingTransfer(false);
    }
  };

  return (
    <div className="space-y-6">
      <TransferHeaderCard
        currentSession={currentSession}
        isUserBandar={isUserBandar}
        selectedDate={selectedDate}
        onDateChange={onDateChange}
        onOpenTransferModal={onOpenTransferModal}
        onRefresh={() => refreshFromSupabase()}
        totalModalGiven={totalModalGiven}
        totalSetorReceived={totalSetorReceived}
        totalModalReceived={totalModalReceived}
        totalSetorSent={totalSetorSent}
      />

      {transferFeedbackMessage && (
        <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 shadow-xs animate-in fade-in ${
          transferFeedbackMessage.type === 'success' ? 'bg-emerald-50 text-emerald-950 border-emerald-300' : 'bg-rose-50 text-rose-950 border-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {transferFeedbackMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span>{transferFeedbackMessage.text}</span>
          </div>
          <button type="button" onClick={() => setTransferFeedbackMessage(null)} className="p-1 hover:bg-black/5 rounded-md cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {currentSession && (
        <TransferMutationLogTable
          myTransfers={myTransfers}
          currentUserId={currentUser.id}
          selectedDate={selectedDate}
          onActionClick={(tx, action) => setActionTarget({ tx, action })}
          onEditClick={(tx) => setEditingTransferTarget(tx)}
        />
      )}

      <ConfirmTransferActionModal
        isOpen={actionTarget !== null}
        transfer={actionTarget?.tx || null}
        action={actionTarget?.action || null}
        isSubmitting={confirmingTransferId !== null}
        onClose={() => setActionTarget(null)}
        onExecute={() => {
          if (actionTarget) {
            handleConfirmTransfer(actionTarget.tx.id, actionTarget.action);
          }
        }}
      />

      <EditRejectedModalModal
        isOpen={editingTransferTarget !== null}
        transfer={editingTransferTarget}
        isSubmitting={isResubmittingTransfer}
        onClose={() => setEditingTransferTarget(null)}
        onSubmit={handleResubmitTransfer}
      />
    </div>
  );
};


