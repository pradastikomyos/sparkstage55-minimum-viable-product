import { formatIdr } from '../../services/reports';
import type { OrderStatusCount } from '../../services/reports';
import { MetricSkeleton } from './AdminSkeleton';

type OrderStatusSummaryProps = {
  statuses: OrderStatusCount[];
  isLoading: boolean;
};

export function OrderStatusSummary({ statuses, isLoading }: OrderStatusSummaryProps) {
  if (isLoading) {
    return (
      <div className="admin-reports-section">
        <p className="admin-eyebrow">Ringkasan Status Order</p>
        <div className="admin-panel" style={{ padding: 20 }}>
          <MetricSkeleton />
          <MetricSkeleton />
        </div>
      </div>
    );
  }

  if (statuses.length === 0) return null;

  const total = statuses.reduce((s, st) => s + st.count, 0);

  return (
    <div className="admin-reports-section">
      <p className="admin-eyebrow">Ringkasan Status Order</p>
      <div className="admin-status-card">
        <table className="admin-status-table">
          <thead>
            <tr>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Jumlah</th>
              <th style={{ textAlign: 'right' }}>Persentase</th>
              <th style={{ textAlign: 'right' }}>Nilai Order</th>
            </tr>
          </thead>
          <tbody>
            {statuses.map((st) => (
              <tr key={st.status}>
                <td>
                  <span className="admin-status-label">
                    <span
                      className="admin-status-dot"
                      style={{ background: st.color }}
                    />
                    {st.label}
                  </span>
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{st.count}</td>
                <td style={{ textAlign: 'right' }}>
                  {total > 0 ? `${Math.round((st.count / total) * 100)}%` : '0%'}
                </td>
                <td style={{ textAlign: 'right' }}>{formatIdr(st.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
