import { getSupabaseClient, handleJwtError } from './client';
import { CashReport, CashDenominationItem, NonCashTransaction } from '../../types';

export const reportFetchService = {
  /**
   * Fetch all cash reports with denominations and non-cash transactions
   */
  async fetchReports(): Promise<CashReport[] | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
      const { data: reportsData, error: reportsError } = await supabase
        .from('cash_reports')
        .select('*')
        .order('business_date', { ascending: false });

      if (reportsError) {
        if (reportsError.message.toLowerCase().includes('jwt expired')) {
          await handleJwtError(reportsError.message);
        } else {
          console.error('Supabase fetch reports error:', reportsError.message);
        }
        return null;
      }

      if (!reportsData || reportsData.length === 0) {
        return [];
      }

      // Fetch helper metadata for mapping names
      const [branchesRes, usersRes, banksRes, methodsRes, masterDenomsRes] = await Promise.all([
        supabase.from('branches').select('id, code, name'),
        supabase.from('users').select('id, name'),
        supabase.from('banks').select('id, name'),
        supabase.from('payment_methods').select('id, name'),
        supabase.from('master_denoms').select('*'),
      ]);

      const branchesMap = new Map((branchesRes.data || []).map((b: any) => [b.id, b]));
      const usersMap = new Map((usersRes.data || []).map((u: any) => [u.id, u]));
      const banksMap = new Map((banksRes.data || []).map((bk: any) => [bk.id, bk]));
      const methodsMap = new Map((methodsRes.data || []).map((m: any) => [m.id, m]));
      const masterDenomsMap = new Map((masterDenomsRes.data || []).map((md: any) => [String(md.id), md]));

      const reportIds = reportsData.map((r: any) => r.id);

      const { data: denomsData, error: denomsError } = await supabase
        .from('cash_report_denominations')
        .select('*')
        .in('report_id', reportIds);

      if (denomsError) {
        console.warn('Supabase fetch denoms warning:', denomsError.message);
      }

      const { data: nonCashData, error: nonCashError } = await supabase
        .from('non_cash_transactions')
        .select('*')
        .in('report_id', reportIds);

      if (nonCashError) {
        console.warn('Supabase fetch non-cash warning:', nonCashError.message);
      }

      const reports: CashReport[] = reportsData.map((raw: any) => {
        const branchObj = branchesMap.get(raw.branch_id) || {};
        const cashierObj = usersMap.get(raw.cashier_id) || {};

        const rawDenoms = (denomsData || []).filter((d: any) => d.report_id === raw.id);
        const denominations: CashDenominationItem[] = rawDenoms.map((d: any) => {
          const master = d.denom_id ? masterDenomsMap.get(String(d.denom_id)) : null;
          const subtotal = Number(d.subtotal !== undefined && d.subtotal !== null ? d.subtotal : (Number(d.denom_value || 0) * Number(d.quantity || 0)));
          const denomValue = master?.nominal ? Number(master.nominal) : (d.denom_value ? Number(d.denom_value) : undefined);
          const calculatedPcs = denomValue && denomValue > 0 ? Math.floor(subtotal / denomValue) : undefined;
          
          let parsedBreakdown: any = undefined;
          if (Array.isArray(d.breakdown)) {
            parsedBreakdown = d.breakdown;
          } else if (typeof d.breakdown === 'string') {
            try {
              parsedBreakdown = JSON.parse(d.breakdown);
            } catch {
              parsedBreakdown = undefined;
            }
          }

          return {
            id: d.id,
            denomId: String(d.denom_id || (denomValue ? `denom-${denomValue}` : d.id)),
            denomCode: master?.code || (denomValue ? String(denomValue) : undefined),
            denomLabel: master?.label,
            denomType: (master?.type as any) || 'KERTAS',
            denomValue,
            subtotal,
            calculatedPcs,
            breakdown: Array.isArray(parsedBreakdown) ? parsedBreakdown : undefined,
          };
        });

        const rawNonCash = (nonCashData || []).filter((nc: any) => nc.report_id === raw.id);
        const nonCashTransactions: NonCashTransaction[] = rawNonCash.map((nc: any) => {
          const bankObj = banksMap.get(nc.bank_id) || {};
          const methodObj = methodsMap.get(nc.payment_method_id) || {};
          return {
            id: nc.id,
            reportId: nc.report_id,
            bank: bankObj.name || nc.bank_name || nc.bank || 'Bank',
            paymentMethod: methodObj.name || nc.payment_method || 'EDC',
            amount: Number(nc.amount || 0),
            syncStatus: 'SAVED',
          };
        });

        const compTunai = raw.computer_cash_tunai !== null && raw.computer_cash_tunai !== undefined 
          ? Number(raw.computer_cash_tunai) 
          : null;
        const compNonTunai = raw.computer_cash_non_tunai !== null && raw.computer_cash_non_tunai !== undefined 
          ? Number(raw.computer_cash_non_tunai) 
          : null;

        let compTotal: number | null = null;
        if (compTunai !== null || compNonTunai !== null) {
          compTotal = (compTunai || 0) + (compNonTunai || 0);
        } else if (raw.computer_cash_total !== null && raw.computer_cash_total !== undefined) {
          compTotal = Number(raw.computer_cash_total);
        }

        const sumCash = denominations.reduce((acc, curr) => acc + (curr.subtotal || 0), 0);
        const totalCash = sumCash > 0 ? sumCash : Number(raw.total_physical || 0);
        const totalNonCash = Number(raw.total_non_cash || 0);
        const totalPhysical = Number(raw.total_physical || totalCash);
        const calculatedGrandTotal = totalCash + totalNonCash;
        const dateIso = raw.created_at || raw.business_date || new Date().toISOString();

        const expenseAdj = Number(raw.total_expense_adjustment || 0);
        const incomeAdj = Number(raw.total_income_adjustment || 0);
        const expectedCash = compTotal !== null ? (compTotal - expenseAdj + incomeAdj) : null;

        return {
          id: raw.id,
          cashSessionId: raw.cash_session_id || undefined,
          reportNumber: raw.report_number || `CR-${raw.id.slice(0, 8)}`,
          businessDate: raw.business_date,
          branchId: raw.branch_id,
          branchName: branchObj.name || 'Cabang',
          branchCode: branchObj.code || 'CBG',
          cashierId: raw.cashier_id,
          cashierName: cashierObj.name || 'Kasir',
          status: raw.status || 'DRAFT',
          denominations,
          totalCash,
          nonCashTransactions,
          totalNonCash,
          totalPhysical,
          grandTotal: calculatedGrandTotal,
          computerCashTunai: compTunai,
          computerCashNonTunai: compNonTunai,
          computerCashTotal: compTotal,
          totalExpenseAdjustment: expenseAdj,
          totalIncomeAdjustment: incomeAdj,
          varianceTunai: compTunai !== null ? (totalCash - (compTunai - expenseAdj + incomeAdj)) : null,
          varianceNonTunai: compNonTunai !== null ? (totalNonCash - compNonTunai) : null,
          variance: expectedCash !== null ? (calculatedGrandTotal - expectedCash) : 0,
          createdDate: dateIso,
          updatedDate: raw.updated_at || dateIso,
          notes: raw.notes || raw.computer_cash_notes || '',
          verifiedAt: (raw.verified_at || raw.approved_at) ? new Date(raw.verified_at || raw.approved_at).toLocaleString('id-ID') : undefined,
        };
      });

      return reports;
    } catch (err) {
      console.error('Failed to fetch reports from Supabase:', err);
      return null;
    }
  }
};
