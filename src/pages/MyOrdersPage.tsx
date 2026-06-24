import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthUser, useCartSummary } from '../hooks/useCartSummary';
import { useMyOrders } from '../hooks/useMyOrders';
import { classifyOrder } from '../utils/orderHelpers';
import { MyOrderCard } from './my-orders/MyOrderCard';
import { useUIStore } from '../store/uiStore';
import { AccountHeader } from '../widgets/account-header/AccountHeader';
import styles from './MyOrdersPage.module.css';

function EmptyBoxIcon() {
  return (
    <svg className={styles.emptyIcon} viewBox="0 0 40 32" width="40" height="32" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="square" strokeLinejoin="miter">
      <rect x="2" y="2" width="36" height="28" />
      <line x1="2" y1="10" x2="38" y2="10" />
      <circle cx="11" cy="17" r="2" strokeWidth="1.5" />
      <circle cx="11" cy="24" r="2" strokeWidth="1.5" />
      <line x1="18" y1="17" x2="34" y2="17" />
      <line x1="18" y1="24" x2="34" y2="24" />
      <line x1="0" y1="0" x2="40" y2="32" />
    </svg>
  );
}

type Sidebar = 'online' | 'in_store' | 'favorites' | 'my_details' | 'settings';
type OnlineFilter = 'all' | 'pending' | 'active' | 'history';

