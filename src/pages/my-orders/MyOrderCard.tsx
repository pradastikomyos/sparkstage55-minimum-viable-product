import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { useEffect, useMemo, useRef } from 'react';
import { classifyOrder, getFirstPickupCode, isPickupReady, normalizeQrPayload } from '../../utils/orderHelpers';
import type { MyOrder } from '../../hooks/useMyOrders';
import styles from './MyOrderCard.module.css';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);

function QRCanvas({ payload }: { payload: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    void QRCode.toCanvas(ref.current, payload, { width: 160, margin: 2 });
  }, [payload]);

  return <canvas ref={ref} aria-label="Pickup QR code" />;
}

export function MyOrderCard({ order }: { order: MyOrder }) {
  const category = useMemo(() => classifyOrder(order), [order]);
  const pickupCode = getFirstPickupCode(order.pickup_codes);
  const showQr = isPickupReady(order) && pickupCode;
  const paidAt = order.paid_at ? new Date(order.paid_at).toLocaleString('id-ID') : null;
  const statusClass = category === 'pending' ? 'is-pending' : category === 'active' ? 'is-active' : 'is-history';
  const itemCount = order.order_items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <article className={`${styles.card} ${statusClass}`}>
      <div className={styles.top}>
        <div>
          <p className={styles.eyebrow}>Invoice</p>
          <h3 className={styles.invoice}>{order.invoice_number}</h3>
          <p className={styles.customer}>{order.customer_name}</p>
        </div>
        <span className={styles.status}>
          {category === 'pending' ? 'Menunggu Pembayaran' : category === 'active' ? 'Siap Diambil' : 'Selesai'}
        </span>
      </div>

      <div className={styles.meta}>
        <div className={styles.metaGrid}>
          <p><span>Tanggal</span>{new Date(order.created_at).toLocaleString('id-ID')}</p>
          <p><span>Total</span>{formatCurrency(order.total_amount_idr)}</p>
          <p><span>Item</span>{itemCount}</p>
          <p><span>Status</span>{category === 'pending' ? 'Menunggu pembayaran' : category === 'active' ? 'Siap diambil' : 'Selesai'}</p>
        </div>
        {paidAt ? (
          <p style={{ fontSize: '11px', color: '#757575', marginTop: '12px', textTransform: 'uppercase' }}>
            DIBAYAR PADA: {paidAt}
          </p>
        ) : null}
      </div>

      {showQr && pickupCode ? (
        <div className={styles.qrRow}>
          <div className={styles.qrBox}>
            <QRCanvas payload={normalizeQrPayload(pickupCode.qr_payload)} />
          </div>
          <div>
            <p className={styles.eyebrow}>Kode Pengambilan</p>
            <p className={styles.pickupCode}>{pickupCode.code}</p>
          </div>
        </div>
      ) : null}

      <div className={styles.actions}>
        <Link
          to={`/my-orders/${encodeURIComponent(order.invoice_number)}`}
          className={styles.button}
        >
          Lihat Detail
        </Link>
      </div>
    </article>
  );
}
