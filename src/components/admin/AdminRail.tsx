import {
  BarChartIcon,
  DashboardSquare03Icon,
  ImageAdd02Icon,
  Invoice03Icon,
  LayersLogoIcon,
  Logout03Icon,
  Payment02Icon,
  QrCodeScanIcon,
  ShoppingBag03Icon,
  Tag01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { AdminView } from '../../pages/admin/types';

type AdminNavItem = {
  view: AdminView;
  icon: any;
  label: string;
  className?: string;
};

const MOBILE_TABS: AdminNavItem[] = [
  { view: 'dashboard', icon: DashboardSquare03Icon, label: 'Dashboard' },
  { view: 'reports', icon: BarChartIcon, label: 'Laporan' },
  { view: 'inventory', icon: ShoppingBag03Icon, label: 'Produk' },
  { view: 'orders', icon: Invoice03Icon, label: 'Pesanan' },
  { view: 'bopis', icon: QrCodeScanIcon, label: 'Scan QR' },
  { view: 'cms', icon: ImageAdd02Icon, label: 'CMS' },
];

const RAIL_TABS: AdminNavItem[] = [
  { view: 'dashboard', icon: DashboardSquare03Icon, label: 'Dashboard' },
  { view: 'inventory', icon: ShoppingBag03Icon, label: 'Products' },
  { view: 'orders', icon: Invoice03Icon, label: 'Orders' },
  { view: 'payments', icon: Payment02Icon, label: 'Payment Health' },
  { view: 'reports', icon: BarChartIcon, label: 'Laporan' },
  { view: 'bopis', icon: QrCodeScanIcon, label: 'BOPIS Pickup' },
  { view: 'cms', icon: ImageAdd02Icon, label: 'CMS Assets' },
  { view: 'banners', icon: LayersLogoIcon, label: 'Banner Manager' },
  { view: 'categories', icon: Tag01Icon, label: 'Kategori Produk' },
];

function filterTabs(tabs: AdminNavItem[], allowedViews?: readonly AdminView[]) {
  return allowedViews ? tabs.filter((tab) => allowedViews.includes(tab.view)) : tabs;
}

export function AdminMobileNav({
  currentView,
  onChangeView,
  allowedViews,
}: {
  currentView: AdminView;
  onChangeView: (view: AdminView) => void;
  allowedViews?: readonly AdminView[];
}) {
  const visibleTabs = filterTabs(MOBILE_TABS, allowedViews);

  return (
    <nav className="admin-mobile-nav" aria-label="Admin navigation">
      {visibleTabs.map(({ view, icon, label }) => (
        <button
          key={view}
          type="button"
          className={`admin-mobile-nav__btn${currentView === view ? ' is-active' : ''}`}
          onClick={() => onChangeView(view)}
          aria-label={label}
        >
          <HugeiconsIcon icon={icon} size={22} strokeWidth={currentView === view ? 2 : 1.5} />
          {label}
        </button>
      ))}
    </nav>
  );
}

export function AdminRail({
  currentView,
  onChangeView,
  allowedViews,
  onToggleSidebar,
  isSidebarOpen = false,
  onSignOut,
}: {
  currentView: AdminView;
  onChangeView: (view: AdminView) => void;
  allowedViews?: readonly AdminView[];
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  onSignOut?: () => void;
}) {
  const visibleTabs = filterTabs(RAIL_TABS, allowedViews);

  return (
    <aside className={`admin-rail${isSidebarOpen ? ' is-open' : ''}`} aria-label="Primary admin tools">
      <div className="admin-rail-header">
        {onToggleSidebar && (
          <button
            className={`admin-rail-menu${isSidebarOpen ? ' is-active' : ''}`}
            type="button"
            aria-label={isSidebarOpen ? 'Tutup sidebar admin' : 'Buka sidebar admin'}
            aria-expanded={isSidebarOpen}
            onClick={onToggleSidebar}
          >
            <span />
            <span />
            <span />
          </button>
        )}
        <div className="admin-rail-logo" aria-label="Spark Stage">
          <img
            src="/logo/logo-spark-wordmark.png"
            alt="Spark Stage"
            className="admin-rail-logo__img"
          />
        </div>
      </div>
      {visibleTabs.map(({ view, icon, label, className }) => (
        <button
          key={view}
          className={`admin-rail-button ${currentView === view ? 'is-active' : ''}${className ? ` ${className}` : ''}`}
          type="button"
          aria-label={label}
          title={label}
          onClick={() => onChangeView(view)}
        >
          <span className="admin-rail-button__icon" aria-hidden="true">
            <HugeiconsIcon icon={icon} size={22} strokeWidth={1.5} />
          </span>
          <span className="admin-rail-button__label">{label}</span>
        </button>
      ))}

      {onSignOut && (
        <button
          className="admin-rail-button admin-rail-bottom"
          type="button"
          aria-label="Sign out"
          title="Sign out"
          onClick={onSignOut}
        >
          <span className="admin-rail-button__icon" aria-hidden="true">
            <HugeiconsIcon icon={Logout03Icon} size={22} strokeWidth={1.5} />
          </span>
          <span className="admin-rail-button__label">Sign Out</span>
        </button>
      )}
    </aside>
  );
}
