import { formatIdr } from '../services/reports';
import type { SalesSummary, SalesTimeSeriesPoint, TopProductRow } from '../services/reports';

function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export function downloadCsv(filename: string, rows: string[][]): void {
  const csv = rows.map((row) => row.map(escapeCsvField).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildReportRows(
  summary: SalesSummary | null,
  timeSeries: SalesTimeSeriesPoint[],
  topProducts: TopProductRow[],
  startDate: string,
  endDate: string,
): string[][] {
  const rows: string[][] = [];

  rows.push(['LAPORAN PENJUALAN SPARK STAGE']);
  rows.push([`Periode: ${startDate.slice(0, 10)} s/d ${endDate.slice(0, 10)}`]);
  rows.push([]);

  rows.push(['RINGKASAN']);
  rows.push(['Total Omzet', formatIdr(summary?.revenue ?? 0)]);
  rows.push(['Order Dibayar', String(summary?.paidOrders ?? 0)]);
  rows.push(['Item Terjual', String(summary?.itemsSold ?? 0)]);
  rows.push(['Rata-rata Order', formatIdr(summary?.averageOrderValue ?? 0)]);
  rows.push([]);

  rows.push(['SERI WAKTU']);
  rows.push(['Periode', 'Omzet', 'Pesanan', 'Item']);
  timeSeries.forEach((p) => {
    rows.push([p.label, formatIdr(p.revenue), String(p.orders), String(p.itemsSold)]);
  });
  rows.push([]);

  rows.push(['PRODUK TERLARIS']);
  rows.push(['Rank', 'Produk', 'SKU', 'Qty Terjual', 'Omzet']);
  topProducts.forEach((p, i) => {
    rows.push([String(i + 1), p.productName, p.sku, String(p.quantitySold), formatIdr(p.revenue)]);
  });

  return rows;
}
