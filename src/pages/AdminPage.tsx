/**
 * AdminPage — auth guard + URL-synced tab shell.
 *
 * Responsibilities:
 *  1. Verify Supabase is configured.
 *  2. Check session + role (admin only).
 *  3. Sync the active tab with the `?tab=` URL search param so:
 *     - Refresh stays on the same tab.
 *     - Browser back/forward navigates between tabs.
 *     - Deep links like /admin.html?tab=bopis work.
 *  4. Render the correct section component.
 *
 * All data fetching, mutations, and local state live inside the section
 * components (InventorySection, OrdersSection, BopisSection, DokuSection,
 * DashboardSection). This file stays intentionally thin.
 */

import { lazy, Suspense, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { AdminRail, AdminMobileNav, AdminSidebar, CommandPalette, AdminBreadcrumb } from '../components/admin';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { getCurrentUserRole } from '../services/auth';
import { ADMIN_VIEWS, type AdminView } from './admin/types';

const OWNER_VIEWS = ['dashboard', 'orders', 'payments', 'reports'] as const satisfies readonly AdminView[];

// Section components are lazy-loaded so each section's bundle is only
// downloaded when the admin first navigates to that tab.
const InventorySection = lazy(() =>
  import('./admin/InventorySection').then((m) => ({ default: m.InventorySection })),
);
const OrdersSection = lazy(() =>
  import('./admin/OrdersSection').then((m) => ({ default: m.OrdersSection })),
);
const PaymentHealthSection = lazy(() =>
  import('./admin/PaymentHealthSection').then((m) => ({ default: m.PaymentHealthSection })),
);
const BopisSection = lazy(() =>
  import('./admin/BopisSection').then((m) => ({ default: m.BopisSection })),
);
const DashboardSection = lazy(() =>
  import('./admin/DashboardSection').then((m) => ({ default: m.DashboardSection })),
);
const CmsSection = lazy(() =>
  import('./admin/CmsSection').then((m) => ({ default: m.CmsSection })),
);
const BannerSection = lazy(() =>
  import('./admin/BannerSection').then((m) => ({ default: m.BannerSection })),
);
const CategorySection = lazy(() =>
  import('./admin/CategorySection').then((m) => ({ default: m.CategorySection })),
);
const ReportsSection = lazy(() =>
  import('./admin/ReportsSection').then((m) => ({ default: m.ReportsSection })),
);

function SectionFallback() {
  return (
    <section className="admin-detail-pane">
      <div className="admin-panel" style={{ padding: '48px 32px' }}>
        <p className="admin-eyebrow">Memuat...</p>
      </div>
    </section>
  );
}

type AdminPageProps = {
  mode?: 'admin' | 'owner';
};

export function AdminPage({ mode = 'admin' }: AdminPageProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<'admin' | 'owner' | 'customer' | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const navigate = useNavigate();
  const { tab: rawTab } = useParams<{ tab: string }>();
  const allowedViews = mode === 'owner' ? OWNER_VIEWS : ADMIN_VIEWS;
  const defaultTab: AdminView = mode === 'owner' ? 'dashboard' : 'inventory';
  const tab: AdminView = (rawTab && (allowedViews as readonly string[]).includes(rawTab))
    ? rawTab as AdminView
    : defaultTab;

  const basePath = mode === 'owner' ? '/owner' : '/admin';
  const setTab = (next: AdminView) => {
    if (!(allowedViews as readonly string[]).includes(next)) return;
    navigate(`${basePath}/${next}`, { replace: true });
  };
  const totalStockQuery = useQuery({
    queryKey: ['admin-total-stock'],
    enabled: Boolean(session && (role === 'admin' || role === 'owner')),
    queryFn: async () => {
      // TODO: Kiro — verifikasi RLS allow admin read all variants.
      if (!supabase) return 0;
      const { data, error } = await supabase
        .from('product_variants')
        .select('stock_quantity');
      if (error) return 0;
      return (data ?? []).reduce((sum, row) => sum + Number((row as { stock_quantity?: number }).stock_quantity ?? 0), 0);
    },
  });

  // ── Auth ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!supabase) return undefined;

    let isMounted = true;
    setIsCheckingAuth(true);

    supabase.auth
      .getSession()
      .then(async ({ data, error }) => {
        if (!isMounted) return;
        if (error) throw error;

        setSession(data.session);

        if (!data.session) {
          setRole(null);
          setIsCheckingAuth(false);
          return;
        }

        const nextRole = await getCurrentUserRole();
        if (!isMounted) return;
        setRole(nextRole);
        setIsCheckingAuth(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setSession(null);
        setRole(null);
        setIsCheckingAuth(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setRole(null);
        setIsCheckingAuth(false);
      } else {
        setRole(null);
        setIsCheckingAuth(true);
      }
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !session || role) return;
    setIsCheckingAuth(true);
    getCurrentUserRole()
      .then((nextRole) => setRole(nextRole))
      .catch(() => setRole(null))
      .finally(() => setIsCheckingAuth(false));
  }, [session, role]);

  useEffect(() => {
    if (!isSupabaseConfigured || isCheckingAuth) return;
    const expectedRole = mode === 'owner' ? 'owner' : 'admin';
    // ProtectedRoute in router.tsx handles redirect to /login and / for unauthorized.
    // AdminPage only needs to handle the role check for the "use another account" UI.
    if (role && role !== expectedRole) {
      setRole(null);
    }
  }, [isCheckingAuth, mode, role, session]);

  // Command palette
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Early returns ─────────────────────────────────────────────────────────

  if (!isSupabaseConfigured) {
    return (
      <main className="admin-page">
        <section className="admin-panel">
          <p className="admin-eyebrow">{mode === 'owner' ? 'Owner Dashboard' : 'CMS Admin'}</p>
          <h1>Supabase env belum tersedia</h1>
          <p>
            Isi <code>.env.local</code> dengan{' '}
            <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_ANON_KEY</code>,
            lalu restart dev server.
          </p>
        </section>
      </main>
    );
  }

  if (isCheckingAuth || !session) {
    return (
      <main className="admin-page">
        <section className="admin-panel">
          <p className="admin-eyebrow">{mode === 'owner' ? 'Spark Stage Owner' : 'Spark Stage CMS'}</p>
          <h1>Mengecek sesi...</h1>
        </section>
      </main>
    );
  }

  if (role !== mode) {
    return (
      <main className="admin-page">
        <section className="admin-panel">
          <p className="admin-eyebrow">{mode === 'owner' ? 'Spark Stage Owner' : 'Spark Stage CMS'}</p>
          <h1>Access denied</h1>
          <p className="admin-muted">
            Akun ini bukan {mode}. Silakan login dengan akun {mode} untuk membuka halaman ini.
          </p>
          <button
            type="button"
            onClick={async () => {
              await supabase?.auth.signOut();
              window.location.href = '/';
            }}
          >
            Gunakan akun lain
          </button>
        </section>
      </main>
    );
  }

  // ── Shell ─────────────────────────────────────────────────────────────────

  const isReady = Boolean(session && (role === 'admin' || role === 'owner'));

  const handleAddProduct = () => {
    if (mode !== 'admin') return;
    setTab('inventory');
    // Give React one tick to mount InventorySection before scrolling.
    setTimeout(
      () => document.getElementById('admin-add-product')?.scrollIntoView({ behavior: 'smooth' }),
      100,
    );
  };

  const signOut = async () => {
    await supabase?.auth.signOut();
    window.location.href = '/';
  };

  return (
    <main className="admin-app">
      <div className={`admin-window ${tab !== 'inventory' ? 'is-wide' : ''}`}>
        <AdminRail currentView={tab} onChangeView={setTab} allowedViews={allowedViews} />

        <AdminSidebar
          email={session.user.email}
          totalStock={totalStockQuery.data ?? 0}
          currentView={tab}
          onChangeView={setTab}
          onAddProduct={handleAddProduct}
          onSignOut={signOut}
          mode={mode}
          allowedViews={allowedViews}
        />

        <Suspense fallback={<SectionFallback />}>
          {tab === 'dashboard' && (
            <DashboardSection isReady={isReady} onNavigate={setTab} />
          )}
          {mode === 'admin' && tab === 'inventory' && <InventorySection isReady={isReady} />}
          {tab === 'orders' && <OrdersSection isReady={isReady} />}
          {tab === 'payments' && <PaymentHealthSection isReady={isReady} />}
          {tab === 'reports' && <ReportsSection isReady={isReady} />}
          {mode === 'admin' && tab === 'bopis' && <BopisSection />}
          {mode === 'admin' && tab === 'cms' && <CmsSection isReady={isReady} />}
          {mode === 'admin' && tab === 'banners' && <BannerSection isReady={isReady} />}
          {mode === 'admin' && tab === 'categories' && <CategorySection isReady={isReady} />}
        </Suspense>

        <AdminMobileNav currentView={tab} onChangeView={setTab} allowedViews={allowedViews} />
      </div>

      <CommandPalette
        isOpen={commandOpen}
        onClose={() => setCommandOpen(false)}
        onNavigate={setTab}
        allowedViews={allowedViews}
      />
    </main>
  );
}
