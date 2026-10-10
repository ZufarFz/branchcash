import React from 'react';
import { BankOption, PaymentMethodOption, CashReport, NonCashTransaction } from '../../../types';
import { BankGroupSummary } from '../utils/cashierNonCashHelpers';
import { AddSingleNonCashModal } from '../modals/AddSingleNonCashModal';
import { BatchNonCashModal } from '../modals/BatchNonCashModal';
import { NonCashDetailModal } from '../modals/NonCashDetailModal';
import { DeleteNonCashModal } from '../modals/DeleteNonCashModal';
import { EditNonCashModal } from '../modals/EditNonCashModal';
import { BreakdownItemModal } from '../modals/BreakdownItemModal';
import { DeleteBreakdownModal } from '../modals/DeleteBreakdownModal';
import { CashierCellPopover } from '../modals/CashierCellPopover';
import { TransferCashModal } from '../modals/TransferCashModal';
import { TransferHistoryModal } from '../modals/TransferHistoryModal';
import { useCashierTransfers } from '../hooks/useCashierTransfers';
import { useCashierDenominations } from '../hooks/useCashierDenominations';
import { useCashierNonCash } from '../hooks/useCashierNonCash';

interface CashierModalsProps {
  activeReport: CashReport | null;
  banks: BankOption[];
  paymentMethods: PaymentMethodOption[];
  selectedDate: string;
  isLocked: boolean;
  isCashierRole: boolean;
  transfers: ReturnType<typeof useCashierTransfers>;
  denoms: ReturnType<typeof useCashierDenominations>;
  nonCash: ReturnType<typeof useCashierNonCash>;
  activeBankGroups: BankGroupSummary[];
  filteredBatchTxs: NonCashTransaction[];
}

export const CashierModals: React.FC<CashierModalsProps> = ({
  activeReport,
  banks,
  paymentMethods,
  selectedDate,
  isLocked,
  isCashierRole,
  transfers,
  denoms,
  nonCash,
  activeBankGroups,
  filteredBatchTxs
}) => {
  return (
    <>
      <AddSingleNonCashModal
        isOpen={nonCash.showAddNonCashModal}
        onClose={() => nonCash.setShowAddNonCashModal(false)}
        onSubmit={nonCash.handleAddNonCash}
        ncBank={nonCash.ncBank}
        setNcBank={nonCash.setNcBank}
        ncMethod={nonCash.ncMethod}
        setNcMethod={nonCash.setNcMethod}
        ncAmount={nonCash.ncAmount}
        setNcAmount={nonCash.setNcAmount}
        banks={banks}
        paymentMethods={paymentMethods}
        isSubmittingNc={nonCash.isSubmittingNc}
      />

      <BatchNonCashModal
        isOpen={nonCash.showBatchNonCashModal}
        onClose={() => {
          nonCash.setShowBatchNonCashModal(false);
          nonCash.setBatchAmountInput('');
        }}
        totalNonCash={activeReport?.totalNonCash || 0}
        activeBankGroups={activeBankGroups}
        banks={banks}
        paymentMethods={paymentMethods}
        batchBank={nonCash.batchBank}
        batchMethod={nonCash.batchMethod}
        onSelectCombo={nonCash.onSelectCombo}
        handleBatchBankChange={nonCash.handleBatchBankChange}
        handleBatchMethodChange={nonCash.handleBatchMethodChange}
        filteredTxs={filteredBatchTxs}
        tableSortField={nonCash.tableSortField}
        tableSortDir={nonCash.tableSortDir}
        handleSort={nonCash.handleSort}
        actMode={nonCash.actMode}
        handleActHeaderClick={nonCash.handleActHeaderClick}
        lastAddedTxId={nonCash.lastAddedTxId}
        savingTxIds={nonCash.savingTxIds}
        handleRetrySaveTx={nonCash.handleRetrySaveTx}
        setTxToDelete={nonCash.setTxToDelete}
        handleStartEdit={nonCash.handleStartEdit}
        batchInputRef={nonCash.batchInputRef}
        batchAmountInput={nonCash.batchAmountInput}
        setBatchAmountInput={nonCash.setBatchAmountInput}
        handleBatchSubmit={nonCash.handleBatchSubmit}
      />

      <NonCashDetailModal
        detail={nonCash.selectedBankMethodDetail}
        onClose={() => nonCash.setSelectedBankMethodDetail(null)}
        transactions={activeReport?.nonCashTransactions || []}
      />

      <DeleteNonCashModal
        txToDelete={nonCash.txToDelete}
        onClose={() => nonCash.setTxToDelete(null)}
        onConfirm={nonCash.handleConfirmDeleteNonCash}
      />

      <EditNonCashModal
        txToEdit={nonCash.txToEdit}
        onClose={() => nonCash.setTxToEdit(null)}
        onSave={nonCash.handleSaveEdit}
        editAmountInput={nonCash.editAmountInput}
        setEditAmountInput={nonCash.setEditAmountInput}
        isSubmittingEdit={nonCash.isSubmittingEdit}
      />

      <BreakdownItemModal
        activeBreakdownMaster={denoms.activeBreakdownMaster}
        editingBreakdownItem={denoms.editingBreakdownItem}
        inputSubtotalNominal={denoms.inputSubtotalNominal}
        setInputSubtotalNominal={denoms.setInputSubtotalNominal}
        inputBreakdownNote={denoms.inputBreakdownNote}
        setInputBreakdownNote={denoms.setInputBreakdownNote}
        isLocked={isLocked}
        onClose={denoms.handleCloseBreakdownModal}
        onSave={denoms.handleSaveBreakdownItem}
      />

      <DeleteBreakdownModal
        itemToDelete={denoms.itemToDelete}
        onClose={() => denoms.setItemToDelete(null)}
        onConfirm={denoms.handleConfirmDelete}
      />

      <CashierCellPopover
        data={denoms.activeCellPopover}
        onClose={() => denoms.setActiveCellPopover(null)}
        isLocked={isLocked}
        isCashierRole={isCashierRole}
        onEdit={(master, item) => {
          denoms.setActiveCellPopover(null);
          denoms.handleOpenBreakdownModal(master, item);
        }}
        onDelete={(master, item) => {
          denoms.setActiveCellPopover(null);
          denoms.setItemToDelete({
            master,
            itemId: item.id,
            subtotal: item.subtotal,
            note: item.note,
          });
        }}
      />

      <TransferCashModal
        isOpen={transfers.showTransferModal}
        onClose={() => transfers.setShowTransferModal(false)}
        transferTypeMode={transfers.transferTypeMode}
        currentSession={transfers.currentSession}
        peerCashiers={transfers.peerCashiers}
        selectedDate={selectedDate}
      />

      <TransferHistoryModal
        isOpen={transfers.showHistoryModal}
        onClose={() => transfers.setShowHistoryModal(false)}
        selectedDate={selectedDate}
        myTransfers={transfers.myTransfers}
      />
    </>
  );
};
