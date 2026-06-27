import {
  Add01Icon,
  BarChartIcon,
  DashboardSquare03Icon,
  ImageAdd02Icon,
  Invoice03Icon,
  LayersLogoIcon,
  Logout03Icon,
  PackageIcon,
  Payment02Icon,
  QrCodeScanIcon,
  Search01Icon,
  Store03Icon,
  Tag01Icon,
  UserCircleIcon,
} from '@hugeicons/core-free-icons';
import { NumberTicker } from '../ui/number-ticker';
import { AdminIcon } from './AdminIcon';
import type { AdminView } from '../../pages/admin/types';

type AdminSidebarProps = {
  email?: string;
  totalStock: number;
  currentView: AdminView;
  onChangeView: (view: AdminView) => void;
  onAddProduct: () => void;
  onSignOut: () => void;
  mode?: 'admin' | 'owner' | 'pimpinan';
  allowedViews?: readonly AdminView[];
};

const NAV_ITEMS: { view: AdminView; icon: any; label: string }[] = [
  { view: 'dashboard', icon: DashboardSquare03Icon, label: 'Dashboard' },
  { view: 'inventory', icon: PackageIcon, label: 'Inventory' },
  { view: 'orders', icon: Invoice03Icon, label: 'Orders' },
  { view: 'payments', icon: Payment02Icon, label: 'Payment Health' },
  { view: 'reports', icon: BarChartIcon, label: 'Laporan Penjualan' },
  { view: 'bopis', icon: QrCodeScanIcon, label: 'BOPIS Verify' },
  { view: 'cms', icon: ImageAdd02Icon, label: 'CMS Assets' },
  { view: 'banners', icon: LayersLogoIcon, label: 'Banners' },
  { view: 'categories', icon: Tag01Icon, label: 'Kategori' },
];

export function AdminSidebar({
  email,
  totalStock,
  currentView,
  onChangeView,
  onAddProduct,
  onSignOut,
  mode = 'admin',
  allowedViews,
}: AdminSidebarProps) {
  const visibleNavItems = allowedViews
    ? NAV_ITEMS.filter((item) => allowedViews.includes(item.view))
    : NAV_ITEMS;

  return (
    <aside className="admin-sidebar">
      <section className="admin-user-card">
        <div className="admin-avatar">
          <AdminIcon icon={UserCircleIcon} size={28} />
        </div>
        <div>
          <strong>{mode === 'pimpinan' ? 'Pimpinan Spark' : mode === 'owner' ? 'Owner Spark' : 'Admin Spark'}</strong>
          <span>{email}</span>
        </div>
      </section>

      <label className="admin-side-search">
        <AdminIcon icon={Search01Icon} size={18} />
        <input placeholder="Search" />
        <kbd>Ctrl K</kbd>
      </label>

      {mode === 'admin' && (
        <button className="admin-compose" type="button" onClick={onAddProduct}>
          <AdminIcon icon={Add01Icon} size={20} />
          Add product
        </button>
      )}

      <nav className="admin-nav" aria-label="CMS sections">
        <p>Navigation</p>
        {visibleNavItems.map(({ view, icon, label }) => (
          <button
            key={view}
            className={currentView === view ? 'is-current' : ''}
            type="button"
            onClick={() => onChangeView(view)}
          >
            <span><AdminIcon icon={icon} size={18} /> {label}</span>
          </button>
        ))}
      </nav>

      <div className="admin-sidebar-card">
        <div>
          <AdminIcon icon={Store03Icon} size={20} />
          <strong>
            <NumberTicker value={totalStock} className="tracking-normal text-inherit" />
          </strong>
        </div>
        <span>Total stock available</span>
      </div>

      <button className="admin-support-link" type="button" onClick={onSignOut}>
        <span><AdminIcon icon={Logout03Icon} size={19} /> Sign out</span>
      </button>
    </aside>
  );
}
