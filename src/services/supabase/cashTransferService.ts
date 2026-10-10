import { cashSessionService } from './cashSessionService';
import { cashTransferPairService } from './cashTransferPairService';

export const cashTransferService = {
  // Cash Sessions
  fetchCashSessions: cashSessionService.fetchCashSessions.bind(cashSessionService),
  openCashSession: cashSessionService.openCashSession.bind(cashSessionService),
  updateCashSessionBandar: cashSessionService.updateCashSessionBandar.bind(cashSessionService),

  // Cash Transfers
  fetchCashTransfers: cashTransferPairService.fetchCashTransfers.bind(cashTransferPairService),
  recordCashTransferPair: cashTransferPairService.recordCashTransferPair.bind(cashTransferPairService),
  confirmCashTransferPair: cashTransferPairService.confirmCashTransferPair.bind(cashTransferPairService),
  editAndResubmitTransferPair: cashTransferPairService.editAndResubmitTransferPair.bind(cashTransferPairService),
};

export { cashSessionService, cashTransferPairService };
