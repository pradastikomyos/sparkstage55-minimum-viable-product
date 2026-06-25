import {
  Invoice03Icon,
  Payment02Icon,
  ShoppingBag03Icon,
  Tag01Icon,
} from '@hugeicons/core-free-icons';
import { AdminIcon } from './AdminIcon';
import { NumberTicker } from '../ui/number-ticker';
import { MetricSkeleton } from './AdminSkeleton';
import { formatIdr } from '../../services/reports';
import type { SalesSummary } from '../../services/reports';

type SalesSummaryCardsProps = {
  summary: SalesSummary | null;
  isLoading: boolean;
};

export function SalesSummaryCards({ summary, isLoading }: SalesSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="admin-kpi-grid">
        <MetricSkeleton />
        <MetricSkeleton />
        <MetricSkeleton />
        <MetricSkeleton />
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="admin-kpi-grid">
      <div className="admin-kpi-card">
        <div className="admin-kpi-icon">
          <AdminIcon icon={Payment02Icon} size={20} />
        </div>
        <span className="admin-kpi-label">Total Omzet</span>
        <strong className="admin-kpi-value">{formatIdr(summary.revenue)}</strong>
      </div>
      <div className="admin-kpi-card">
        <div className="admin-kpi-icon admin-kpi-icon--orders">
          <AdminIcon icon={Invoice03Icon} size={20} />
        </div>
        <span className="admin-kpi-label">Order Dibayar</span>
        <strong className="admin-kpi-value">
          <NumberTicker value={summary.paidOrders} className="tracking-normal text-inherit" />
        </strong>
      </div>
      <div className="admin-kpi-card">
        <div className="admin-kpi-icon admin-kpi-icon--active">
          <AdminIcon icon={ShoppingBag03Icon} size={20} />
        </div>
        <span className="admin-kpi-label">Item Terjual</span>
        <strong className="admin-kpi-value">
          <NumberTicker value={summary.itemsSold} className="tracking-normal text-inherit" />
        </strong>
      </div>
      <div className="admin-kpi-card">
        <div className="admin-kpi-icon">
          <AdminIcon icon={Tag01Icon} size={20} />
        </div>
        <span className="admin-kpi-label">Rata-rata Order</span>
        <strong className="admin-kpi-value">{formatIdr(summary.averageOrderValue)}</strong>
      </div>
    </div>
  );
}
