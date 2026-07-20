import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { formatIdr } from '../services/reports';
import type { SalesSummary, SalesTimeSeriesPoint, TopProductRow } from '../services/reports';

type AutoTableDocument = jsPDF & {
  lastAutoTable?: {
    finalY?: number;
  };
};

function getLastAutoTableFinalY(pdf: AutoTableDocument, fallback: number): number {
  return pdf.lastAutoTable?.finalY ?? fallback;
}

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

export interface ExportPdfInput {
  summary: SalesSummary | null;
  timeSeries: SalesTimeSeriesPoint[];
  topProducts: TopProductRow[];
  startDate: string;
  endDate: string;
}

export function exportReportToPdf(input: ExportPdfInput): void {
  const { summary, timeSeries, topProducts, startDate, endDate } = input;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'A4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Laporan Penjualan Spark Stage', margin, yPosition);
  yPosition += 8;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const startDateFormatted = startDate.slice(0, 10);
  const endDateFormatted = endDate.slice(0, 10);
  pdf.text(`Periode: ${startDateFormatted} s/d ${endDateFormatted}`, margin, yPosition);
  yPosition += 6;

  const printDate = new Date().toLocaleString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'italic');
  pdf.text(`Dicetak: ${printDate}`, margin, yPosition);
  yPosition += 10;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Ringkasan', margin, yPosition);
  yPosition += 6;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const summaryData = [
    ['Total Omzet', formatIdr(summary?.revenue ?? 0)],
    ['Order Dibayar', String(summary?.paidOrders ?? 0)],
    ['Item Terjual', String(summary?.itemsSold ?? 0)],
    ['Rata-rata Order', formatIdr(summary?.averageOrderValue ?? 0)],
  ];

  summaryData.forEach((row) => {
    pdf.text(row[0], margin, yPosition);
    pdf.text(row[1], pageWidth - margin - 40, yPosition, { align: 'right' });
    yPosition += 5;
  });

  yPosition += 5;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Seri Waktu', margin, yPosition);
  yPosition += 3;

  const timeSeriesTableData = timeSeries.map((p) => [
    p.label,
    formatIdr(p.revenue),
    String(p.orders),
    String(p.itemsSold),
  ]);

  const pdfWithAutoTable = pdf as AutoTableDocument;

  autoTable(pdf, {
    head: [['Periode', 'Omzet', 'Pesanan', 'Item']],
    body: timeSeriesTableData,
    startY: yPosition,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { halign: 'left' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
    },
  });

  yPosition = getLastAutoTableFinalY(pdfWithAutoTable, yPosition) + 5;

  if (yPosition + 50 > pageHeight - margin) {
    pdf.addPage();
    yPosition = margin;
  }

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Produk Terlaris', margin, yPosition);
  yPosition += 3;

  const topProductsTableData = topProducts.map((p, i) => [
    String(i + 1),
    p.productName,
    p.sku,
    String(p.quantitySold),
    formatIdr(p.revenue),
  ]);

  autoTable(pdf, {
    head: [['Rank', 'Produk', 'SKU', 'Qty Terjual', 'Omzet']],
    body: topProductsTableData,
    startY: yPosition,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { halign: 'center' },
      1: { halign: 'left' },
      2: { halign: 'left' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
  });

  const filename = `spark-stage-sales-report-${startDateFormatted}-to-${endDateFormatted}.pdf`;
  pdf.save(filename);
}
