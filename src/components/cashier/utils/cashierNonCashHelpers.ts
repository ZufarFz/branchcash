import { BankOption, PaymentMethodOption, CashReport } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';

export { formatCurrency };

export const formatNumberWithDots = (val: string): string => {
  const digits = val.replace(/\D/g, '');
  if (!digits) return '';
  return new Intl.NumberFormat('id-ID').format(parseInt(digits, 10));
};

export const isBankMatch = (txBank: string, filterCode: string, banks?: BankOption[]) => {
  if (!txBank || !filterCode) return false;
  const tB = txBank.trim().toLowerCase();
  const fC = filterCode.trim().toLowerCase();
  if (tB === fC) return true;
  if (banks) {
    const bObj = banks.find((b) => b.code.toLowerCase() === fC);
    if (bObj) {
      const bName = bObj.name.toLowerCase();
      if (tB === bName) return true;
      if (tB.includes(fC) || bName.includes(tB)) return true;
    }
  }
  return false;
};

export const isMethodMatch = (txMethod: string, filterCode: string, paymentMethods?: PaymentMethodOption[]) => {
  if (!txMethod || !filterCode) return false;
  const tM = txMethod.trim().toLowerCase();
  const fC = filterCode.trim().toLowerCase();
  if (tM === fC) return true;
  if (paymentMethods) {
    const mObj = paymentMethods.find((m) => m.code.toLowerCase() === fC);
    if (mObj) {
      const mName = mObj.name.toLowerCase();
      if (tM === mName) return true;
      if (tM.includes(fC) || mName.includes(tM)) return true;
    }
  }
  return false;
};

export interface BankGroupSummary {
  code: string;
  name: string;
  color: string;
  sortIndex: number;
  subtotal: number;
  count: number;
  methods: Array<{
    code: string;
    name: string;
    sortIndex: number;
    subtotal: number;
    count: number;
  }>;
}

export const getActiveBankGroups = (
  activeReport: CashReport | null,
  banks: BankOption[],
  paymentMethods: PaymentMethodOption[]
): BankGroupSummary[] => {
  const allNonCashTxs = activeReport?.nonCashTransactions || [];

  const resolveBankInfo = (txBank: string) => {
    const clean = (txBank || '').trim();
    const exact = banks.find(
      (b) => b.code.toLowerCase() === clean.toLowerCase() || b.name.toLowerCase() === clean.toLowerCase()
    );
    if (exact) return exact;
    const fuzzy = banks.find((b) => isBankMatch(clean, b.code, banks));
    if (fuzzy) return fuzzy;
    return { id: clean || 'other', code: clean || 'Lainnya', name: clean || 'Bank Lainnya', color: '#0d9488' };
  };

  const resolveMethodInfo = (txMethod: string) => {
    const clean = (txMethod || '').trim();
    const exact = paymentMethods.find(
      (m) => m.code.toLowerCase() === clean.toLowerCase() || m.name.toLowerCase() === clean.toLowerCase()
    );
    if (exact) return exact;
    const fuzzy = paymentMethods.find((m) => isMethodMatch(clean, m.code, paymentMethods));
    if (fuzzy) return fuzzy;
    return { id: clean || 'other', code: clean || 'Lainnya', name: clean || 'Metode Lainnya' };
  };

  const bankMap = new Map<
    string,
    {
      code: string;
      name: string;
      color: string;
      sortIndex: number;
      subtotal: number;
      count: number;
      methodsMap: Map<string, { code: string; name: string; sortIndex: number; subtotal: number; count: number }>;
    }
  >();

  allNonCashTxs.forEach((tx) => {
    if (!tx || !tx.amount || tx.amount <= 0) return;
    const bInfo = resolveBankInfo(tx.bank);
    const mInfo = resolveMethodInfo(tx.paymentMethod);

    const bKey = bInfo.code.toLowerCase();
    const mKey = mInfo.code.toLowerCase();

    const bSortIdx = banks.findIndex((b) => b.code.toLowerCase() === bKey);
    const mSortIdx = paymentMethods.findIndex((m) => m.code.toLowerCase() === mKey);

    if (!bankMap.has(bKey)) {
      bankMap.set(bKey, {
        code: bInfo.code,
        name: bInfo.name,
        color: bInfo.color || '#0d9488',
        sortIndex: bSortIdx === -1 ? 999 : bSortIdx,
        subtotal: 0,
        count: 0,
        methodsMap: new Map(),
      });
    }

    const bGroup = bankMap.get(bKey)!;
    bGroup.subtotal += tx.amount;
    bGroup.count += 1;

    if (!bGroup.methodsMap.has(mKey)) {
      bGroup.methodsMap.set(mKey, {
        code: mInfo.code,
        name: mInfo.name,
        sortIndex: mSortIdx === -1 ? 999 : mSortIdx,
        subtotal: 0,
        count: 0,
      });
    }

    const bmGroup = bGroup.methodsMap.get(mKey)!;
    bmGroup.subtotal += tx.amount;
    bmGroup.count += 1;
  });

  return Array.from(bankMap.values())
    .filter((b) => b.subtotal > 0 && b.count > 0)
    .sort((a, b) => a.sortIndex - b.sortIndex)
    .map((b) => ({
      ...b,
      methods: Array.from(b.methodsMap.values())
        .filter((m) => m.subtotal > 0 && m.count > 0)
        .sort((a, b) => a.sortIndex - b.sortIndex),
    }));
};
