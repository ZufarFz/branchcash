import { reportWriteService } from './reportWriteService';
import { reportReviewService } from './reportReviewService';

export const reportMutationService = {
  // Report Write & Computer Cash
  createReport: reportWriteService.createReport.bind(reportWriteService),
  updateDenominations: reportWriteService.updateDenominations.bind(reportWriteService),
  submitReport: reportWriteService.submitReport.bind(reportWriteService),
  inputComputerCash: reportWriteService.inputComputerCash.bind(reportWriteService),

  // Report Review & Approval
  approveReport: reportReviewService.approveReport.bind(reportReviewService),
  rejectReport: reportReviewService.rejectReport.bind(reportReviewService),
  updateReportStatus: reportReviewService.updateReportStatus.bind(reportReviewService),
  forceEditReport: reportReviewService.forceEditReport.bind(reportReviewService),
};

export { reportWriteService, reportReviewService };
