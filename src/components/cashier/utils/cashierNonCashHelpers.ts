import { BankOption, PaymentMethodOption, CashReport } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';

export { formatCurrency };

export const formatNumberWithDots = (val: string): string => {
  const digits = val.replace(/\D/g, '');
  if (!digits) return '';
  return new Intl.NumberFormat('id-ID').format(parseInt(digits, 10));
};

export const isBankMatch = (txBank: string, filterName: string, banks?: BankOption[]) => {
  if (!txBank || !filterName) return false;
  const tB = (txBank || '').trim().toLowerCase();
  const fN = (filterName || '').trim().toLowerCase();
  if (tB === fN) return true;
  if (banks && Array.isArray(banks)) {
    const bObj = banks.find((b) => (b.name || '').toLowerCase() === fN);
    if (bObj) {
      const bName = (bObj.name || '').toLowerCase();
      if (tB === bName || tB.includes(fN) || fN.includes(tB)) return true;
    }
  }
  return false;
};

export const isMethodMatch = (txMethod: string, filterName: string, paymentMethods?: PaymentMethodOption[]) => {
  if (!txMethod || !filterName) return false;
  const tM = (txMethod || '').trim().toLowerCase();
  const fN = (filterName || '').trim().toLowerCase();
  if (tM === fN) return true;
  if (paymentMethods && Array.isArray(paymentMethods)) {
    const mObj = paymentMethods.find((m) => (m.name || '').toLowerCase() === fN);
    if (mObj) {
      const mName = (mObj.name || '').toLowerCase();
      if (tM === mName || tM.includes(fN) || fN.includes(tM)) return true;
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
  const safeBanks = Array.isArray(banks) ? banks : [];
  const safeMethods = Array.isArray(paymentMethods) ? paymentMethods : [];

  const resolveBankInfo = (txBank: string) => {
    const clean = (txBank || '').trim();
    const cleanLower = clean.toLowerCase();
    const exact = safeBanks.find((b) => (b.name || '').toLowerCase() === cleanLower);
    if (exact) return exact;
    const fuzzy = safeBanks.find((b) => {
      const bName = (b.name || '').toLowerCase();
      return bName.includes(cleanLower) || cleanLower.includes(bName);
    });
    if (fuzzy) return fuzzy;
    return { id: clean || 'other', code: clean || 'Bank Lainnya', name: clean || 'Bank Lainnya', color: '#0d9488' };
  };

  const resolveMethodInfo = (txMethod: string) => {
    const clean = (txMethod || '').trim();
    const cleanLower = clean.toLowerCase();
    const exact = safeMethods.find((m) => (m.name || '').toLowerCase() === cleanLower);
    if (exact) return exact;
    const fuzzy = safeMethods.find((m) => {
      const mName = (m.name || '').toLowerCase();
      return mName.includes(cleanLower) || cleanLower.includes(mName);
    });
    if (fuzzy) return fuzzy;
    return { id: clean || 'other', code: clean || 'Metode Lainnya', name: clean || 'Metode Lainnya' };
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

    const bName = bInfo.name;
    const mName = mInfo.name;
    const bKey = bName.toLowerCase();
    const mKey = mName.toLowerCase();

    const bSortIdx = safeBanks.findIndex((b) => (b.name || '').toLowerCase() === bKey);
    const mSortIdx = safeMethods.findIndex((m) => (m.name || '').toLowerCase() === mKey);

    if (!bankMap.has(bKey)) {
      bankMap.set(bKey, {
        code: bName,
        name: bName,
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
        code: mName,
        name: mName,
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
