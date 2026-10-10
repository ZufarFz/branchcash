import { DenomConfig, CashReport, DenomBreakdownItem } from '../../../types';

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

export const getReportDenomData = (
  report: CashReport,
  master: DenomConfig
): { subtotal: number; calculatedPcs?: number; breakdown?: DenomBreakdownItem[] } => {
  if (!report?.denominations) return { subtotal: 0, calculatedPcs: 0, breakdown: [] };

  const found = report.denominations.find(
    (d) =>
      d.denomId === master.id ||
      (d.denomCode && d.denomCode.toUpperCase() === master.code.toUpperCase()) ||
      (master.nominal && d.denomValue === master.nominal)
  );

  if (!found) {
    return { subtotal: 0, calculatedPcs: 0, breakdown: [] };
  }

  const subtotal = found.subtotal || 0;
  const calculatedPcs =
    master.type === 'KERTAS' && master.nominal && master.nominal > 0
      ? Math.floor(subtotal / master.nominal)
      : undefined;

  return {
    subtotal,
    calculatedPcs: found.calculatedPcs !== undefined ? found.calculatedPcs : calculatedPcs,
    breakdown: found.breakdown || [],
  };
};

export const getCashierBreakdownRows = (report: CashReport, masterList: DenomConfig[]) => {
  let maxCount = 0;
  masterList.forEach((m) => {
    const d = getReportDenomData(report, m);
    const count = d.breakdown && d.breakdown.length > 0 ? d.breakdown.length : (d.subtotal > 0 ? 1 : 0);
    if (count > maxCount) maxCount = count;
  });

  if (maxCount <= 0) return [];

  const rows: Array<{
    rowIndex: number;
    label: string;
    denoms: Record<string, { subtotal: number }>;
    rowTotal: number;
  }> = [];

  for (let i = 0; i < maxCount; i++) {
    let rowTotal = 0;
    const denoms: Record<string, { subtotal: number }> = {};

    masterList.forEach((m) => {
      const d = getReportDenomData(report, m);
      if (d.breakdown && d.breakdown.length > i) {
        const item = d.breakdown[i];
        denoms[m.id] = { subtotal: item.subtotal || 0 };
        rowTotal += item.subtotal || 0;
      } else if (i === 0 && d.subtotal > 0 && (!d.breakdown || d.breakdown.length === 0)) {
        denoms[m.id] = { subtotal: d.subtotal };
        rowTotal += d.subtotal;
      } else {
        denoms[m.id] = { subtotal: 0 };
      }
    });

    rows.push({
      rowIndex: i + 1,
      label: `Rincian #${i + 1}`,
      denoms,
      rowTotal,
    });
  }

  return rows;
};
