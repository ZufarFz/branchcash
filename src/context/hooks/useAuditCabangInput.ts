import React from 'react';
import { CashReport, AuditLogEntry, User } from '../../types';
import { supabaseService } from '../../services/supabaseService';

export const useAuditCabangInput = (
  currentUser: User,
  updateReportsState: (updater: (prev: CashReport[]) => CashReport[]) => void,
  addLog: (
    action: AuditLogEntry['action'],
    report: CashReport,
    summary: string,
    beforeData?: any,
    afterData?: any,
    reason?: string
  ) => void,
  triggerRealtimeBroadcast: () => void
) => {
  const inputComputerCash = async (
    reportId: string, 
    computerCashTunai: number, 
    computerCashNonTunai: number, 
    notes?: string
  ): Promise<{ success: boolean; message: string }> => {
    if (currentUser.role !== 'AUDIT_CABANG') {
      return { success: false, message: 'Hanya role Audit Cabang yang berwenang menginput Computer Cash.' };
    }

    let success = false;
    const totalComp = computerCashTunai + computerCashNonTunai;

    updateReportsState(prev => prev.map(r => {
      if (r.id !== reportId) return r;

      success = true;
      const varianceTunai = r.totalCash - computerCashTunai;
      const varianceNonTunai = r.totalNonCash - computerCashNonTunai;
      const variance = r.totalPhysical - totalComp;
      const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

      const updated: CashReport = {
        ...r,
        computerCashTunai,
        computerCashNonTunai,
        computerCashTotal: totalComp,
        computerCashEnteredBy: currentUser.name,
        computerCashEnteredAt: now,
        notes: notes || r.notes,
        varianceTunai,
        varianceNonTunai,
        variance,
        updatedDate: now,
      };

      addLog(
        'INPUT_COMPUTER_CASH', 
        updated, 
        `Audit Cabang (${currentUser.name}) menginput POS: Tunai Rp ${computerCashTunai.toLocaleString('id-ID')}, Non-Tunai Rp ${computerCashNonTunai.toLocaleString('id-ID')} (Total POS: Rp ${totalComp.toLocaleString('id-ID')})`,
        { computerCashTunai: r.computerCashTunai, computerCashNonTunai: r.computerCashNonTunai, computerCashTotal: r.computerCashTotal },
        { computerCashTunai, computerCashNonTunai, computerCashTotal: totalComp, notes }
      );
      return updated;
    }));

    if (!success) {
      return { success: false, message: 'Laporan tidak ditemukan di daftar.' };
    }

    const res = await supabaseService.inputComputerCash(
      reportId, 
      computerCashTunai, 
      computerCashNonTunai, 
      notes, 
      currentUser.id
    );
    triggerRealtimeBroadcast();

    return res;
  };

  return { inputComputerCash };
};