export function MyOrdersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId, role, displayName, email, signOut } = useAuthUser();
  const { itemCount } = useCartSummary();
  const { setMenuOpen, setSearchOpen, setCartDrawerOpen } = useUIStore();

  const [activeSidebar, setActiveSidebar] = useState<Sidebar>(
    location.state?.activeSidebar || 'online'
  );
  const [onlineFilter, setOnlineFilter] = useState<OnlineFilter>('all');

  const sidebarRef = useRef<HTMLElement>(null);
  const onlineRef = useRef<HTMLButtonElement>(null);
  const inStoreRef = useRef<HTMLButtonElement>(null);
  const favoritesRef = useRef<HTMLButtonElement>(null);
  const detailsRef = useRef<HTMLButtonElement>(null);
  const settingsRef = useRef<HTMLButtonElement>(null);

  const subnavPendingRef = useRef<HTMLButtonElement>(null);
  const subnavActiveRef = useRef<HTMLButtonElement>(null);
  const subnavHistoryRef = useRef<HTMLButtonElement>(null);

  const [bulletStyle, setBulletStyle] = useState<React.CSSProperties>({
    transform: 'translate(0px, 0px)',
    opacity: 0,
  });

  const [subnavDashStyle, setSubnavDashStyle] = useState<React.CSSProperties>({
    transform: 'translate(0px, 0px)',
    opacity: 0,
  });

  useEffect(() => {
    let activeRef: React.RefObject<HTMLButtonElement | null> | null = null;
    let isGroupTitle = false;

    if (activeSidebar === 'online') {
      activeRef = onlineRef;
    } else if (activeSidebar === 'in_store') {
      activeRef = inStoreRef;
    } else if (activeSidebar === 'favorites') {
      activeRef = favoritesRef;
      isGroupTitle = true;
    } else if (activeSidebar === 'my_details') {
      activeRef = detailsRef;
      isGroupTitle = true;
    } else if (activeSidebar === 'settings') {
      activeRef = settingsRef;
      isGroupTitle = true;
    }

    const updatePosition = () => {
      if (activeRef && activeRef.current && sidebarRef.current) {
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
      } else {
        setBulletStyle({
          transform: 'translate(0px, 0px)',
          opacity: 0,
        });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);

    let animationFrameId: number;
    const startedAt = performance.now();
    const checkPosition = () => {
      updatePosition();
      if (performance.now() - startedAt < 420) {
        animationFrameId = requestAnimationFrame(checkPosition);
      }
    };
    animationFrameId = requestAnimationFrame(checkPosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      cancelAnimationFrame(animationFrameId);
    };
  }, [activeSidebar]);

  useEffect(() => {
    const items: Array<{ ref: React.RefObject<HTMLButtonElement | null>; filter: OnlineFilter }> = [
      { ref: subnavPendingRef, filter: 'pending' },
      { ref: subnavActiveRef, filter: 'active' },
      { ref: subnavHistoryRef, filter: 'history' },
    ];
    const activeEntry = items.find(e => e.filter === onlineFilter);

    const updateDash = () => {
      if (activeEntry?.ref.current && sidebarRef.current) {
        const el = activeEntry.ref.current;
        const sidebar = sidebarRef.current;
        const elRect = el.getBoundingClientRect();
        const sidebarRect = sidebar.getBoundingClientRect();
        const yOffset = elRect.top - sidebarRect.top + sidebar.scrollTop + (elRect.height - 12) / 2;
        setSubnavDashStyle({
          transform: `translate(0px, ${yOffset}px)`,
          opacity: 1,
        });
      } else {
        setSubnavDashStyle(prev => ({ ...prev, opacity: 0 }));
      }
    };

    updateDash();
    window.addEventListener('resize', updateDash);
    let frame: number;
    let count = 0;
    const check = () => { updateDash(); count++; if (count < 10) frame = requestAnimationFrame(check); };
    frame = requestAnimationFrame(check);

    return () => {
      window.removeEventListener('resize', updateDash);
      cancelAnimationFrame(frame);
    };
  }, [onlineFilter]);

  const { data: orders = [], isLoading } = useMyOrders(userId);

  useEffect(() => {
    document.title = 'SparkStage - Akun Saya';
  }, []);

  useEffect(() => {
    if (role === 'admin' || role === 'owner') {
      navigate(role === 'owner' ? '/owner/dashboard' : '/admin/dashboard', { replace: true });
    }
  }, [navigate, role]);

  const grouped = useMemo(() => {
    const pending = orders.filter((o) => classifyOrder(o) === 'pending');
    const active  = orders.filter((o) => classifyOrder(o) === 'active');
    const history = orders.filter((o) => classifyOrder(o) === 'history');
    return { pending, active, history };
  }, [orders]);

  const visibleOrders = useMemo(() => {
    if (onlineFilter === 'all')     return [];
    if (onlineFilter === 'pending') return grouped.pending;
    if (onlineFilter === 'active')  return grouped.active;
    return grouped.history;
  }, [onlineFilter, grouped]);

  const usernameUpper = useMemo(() => {
    if (displayName) return displayName.toUpperCase();
    if (email) return email.split('@')[0].toUpperCase();
    return 'USER';
  }, [displayName, email]);

  const handleSidebarChange = (s: Sidebar) => {
    setActiveSidebar(s);
    if (s === 'online') setOnlineFilter('all');
  };

  const handleSearchClick = () => {
    setMenuOpen(false);
    setSearchOpen(true);
  };

  const renderCenterContent = () => {
    if (isLoading) {
      return (
        <div>
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} aria-hidden="true">
              <div className={styles.skeleton} style={{ width: '60%', height: 12, marginBottom: 8 }} />
              <div className={styles.skeleton} style={{ width: '40%', height: 16, marginBottom: 4 }} />
              <div className={styles.skeleton} style={{ width: '50%', height: 12 }} />
            </div>
          ))}
        </div>
      );
    }

    switch (activeSidebar) {
      case 'online':
        if (onlineFilter === 'all') {
          return (
            <div className={styles.emptyState}>
              <EmptyBoxIcon />
              <span className={styles.emptyText}>BELUM ADA PESANAN YANG DITEMPATKAN.</span>
            </div>
          );
        }
        return (
          <div>
            {visibleOrders.length > 0 ? (
              visibleOrders.map((order) => <MyOrderCard key={order.id} order={order} />)
            ) : (
              <div className={styles.emptyState}>
                <EmptyBoxIcon />
                <span className={styles.emptyText}>BELUM ADA PESANAN DI KATEGORI INI.</span>
              </div>
            )}
          </div>
        );

      case 'in_store':
        return (
          <div className={styles.emptyState}>
            <EmptyBoxIcon />
            <span className={styles.emptyText}>BELUM ADA PEMBELIAN DI TOKO.</span>
          </div>
        );

      case 'favorites':
        return (
          <div className={styles.emptyState}>
            <EmptyBoxIcon />
            <span className={styles.emptyText}>BELUM ADA ITEM FAVORIT.</span>
          </div>
        );

      case 'my_details':
        return (
          <div className={styles.detailsGrid}>
            <div className={styles.detailsRow}>
              <span className={styles.detailsLabel}>Nama</span>
              <span className={styles.detailsValue}>{displayName || '-'}</span>
            </div>
            <div className={styles.detailsRow}>
              <span className={styles.detailsLabel}>Email</span>
              <span className={styles.detailsValue}>{email || '-'}</span>
            </div>
            <div className={styles.detailsRow}>
              <span className={styles.detailsLabel}>Peran</span>
              <span className={styles.detailsValue}>{role || 'CUSTOMER'}</span>
            </div>
            <div className={styles.detailsRow}>
              <span className={styles.detailsLabel}>Metode Fulfillment</span>
              <span className={styles.detailsValue}>Ambil di Toko (BOPIS)</span>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className={styles.settingsPanel}>
            <p style={{ margin: '0 0 12px 0', color: '#757575', fontSize: '13px' }}>
              Apakah Anda ingin keluar dari sesi akun saat ini?
            </p>
            <button type="button" className={styles.btnBlack} onClick={signOut}>
              Keluar Akun
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const isOnline = activeSidebar === 'online' || activeSidebar === 'in_store';

  return (
    <div className={styles.page}>
      <AccountHeader mode="back-home" onSearchClick={handleSearchClick} />

      <div className={styles.body}>
        <aside className={styles.sidebar} ref={sidebarRef}>
          <span className={styles.bulletIndicator} style={bulletStyle}>•</span>

          <div className={styles.sidebarGroup}>
            <button
              type="button"
              className={`${styles.sidebarGroupTitle} ${isOnline ? styles.sidebarGroupTitleActive : ''}`}
              onClick={() => handleSidebarChange('online')}
            >
              |01| PEMBELIAN
            </button>
            <ul className={styles.sidebarLinks}>
              <li>
                <button
                  type="button"
                  ref={onlineRef}
                  className={`${styles.sidebarLink} ${activeSidebar === 'online' ? styles.sidebarLinkActive : ''}`}
                  onClick={() => { setActiveSidebar('online'); setOnlineFilter('all'); }}
                >
                  ONLINE
                </button>
                <ul className={`${styles.subnavLinks} ${activeSidebar === 'online' ? styles.subnavLinksExpanded : ''}`}>
                  <span className={styles.subnavDashIndicator} style={subnavDashStyle}>–</span>
                  <li>
                    <button
                      type="button"
                      ref={subnavPendingRef}
                      className={`${styles.subnavLink} ${onlineFilter === 'pending' ? styles.subnavLinkActive : ''}`}
                      onClick={() => setOnlineFilter('pending')}
                    >
                      MENUNGGU PEMBAYARAN
                      <span className={styles.subnavCount}>({grouped.pending.length})</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      ref={subnavActiveRef}
                      className={`${styles.subnavLink} ${onlineFilter === 'active' ? styles.subnavLinkActive : ''}`}
                      onClick={() => setOnlineFilter('active')}
                    >
                      SIAP DIAMBIL
                      <span className={styles.subnavCount}>({grouped.active.length})</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      ref={subnavHistoryRef}
                      className={`${styles.subnavLink} ${onlineFilter === 'history' ? styles.subnavLinkActive : ''}`}
                      onClick={() => setOnlineFilter('history')}
                    >
                      SELESAI
                      <span className={styles.subnavCount}>({grouped.history.length})</span>
                    </button>
                  </li>
                </ul>
              </li>
              <li>
                <button
                  type="button"
                  ref={inStoreRef}
                  className={`${styles.sidebarLink} ${activeSidebar === 'in_store' ? styles.sidebarLinkActive : ''}`}
                  onClick={() => handleSidebarChange('in_store')}
                >
                  DI TOKO
                </button>
              </li>
            </ul>
          </div>

          <div className={styles.sidebarGroup}>
            <button
              type="button"
              ref={favoritesRef}
              className={`${styles.sidebarGroupTitle} ${activeSidebar === 'favorites' ? styles.sidebarGroupTitleActive : ''}`}
              onClick={() => handleSidebarChange('favorites')}
            >
              |02| FAVORIT
            </button>
          </div>

          <div className={styles.sidebarGroup}>
            <button
              type="button"
              ref={detailsRef}
              className={`${styles.sidebarGroupTitle} ${activeSidebar === 'my_details' ? styles.sidebarGroupTitleActive : ''}`}
              onClick={() => handleSidebarChange('my_details')}
            >
              |03| DATA SAYA
            </button>
            <p className={styles.sidebarInfo}>
              Lengkapi ukuran Anda untuk mendapatkan rekomendasi ukuran yang paling sesuai.
            </p>
          </div>

          <div className={styles.sidebarGroup}>
            <button
              type="button"
              ref={settingsRef}
              className={`${styles.sidebarGroupTitle} ${activeSidebar === 'settings' ? styles.sidebarGroupTitleActive : ''}`}
              onClick={() => handleSidebarChange('settings')}
            >
              |04| PENGATURAN
            </button>
          </div>
        </aside>

        <section className={styles.centerScroll} aria-label="Konten pesanan">
          <div className={styles.centerContent}>
            {renderCenterContent()}
          </div>
          <ZaraFooter />
        </section>

        <aside className={styles.rightActions}>
          <button type="button" className={styles.rightBtn} onClick={() => setCartDrawerOpen(true)}>
            TAS |{itemCount}|
          </button>
          <p className={styles.rightUsername}>{usernameUpper}</p>
          <button type="button" className={styles.rightLink} onClick={() => navigate('/')}>
            BANTUAN
          </button>
        </aside>
      </div>
    </div>
  );
}

function ZaraFooter() {
  return (
    <footer className={styles.footer} aria-label="Footer SparkStage">
      <div className={styles.footerGrid}>
        <div className={styles.footerCol}>
          <h3 className={styles.footerColTitle}>BANTUAN</h3>
          <ul className={styles.footerLinks}>
            <li><button type="button" className={styles.footerLink}>AKUN ZARA SAYA</button></li>
            <li><button type="button" className={styles.footerLink}>BARANG DAN UKURAN</button></li>
            <li><button type="button" className={styles.footerLink}>PENGIRIMAN</button></li>
            <li><button type="button" className={styles.footerLink}>PEMBAYARAN DAN FAKTUR</button></li>
            <li><button type="button" className={styles.footerLink}>PEMBELIAN SAYA</button></li>
            <li><button type="button" className={styles.footerLink}>PENGEMBALIAN DAN PENUKARAN</button></li>
            <li><button type="button" className={styles.footerLink}>PENGALAMAN ZARA</button></li>
          </ul>
        </div>
        <div className={styles.footerCol}>
          <h3 className={styles.footerColTitle}>IKUTI KAMI</h3>
          <ul className={styles.footerLinks}>
            <li><button type="button" className={styles.footerLink}>NEWSLETTER</button></li>
            <li><button type="button" className={styles.footerLink}>TIKTOK</button></li>
            <li><button type="button" className={styles.footerLink}>INSTAGRAM</button></li>
            <li><button type="button" className={styles.footerLink}>FACEBOOK</button></li>
            <li><button type="button" className={styles.footerLink}>PINTEREST</button></li>
            <li><button type="button" className={styles.footerLink}>YOUTUBE</button></li>
          </ul>
        </div>
        <div className={styles.footerCol}>
          <h3 className={styles.footerColTitle}>PERUSAHAAN</h3>
          <ul className={styles.footerLinks}>
            <li><button type="button" className={styles.footerLink}>TENTANG KAMI</button></li>
            <li><button type="button" className={styles.footerLink}>JOIN LIFE</button></li>
            <li><button type="button" className={styles.footerLink}>KANTOR</button></li>
            <li><button type="button" className={styles.footerLink}>TOKO</button></li>
          </ul>
        </div>
        <div className={styles.footerCol}>
          <h3 className={styles.footerColTitle}>KEBIJAKAN</h3>
          <ul className={styles.footerLinks}>
            <li><button type="button" className={styles.footerLink}>KEBIJAKAN PRIVASI</button></li>
            <li><button type="button" className={styles.footerLink}>SYARAT PEMBELIAN</button></li>
            <li><button type="button" className={styles.footerLink}>PENGATURAN COOKIE</button></li>
          </ul>
        </div>
      </div>
      <div className={styles.footerBottom}>
        <span>INDONESIA</span>
        <div className={styles.footerBottomLangs}>
          <span className={styles.footerBottomLangActive}>BAHASA INDONESIA</span>
          <span>|</span>
          <span>ENGLISH</span>
        </div>
        <span>© SEMUA HAK DILINDUNGI UNDANG-UNDANG</span>
      </div>
    </footer>
  );
}
