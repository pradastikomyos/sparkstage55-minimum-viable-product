import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download02Icon } from '@hugeicons/core-free-icons';
import { AdminDetailTop } from '../../components/admin';
import { AdminIcon } from '../../components/admin/AdminIcon';
import { ReportFilters } from '../../components/admin/ReportFilters';
import { SalesSummaryCards } from '../../components/admin/SalesSummaryCards';
import { OrderStatusSummary } from '../../components/admin/OrderStatusSummary';
import { SalesChart } from '../../components/admin/SalesChart';
import { TopProductsTable } from '../../components/admin/TopProductsTable';
import {
  fetchPaidOrders,
  fetchOrdersForStatusSummary,
  computeSalesSummary,
  computeTimeSeries,
  computeTopProducts,
  computeOrderStatusSummary,
  getPeriodRange,
} from '../../services/reports';
import { downloadCsv, buildReportRows, exportReportToPdf } from '../../utils/reportExport';

type ReportsSectionProps = {
  isReady: boolean;
  onOpenSidebar?: () => void;
};

export function ReportsSection({ isReady, onOpenSidebar }: ReportsSectionProps) {
  const [period, setPeriod] = useState<'today' | '7d' | '30d' | 'this_month' | 'custom'>('30d');
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [customEnd, setCustomEnd] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [bucket, setBucket] = useState<'day' | 'week' | 'month'>('day');
  const [chartMetric, setChartMetric] = useState<'revenue' | 'orders' | 'items'>('revenue');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const { startDate, endDate } = getPeriodRange(period, customStart, customEnd);

  const { data: orders, isLoading, isError: isOrdersError } = useQuery({
    queryKey: ['sales-report', startDate, endDate],
    queryFn: () => fetchPaidOrders(startDate, endDate),
    enabled: isReady,
  });

  const { data: statusOrders, isLoading: isStatusLoading, isError: isStatusError } = useQuery({
    queryKey: ['sales-report-status-summary', startDate, endDate],
    queryFn: () => fetchOrdersForStatusSummary(startDate, endDate),
    enabled: isReady,
  });

  const summary = useMemo(() => (orders ? computeSalesSummary(orders) : null), [orders]);
  const timeSeries = useMemo(() => (orders ? computeTimeSeries(orders, bucket) : []), [orders, bucket]);
  const topProducts = useMemo(() => (orders ? computeTopProducts(orders) : []), [orders]);
  const statusSummary = useMemo(() => (statusOrders ? computeOrderStatusSummary(statusOrders) : []), [statusOrders]);

  const handleExport = () => {
    try {
      setExportError(null);
      const rows = buildReportRows(summary, timeSeries, topProducts, statusSummary, startDate, endDate);
      const filename = `spark-stage-sales-report-${startDate.slice(0, 10)}-to-${endDate.slice(0, 10)}.csv`;
      downloadCsv(filename, rows);
    } catch {
      setExportError('CSV gagal dibuat. Silakan coba lagi.');
    }
  };

  const handleExportPdf = () => {
    setExportError(null);
    setIsExportingPdf(true);

    window.setTimeout(() => {
      try {
        exportReportToPdf({
          summary,
          timeSeries,
          topProducts,
          statusSummary,
          startDate,
          endDate,
        });
      } catch {
        setExportError('PDF gagal dibuat. Silakan coba lagi.');
      } finally {
        setIsExportingPdf(false);
      }
    }, 0);
  };

  return (
    <section className="admin-detail-pane">
      <AdminDetailTop view="reports" onOpenSidebar={onOpenSidebar} />
      <div className="admin-reports">
        <div className="admin-reports-toolbar">
          <ReportFilters
            period={period}
            onChangePeriod={setPeriod}
            customStart={customStart}
            customEnd={customEnd}
            onChangeCustomStart={setCustomStart}
            onChangeCustomEnd={setCustomEnd}
          />

          <div className="admin-reports-export-actions">
            <button
              className="admin-btn admin-btn--secondary"
              type="button"
              onClick={handleExport}
              disabled={isLoading || isStatusLoading || isOrdersError || isStatusError || !summary}
            >
              <AdminIcon icon={Download02Icon} size={16} />
              Export CSV
            </button>
            <button
              className="admin-btn admin-btn--secondary"
              type="button"
              onClick={handleExportPdf}
              disabled={isLoading || isStatusLoading || isOrdersError || isStatusError || !summary || isExportingPdf}
            >
              <AdminIcon icon={Download02Icon} size={16} />
              {isExportingPdf ? 'Membuat PDF...' : 'Export PDF'}
            </button>
          </div>
        </div>

        {(isOrdersError || isStatusError) && (
          <p className="admin-error" role="alert">Data laporan gagal dimuat. Silakan muat ulang halaman.</p>
        )}

        {exportError && <p className="admin-error" role="alert">{exportError}</p>}

        <SalesSummaryCards summary={summary} isLoading={isLoading} />

        <OrderStatusSummary statuses={statusSummary} isLoading={isStatusLoading} />

        <SalesChart
          data={timeSeries}
          metric={chartMetric}
          onChangeMetric={setChartMetric}
          bucket={bucket}
          onChangeBucket={setBucket}
          isLoading={isLoading}
        />

        <TopProductsTable products={topProducts} isLoading={isLoading} />
      </div>
    </section>
  );
}
