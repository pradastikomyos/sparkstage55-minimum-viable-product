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
import { downloadCsv, buildReportRows } from '../../utils/reportExport';

type ReportsSectionProps = {
  isReady: boolean;
};

export function ReportsSection({ isReady }: ReportsSectionProps) {
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

  const { startDate, endDate } = getPeriodRange(period, customStart, customEnd);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['sales-report', startDate, endDate],
    queryFn: () => fetchPaidOrders(startDate, endDate),
    enabled: isReady,
  });

  const { data: statusOrders, isLoading: isStatusLoading } = useQuery({
    queryKey: ['sales-report-status-summary', startDate, endDate],
    queryFn: () => fetchOrdersForStatusSummary(startDate, endDate),
    enabled: isReady,
  });

  const summary = useMemo(() => (orders ? computeSalesSummary(orders) : null), [orders]);
  const timeSeries = useMemo(() => (orders ? computeTimeSeries(orders, bucket) : []), [orders, bucket]);
  const topProducts = useMemo(() => (orders ? computeTopProducts(orders) : []), [orders]);
  const statusSummary = useMemo(() => (statusOrders ? computeOrderStatusSummary(statusOrders) : []), [statusOrders]);

  const isPaidOrdersPossiblyTruncated = (orders?.length ?? 0) >= 1000;
  const isStatusOrdersPossiblyTruncated = (statusOrders?.length ?? 0) >= 1000;

  const handleExport = () => {
    const rows = buildReportRows(summary, timeSeries, topProducts, startDate, endDate);
    const filename = `spark-stage-sales-report-${startDate.slice(0, 10)}-to-${endDate.slice(0, 10)}.csv`;
    downloadCsv(filename, rows);
  };

  return (
    <section className="admin-detail-pane">
      <AdminDetailTop view="reports" />
      <div className="admin-reports">
        <ReportFilters
          period={period}
          onChangePeriod={setPeriod}
          customStart={customStart}
          customEnd={customEnd}
          onChangeCustomStart={setCustomStart}
          onChangeCustomEnd={setCustomEnd}
        />

        {(isPaidOrdersPossiblyTruncated || isStatusOrdersPossiblyTruncated) && (
          <div className="admin-warning">
            Data laporan mencapai batas 1000 baris. Angka laporan mungkin belum mencakup seluruh data dalam periode ini.
          </div>
        )}

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

        <div className="admin-reports-section">
          <button
            className="admin-btn admin-btn--secondary"
            type="button"
            onClick={handleExport}
            disabled={isLoading || !summary}
          >
            <AdminIcon icon={Download02Icon} size={16} />
            Export CSV
          </button>
        </div>
      </div>
    </section>
  );
}
