import { formatIdr } from '../../services/reports';
import type { SalesTimeSeriesPoint } from '../../services/reports';
import { MetricSkeleton } from './AdminSkeleton';

type SalesChartProps = {
  data: SalesTimeSeriesPoint[];
  metric: 'revenue' | 'orders' | 'items';
  onChangeMetric: (m: SalesChartProps['metric']) => void;
  bucket: 'day' | 'week' | 'month';
  onChangeBucket: (b: SalesChartProps['bucket']) => void;
  isLoading: boolean;
};

const METRICS: { value: SalesChartProps['metric']; label: string }[] = [
  { value: 'revenue', label: 'Omzet' },
  { value: 'orders', label: 'Pesanan' },
  { value: 'items', label: 'Item' },
];

const BUCKETS: { value: SalesChartProps['bucket']; label: string }[] = [
  { value: 'day', label: 'Harian' },
  { value: 'week', label: 'Mingguan' },
  { value: 'month', label: 'Bulanan' },
];

function getMetricValue(point: SalesTimeSeriesPoint, metric: SalesChartProps['metric']): number {
  if (metric === 'revenue') return point.revenue;
  if (metric === 'orders') return point.orders;
  return point.itemsSold;
}

function formatValue(metric: string, value: number): string {
  if (metric === 'revenue') return formatIdr(value);
  return value.toLocaleString('id-ID');
}

export function SalesChart({
  data,
  metric,
  onChangeMetric,
  bucket,
  onChangeBucket,
  isLoading,
}: SalesChartProps) {
  const maxValue = Math.max(...data.map((d) => getMetricValue(d, metric)), 1);

  return (
    <div className="admin-reports-section">
      <div className="admin-chart-header">
        <p className="admin-eyebrow">Grafik Penjualan</p>
        <div className="admin-chart-toggles">
          <div className="admin-chart-toggle-group">
            {METRICS.map((m) => (
              <button
                key={m.value}
                type="button"
                className={`admin-btn admin-btn--ghost admin-btn--sm${metric === m.value ? ' is-active' : ''}`}
                onClick={() => onChangeMetric(m.value)}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="admin-chart-toggle-group">
            {BUCKETS.map((b) => (
              <button
                key={b.value}
                type="button"
                className={`admin-btn admin-btn--ghost admin-btn--sm${bucket === b.value ? ' is-active' : ''}`}
                onClick={() => onChangeBucket(b.value)}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="admin-chart-container">
        {isLoading ? (
          <div style={{ padding: 20 }}>
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
          </div>
        ) : data.length === 0 ? (
          <div className="admin-chart-empty">Tidak ada data untuk periode ini</div>
        ) : (
          <div className="admin-chart">
            {data.map((point) => {
              const val = getMetricValue(point, metric);
              const pct = maxValue > 0 ? (val / maxValue) * 100 : 0;
              return (
                <div className="admin-chart-row" key={point.label}>
                  <span className="admin-chart-label" title={point.label}>
                    {point.label}
                  </span>
                  <div className="admin-chart-bar-track">
                    <div
                      className="admin-chart-bar"
                      style={{ width: `${Math.max(pct, 1)}%` }}
                    />
                  </div>
                  <span className="admin-chart-value">{formatValue(metric, val)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
