import { DenomConfig, CashReport, DenomBreakdownItem } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';

export { formatCurrency };

export const getShortLabel = (master: DenomConfig): string => {
  if (master.type === 'KOIN') return 'Koin';
  if (master.type === 'MIX') return 'MIX';
  if (master.nominal) {
    if (master.nominal >= 1000) {
      return `${master.nominal / 1000}K`;
    }
    return String(master.nominal);
  }
  return master.label;
};

export const getDenomDataFromReport = (
  activeReport: CashReport | null,
  master: DenomConfig
): { subtotal: number; calculatedPcs?: number; breakdown?: DenomBreakdownItem[] } => {
  if (!activeReport?.denominations) return { subtotal: 0, calculatedPcs: 0, breakdown: [] };

  const found = activeReport.denominations.find((d) => 
    d.denomId === master.id ||
    (d.denomCode && d.denomCode.toUpperCase() === master.code.toUpperCase()) ||
    (master.nominal && d.denomValue === master.nominal)
  );

  if (!found) {
    return { subtotal: 0, calculatedPcs: 0, breakdown: [] };
  }

  const subtotal = found.subtotal || 0;
  const calculatedPcs = (master.type === 'KERTAS' && master.nominal && master.nominal > 0)
    ? Math.floor(subtotal / master.nominal)
    : undefined;

  return {
    subtotal,
    calculatedPcs: found.calculatedPcs !== undefined ? found.calculatedPcs : calculatedPcs,
    breakdown: found.breakdown || [],
  };
};
