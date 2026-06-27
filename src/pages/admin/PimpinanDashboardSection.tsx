/**
 * PimpinanDashboardSection — read-only monitoring dashboard for Pimpinan role.
 *
 * Shows:
 *  - Transaction summary (total orders, revenue, pending pickups)
 *  - Product stock overview
 *  - Recent orders list
 *  - Sales chart (read-only)
 *
 * Unlike admin Dashboard, this is purely observational — no action buttons.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingBag03Icon,
  Invoice03Icon,
  Payment02Icon,
  PackageIcon,
} from '@hugeicons/core-free-icons';
import { AdminIcon } from '../../components/admin/AdminIcon';
import { NumberTicker } from '../../components/ui/number-ticker';
import { MetricSkeleton } from '../../components/admin/AdminSkeleton';
import { listAdminOrders, listAdminProducts } from '../../services/commerce';
import { formatIdr } from '../../services/reports';

export function PimpinanDashboardSection() {
  const productsQuery = useQuery({
    queryKey: ['admin-products'],
    queryFn: listAdminProducts,
  });

  const ordersQuery = useQuery({
    queryKey: ['admin-orders'],
    queryFn: listAdminOrders,
  });

  const stats = useMemo(() => {
    const orders = ordersQuery.data ?? [];
    const products = productsQuery.data ?? [];

    const totalRevenue = orders
      .filter((o) => o.payment_status === 'paid')
      .reduce((sum, o) => sum + (o.total_amount_idr ?? 0), 0);

    const pendingPickup = orders.filter((o) => o.status === 'pending_pickup').length;
    const paidOrders = orders.filter((o) => o.payment_status === 'paid').length;
    const activeProducts = products.filter((p) => p.status === 'active').length;
    const totalStock = products.reduce((sum, p) => {
      const variants = (p as any).product_variants ?? [];
      return sum + variants.reduce((s: number, v: any) => s + (v.stock_quantity ?? 0), 0);
    }, 0);

    return {
      totalRevenue,
      totalOrders: orders.length,
      paidOrders,
      pendingPickup,
      totalProducts: products.length,
      activeProducts,
      totalStock,
    };
  }, [ordersQuery.data, productsQuery.data]);

  const isLoading = productsQuery.isLoading || ordersQuery.isLoading;

  const recentOrders = useMemo(() => {
    return (ordersQuery.data ?? [])
      .filter((o) => o.payment_status === 'paid')
      .slice(0, 5);
  }, [ordersQuery.data]);

  return (
    <section className="admin-detail-pane">
      <div className="admin-dashboard">
        <div className="admin-dashboard-header" style={{ paddingTop: 8 }}>
          <div>
            <p className="admin-eyebrow" style={{ marginBottom: 4 }}>Monitoring</p>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Dashboard Pimpinan</h2>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="admin-kpi-grid">
          {isLoading ? (
            <>
              <MetricSkeleton />
              <MetricSkeleton />
              <MetricSkeleton />
              <MetricSkeleton />
            </>
          ) : (
            <>
              <div className="admin-kpi-card">
                <div className="admin-kpi-icon">
                  <AdminIcon icon={Payment02Icon} size={20} />
                </div>
                <span className="admin-kpi-label">Total Omzet</span>
                <strong className="admin-kpi-value">{formatIdr(stats.totalRevenue)}</strong>
              </div>
              <div className="admin-kpi-card">
                <div className="admin-kpi-icon admin-kpi-icon--orders">
                  <AdminIcon icon={Invoice03Icon} size={20} />
                </div>
                <span className="admin-kpi-label">Total Pesanan</span>
                <strong className="admin-kpi-value">
                  <NumberTicker value={stats.paidOrders} className="tracking-normal text-inherit" />
                </strong>
              </div>
              <div className="admin-kpi-card">
                <div className="admin-kpi-icon admin-kpi-icon--pickup">
                  <AdminIcon icon={ShoppingBag03Icon} size={20} />
                </div>
                <span className="admin-kpi-label">Menunggu Pengambilan</span>
                <strong className="admin-kpi-value">
                  <NumberTicker value={stats.pendingPickup} className="tracking-normal text-inherit" />
                </strong>
              </div>
              <div className="admin-kpi-card">
                <div className="admin-kpi-icon admin-kpi-icon--active">
                  <AdminIcon icon={PackageIcon} size={20} />
                </div>
                <span className="admin-kpi-label">Total Stok</span>
                <strong className="admin-kpi-value">
                  <NumberTicker value={stats.totalStock} className="tracking-normal text-inherit" />
                </strong>
              </div>
            </>
          )}
        </div>

        {/* Product Info */}
        <div className="admin-reports-section">
          <p className="admin-eyebrow">Informasi Produk</p>
          <div className="admin-kpi-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className="admin-kpi-card">
              <span className="admin-kpi-label">Total Produk</span>
              <strong className="admin-kpi-value">
                <NumberTicker value={stats.totalProducts} className="tracking-normal text-inherit" />
              </strong>
            </div>
            <div className="admin-kpi-card">
              <span className="admin-kpi-label">Produk Aktif</span>
              <strong className="admin-kpi-value">
                <NumberTicker value={stats.activeProducts} className="tracking-normal text-inherit" />
              </strong>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="admin-reports-section">
          <p className="admin-eyebrow">Pesanan Terbaru</p>
          {isLoading ? (
            <MetricSkeleton />
          ) : recentOrders.length === 0 ? (
            <p className="admin-muted" style={{ padding: '16px 0' }}>Belum ada pesanan</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Pelanggan</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="admin-mono">{order.invoice_number}</td>
                      <td>{order.customer_name}</td>
                      <td className="admin-mono">{formatIdr(order.total_amount_idr ?? 0)}</td>
                      <td>
                        <span className={`admin-badge admin-badge--${order.status}`}>
                          {order.status === 'pending_pickup' ? 'Menunggu Diambil' :
                           order.status === 'picked_up' ? 'Sudah Diambil' :
                           order.status === 'paid' ? 'Dibayar' :
                           order.status === 'cancelled' ? 'Dibatalkan' :
                           order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
