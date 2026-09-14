import { describe, expect, it } from 'vitest';
import { buildReportPdf, buildReportRows, serializeCsv } from '../src/utils/reportExport';

const report = {
  summary: { revenue: 350000, paidOrders: 2, itemsSold: 3, averageOrderValue: 175000 },
  timeSeries: [{ label: '31 Agu', revenue: 350000, orders: 2, itemsSold: 3 }],
  topProducts: [{ productName: '=SUM(A1:A2)', sku: 'WNA002-S', quantitySold: 3, revenue: 350000 }],
  statusSummary: [{ status: 'paid', label: 'Dibayar', count: 2, revenue: 350000, color: '#16A34A' }],
  startDate: '2026-08-16T00:00:00+07:00',
  endDate: '2026-09-14T23:59:59+07:00',
};

describe('report export', () => {
  it('serializes all report sections as spreadsheet-safe CSV', () => {
    const rows = buildReportRows(
      report.summary,
      report.timeSeries,
      report.topProducts,
      report.statusSummary,
      report.startDate,
      report.endDate,
    );
    const csv = serializeCsv(rows);

    expect(csv.startsWith('\uFEFFLAPORAN PENJUALAN SPARK STAGE\r\n')).toBe(true);
    expect(csv).toContain('STATUS ORDER\r\nStatus,Jumlah Order,Nilai Order');
    expect(csv).toContain("'=SUM(A1:A2),WNA002-S,3");
    expect(csv).toContain('PRODUK TERLARIS');
  });

  it('generates a valid PDF document with report tables', () => {
    const pdf = buildReportPdf(report);
    const bytes = new Uint8Array(pdf.output('arraybuffer'));
    const signature = String.fromCharCode(...bytes.slice(0, 5));

    expect(signature).toBe('%PDF-');
    expect(bytes.byteLength).toBeGreaterThan(5000);
    expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });
});
