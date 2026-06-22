import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthUser } from '../hooks/useCartSummary';
import { useMyOrders } from '../hooks/useMyOrders';
import { classifyOrder } from '../utils/orderHelpers';
import { MyOrdersTabs } from './my-orders/MyOrdersTabs';
import { MyOrderCard } from './my-orders/MyOrderCard';

export function MyOrdersPage() {
  const navigate = useNavigate();
  const { userId, role } = useAuthUser();
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'history'>('pending');
  const { data: orders = [], isLoading } = useMyOrders(userId);

  useEffect(() => {
    if (role === 'admin' || role === 'owner') {
      navigate(role === 'owner' ? '/owner/dashboard' : '/admin/dashboard', { replace: true });
    }
  }, [navigate, role]);

  const grouped = useMemo(() => {
    const pending = orders.filter((order) => classifyOrder(order) === 'pending');
    const active = orders.filter((order) => classifyOrder(order) === 'active');
    const history = orders.filter((order) => classifyOrder(order) === 'history');
    return { pending, active, history };
  }, [orders]);

  const visibleOrders = activeTab === 'pending' ? grouped.pending : activeTab === 'active' ? grouped.active : grouped.history;

  if (isLoading) {
    return (
      <div className="my-orders-page">
        <div className="my-orders-shell">
          <div className="my-orders-header">
            <div>
              <p className="my-orders-eyebrow">Pesanan Saya</p>
              <h1 className="my-orders-title">Riwayat Pesanan</h1>
            </div>
          </div>
          <div className="my-orders-list">
            {Array.from({ length: 3 }, (_, i) => (
              <div className="my-orders-card is-skeleton" key={i} aria-hidden="true">
                <div className="my-orders-card__top">
                  <div style={{ flex: 1 }}>
                    <div className="admin-skeleton" style={{ width: '60%', height: 12, marginBottom: 8 }} />
                    <div className="admin-skeleton" style={{ width: '40%', height: 16, marginBottom: 4 }} />
                    <div className="admin-skeleton" style={{ width: '50%', height: 12 }} />
                  </div>
                  <div className="admin-skeleton" style={{ width: 80, height: 24, borderRadius: 12 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-orders-page">
      <div className="my-orders-shell">
        <div className="my-orders-header">
          <div>
            <p className="my-orders-eyebrow">Pesanan Saya</p>
            <h1 className="my-orders-title">Riwayat Pesanan</h1>
            <p className="my-orders-intro">
              Pantau status pembayaran, QR pickup, dan riwayat transaksi di satu tempat.
            </p>
          </div>
          <Link to="/" className="my-orders-back-link">
            Kembali Belanja
          </Link>
        </div>

        <MyOrdersTabs
          activeTab={activeTab}
          pendingCount={grouped.pending.length}
          activeCount={grouped.active.length}
          historyCount={grouped.history.length}
          onChange={setActiveTab}
        />

        <div className="my-orders-list">
          {visibleOrders.length > 0 ? (
            visibleOrders.map((order) => <MyOrderCard key={order.id} order={order} />)
          ) : (
            <div className="my-orders-empty">
              <p>Belum ada pesanan di kategori ini.</p>
              <Link to="/" className="my-orders-empty__link">Mulai belanja</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
