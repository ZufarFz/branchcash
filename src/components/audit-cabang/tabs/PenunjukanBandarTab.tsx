import React, { useState, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import { BandarAssignmentCard } from '../components/BandarAssignmentCard';
import { BranchSessionsTable } from '../components/BranchSessionsTable';

interface PenunjukanBandarTabProps {
  targetBandarDate?: string;
  onSelectDate?: (date: string) => void;
}

export const PenunjukanBandarTab: React.FC<PenunjukanBandarTabProps> = ({
  targetBandarDate: externalDate,
  onSelectDate
}) => {
  const { 
    currentUser, 
    currentBranch, 
    cashSessions, 
    allUsers, 
    openCashSession, 
    updateCashSessionBandar 
  } = useApp();

  const isAuditCabangRole = currentUser.role === 'AUDIT_CABANG' || currentUser.role === 'AUDIT_PUSAT' || currentUser.role === 'AUDIT_PUSAT_ADMIN';
  const currentBranchId = currentUser.branchId || currentBranch?.id;

  const [internalDate, setInternalDate] = useState<string>(() => {
    return externalDate || new Date().toISOString().split('T')[0];
  });

  const targetBandarDate = externalDate || internalDate;
  const setTargetBandarDate = (date: string) => {
    setInternalDate(date);
    if (onSelectDate) onSelectDate(date);
  };

  const branchSessions = useMemo(() => {
    return cashSessions.filter(
      (s) => s.branchId === currentBranchId || !currentBranchId
    ).sort((a, b) => b.businessDate.localeCompare(a.businessDate));
  }, [cashSessions, currentBranchId]);

  const branchCashiers = useMemo(() => {
    return allUsers.filter(
      (u) => u.role === 'KASIR' && (!currentBranchId || u.branchId === currentBranchId)
    );
  }, [allUsers, currentBranchId]);

  const targetSession = useMemo(() => {
    return cashSessions.find(
      (s) => (s.branchId === currentBranchId || !currentBranchId) && s.businessDate === targetBandarDate
    );
  }, [cashSessions, currentBranchId, targetBandarDate]);

  const isTargetSessionLocked = useMemo(() => {
    if (!targetSession) return false;
    return Boolean(targetSession.transferCount !== undefined && targetSession.transferCount > 0);
  }, [targetSession]);

  const handleSaveBandar = async (selectedBandarId: string) => {
    if (targetSession) {
      return await updateCashSessionBandar(targetSession.id, selectedBandarId);
    }
    return await openCashSession({
      businessDate: targetBandarDate,
      bandarUserId: selectedBandarId,
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <BandarAssignmentCard
        targetBandarDate={targetBandarDate}
        setTargetBandarDate={setTargetBandarDate}
        targetSession={targetSession}
        isTargetSessionLocked={isTargetSessionLocked}
        branchCashiers={branchCashiers}
        isAuditCabangRole={isAuditCabangRole}
        onSaveBandar={handleSaveBandar}
      />
      <BranchSessionsTable
        branchSessions={branchSessions}
        targetBandarDate={targetBandarDate}
        onSelectDate={setTargetBandarDate}
      />
    </div>
  );
};
