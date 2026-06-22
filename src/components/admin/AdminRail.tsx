import {
  DashboardSquare03Icon,
  ImageAdd02Icon,
  Invoice03Icon,
  LayersLogoIcon,
  Payment02Icon,
  QrCodeScanIcon,
  Settings02Icon,
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
  { view: 'bopis', icon: QrCodeScanIcon, label: 'BOPIS Pickup' },
  { view: 'cms', icon: ImageAdd02Icon, label: 'CMS Assets' },
  { view: 'banners', icon: LayersLogoIcon, label: 'Banner Manager' },
  { view: 'categories', icon: Tag01Icon, label: 'Kategori Produk' },
  { view: 'doku', icon: Settings02Icon, label: 'Settings', className: 'admin-rail-bottom' },
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
}: {
  currentView: AdminView;
  onChangeView: (view: AdminView) => void;
  allowedViews?: readonly AdminView[];
}) {
  const visibleTabs = filterTabs(RAIL_TABS, allowedViews);

  return (
    <aside className="admin-rail" aria-label="Primary admin tools">
      <div className="admin-rail-logo">S</div>
      {visibleTabs.map(({ view, icon, label, className }) => (
        <button
          key={view}
          className={`admin-rail-button ${currentView === view ? 'is-active' : ''}${className ? ` ${className}` : ''}`}
          type="button"
          aria-label={label}
          title={label}
          onClick={() => onChangeView(view)}
        >
          <HugeiconsIcon icon={icon} size={22} strokeWidth={1.5} />
        </button>
      ))}
    </aside>
  );
}
