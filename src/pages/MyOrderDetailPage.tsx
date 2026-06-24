import { useEffect, useRef, useMemo, useState } from 'react';
import { Link, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { getCheckoutResult } from '../services/commerce';
import { getFirstPickupCode, isPickupReady, normalizeQrPayload } from '../utils/orderHelpers';
import { isSupabaseConfigured } from '../lib/supabase';
import { useAuthUser, useCartSummary } from '../hooks/useCartSummary';
import { useUIStore } from '../store/uiStore';
import { AccountHeader } from '../widgets/account-header/AccountHeader';
import styles from './MyOrderDetailPage.module.css';

const IDR = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

function QRCanvas({ payload, size = 200 }: { payload: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !payload) return;
    void QRCode.toCanvas(canvasRef.current, payload, {
      width: size,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });
  }, [payload, size]);

  return <canvas ref={canvasRef} aria-label="Pickup QR code" />;
}

export function MyOrderDetailPage() {
  const { invoice } = useParams<{ invoice: string }>();
  const navigate = useNavigate();
  const { role, displayName, email } = useAuthUser();
  const { itemCount } = useCartSummary();
  const { setMenuOpen, setSearchOpen, setCartDrawerOpen } = useUIStore();

  const resultQuery = useQuery({
    queryKey: ['checkout-result', invoice],
    queryFn: () => getCheckoutResult(invoice!),
    enabled: isSupabaseConfigured && Boolean(invoice),
    staleTime: 0,
  });

  const order = resultQuery.data?.order ?? null;
  const pickupCode = getFirstPickupCode(order?.pickup_codes);
  const pickupReady = order ? isPickupReady({ ...order, pickup_codes: pickupCode ? [pickupCode] : [] }) : false;
  const qrPayload = pickupCode ? normalizeQrPayload(pickupCode.qr_payload) : '';

  const usernameUpper = useMemo(() => {
    if (displayName) return displayName.toUpperCase();
    if (email) return email.split('@')[0].toUpperCase();
    return 'USER';
  }, [displayName, email]);

  const sidebarRef = useRef<HTMLElement>(null);
  const onlineRef = useRef<HTMLButtonElement>(null);
  const inStoreRef = useRef<HTMLButtonElement>(null);
  const favoritesRef = useRef<HTMLButtonElement>(null);
  const detailsRef = useRef<HTMLButtonElement>(null);
  const settingsRef = useRef<HTMLButtonElement>(null);

  const [bulletStyle, setBulletStyle] = useState<React.CSSProperties>({
    transform: 'translate(0px, 0px)',
    opacity: 0,
  });

  useEffect(() => {
    const activeRef = onlineRef;
    const isGroupTitle = false;

    const updatePosition = () => {
      if (activeRef.current && sidebarRef.current) {
        const activeEl = activeRef.current;
        const sidebarEl = sidebarRef.current;
        const activeRect = activeEl.getBoundingClientRect();
        const sidebarRect = sidebarEl.getBoundingClientRect();

        const yOffset = activeRect.top - sidebarRect.top + sidebarEl.scrollTop + (activeRect.height - 10) / 2;
        const xOffset = isGroupTitle ? 0 : 16;

        setBulletStyle({
          transform: `translate(${xOffset}px, ${yOffset}px)`,
          opacity: 1,
        });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);

    let animationFrameId: number;
    let checkCount = 0;
    const checkPosition = () => {
      updatePosition();
      checkCount++;
      if (checkCount < 10) {
        animationFrameId = requestAnimationFrame(checkPosition);
      }
    };
    animationFrameId = requestAnimationFrame(checkPosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  useEffect(() => {
    document.title = `Zara - Order ${invoice || ''}`;
  }, [invoice]);

  if (!invoice) return <Navigate to="/my-orders" replace />;

  const handleSidebarClick = (section: 'online' | 'in_store' | 'favorites' | 'my_details' | 'settings') => {
    navigate('/my-orders', { state: { activeSidebar: section } });
  };

  const renderContent = () => {
    if (resultQuery.isLoading) {
      return <div className={styles.loading}>Memuat pesanan…</div>;
    }

    if (!order || resultQuery.data?.kind === 'not_found') {
      return (
        <div>
          <Link to="/my-orders" className={styles.back}>← KEMBALI</Link>
          <p className={styles.notFound}>
            Pesanan tidak ditemukan.
          </p>
        </div>
      );
    }

    const orderItemCount = order.order_items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

    return (
      <div className={styles.shell}>
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Detail Pesanan</p>
            <h1 className={styles.invoice}>{order.invoice_number}</h1>
          </div>
          <Link to="/my-orders" className={styles.back}>← KEMBALI</Link>
        </div>

        <div className={styles.body}>
          <div className={styles.main}>
            {pickupReady && pickupCode && qrPayload ? (
              <section className={styles.qrCard}>
                <div className={styles.qrCanvas}>
                  <QRCanvas payload={qrPayload} size={200} />
                </div>
                <div>
                  <p className={styles.qrLabel}>KODE PENGAMBILAN</p>
                  <p className={styles.qrCode}>{pickupCode.code}</p>
                  <p className={styles.qrHint}>
                    Tunjukkan QR ini ke kasir saat mengambil barang di toko kami.
                  </p>
                </div>
              </section>
            ) : null}

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Order Details</h2>
              <div className={styles.detailGrid}>
                <div>
                  <p className={styles.fieldLabel}>ORDER ID</p>
                  <p className={styles.fieldValue}>{order.invoice_number}</p>
                </div>
                <div>
                  <p className={styles.fieldLabel}>TANGGAL</p>
                  <p className={styles.fieldValue}>
                    {new Date(order.created_at).toLocaleString('id-ID')}
                  </p>
                </div>
                <div>
                  <p className={styles.fieldLabel}>CUSTOMER</p>
                  <p className={styles.fieldValue}>{order.customer_name}</p>
                </div>
                <div>
                  <p className={styles.fieldLabel}>FULFILLMENT</p>
                  <p className={styles.fieldValue}>Pick up in store</p>
                </div>
                <div>
                  <p className={styles.fieldLabel}>STATUS PEMBAYARAN</p>
                  <p className={`${styles.fieldValue} ${styles.fieldValueStatus}`}>
                    {order.payment_status}
                  </p>
                </div>
                <div>
                  <p className={styles.fieldLabel}>STATUS PESANAN</p>
                  <p className={styles.fieldValue}>
                    {order.status.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
            </section>

            {order.order_items && order.order_items.length > 0 ? (
              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Item Pesanan</h2>
                <div className={styles.items}>
                  {order.order_items.map((item, i) => (
                    <div key={i} className={styles.item}>
                      <div>
                        <p className={styles.itemName}>{item.product_name}</p>
                        <p className={styles.itemSku}>{item.sku} · ×{item.quantity}</p>
                      </div>
                      <p className={styles.itemPrice}>{IDR.format(item.line_total_idr)}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside>
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Ringkasan Pesanan</h2>
              <div className={styles.summaryRows}>
                <div className={styles.summaryRow}>
                  <span>Item</span>
                  <span>{orderItemCount}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>Subtotal</span>
                  <span>{IDR.format(order.total_amount_idr)}</span>
                </div>
                <div className={`${styles.summaryRow} ${styles.summaryRowTotal}`}>
                  <span>Total Dibayar</span>
                  <strong>{IDR.format(order.total_amount_idr)}</strong>
                </div>
              </div>
              <Link to="/" className={styles.continue}>Lanjutkan belanja</Link>
            </section>
          </aside>
        </div>

        {order.customer_email ? (
          <p className={styles.emailNote}>
            Email konfirmasi telah dikirim ke <strong>{order.customer_email}</strong>.
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <AccountHeader mode="menu" onSearchClick={() => setSearchOpen(true)} onMenuClick={() => setMenuOpen(true)} />

      <main className={styles.grid}>
        <aside className={styles.sidebar} ref={sidebarRef}>
          <span className={styles.bulletIndicator} style={bulletStyle}>•</span>

          <div className={styles.sidebarGroup}>
            <button type="button" className={`${styles.sidebarGroupTitle} ${styles.sidebarGroupTitleActive}`} onClick={() => handleSidebarClick('online')}>
              |01| PEMBELIAN
            </button>
            <ul className={styles.sidebarLinks}>
              <li>
                <button type="button" ref={onlineRef} className={`${styles.sidebarLink} ${styles.sidebarLinkActive}`} onClick={() => handleSidebarClick('online')}>
                  ONLINE
                </button>
              </li>
              <li>
                <button type="button" ref={inStoreRef} className={styles.sidebarLink} onClick={() => handleSidebarClick('in_store')}>
                  DI TOKO
                </button>
              </li>
            </ul>
          </div>

          <div className={styles.sidebarGroup}>
            <button type="button" ref={favoritesRef} className={styles.sidebarGroupTitle} onClick={() => handleSidebarClick('favorites')}>
              |02| FAVORIT
            </button>
          </div>

          <div className={styles.sidebarGroup}>
            <button type="button" ref={detailsRef} className={styles.sidebarGroupTitle} onClick={() => handleSidebarClick('my_details')}>
              |03| DATA SAYA
            </button>
            <p className={styles.sidebarInfo}>
              Lengkapi ukuran Anda untuk mendapatkan rekomendasi ukuran yang paling sesuai.
            </p>
          </div>

          <div className={styles.sidebarGroup}>
            <button type="button" ref={settingsRef} className={styles.sidebarGroupTitle} onClick={() => handleSidebarClick('settings')}>
              |04| PENGATURAN
            </button>
          </div>
        </aside>

        <section className={styles.centerContent}>
          {renderContent()}
        </section>

        <aside className={styles.rightActions}>
          <button type="button" className={`${styles.rightBtn} ${styles.rightBtnBold}`} onClick={() => setCartDrawerOpen(true)}>
            TAS | {itemCount} |
          </button>
          <p className={styles.rightUsername}>{usernameUpper}</p>
          <button type="button" className={styles.rightLink} onClick={() => navigate('/')}>
            BANTUAN
          </button>
        </aside>
      </main>
    </div>
  );
}
