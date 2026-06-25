import type { AdminView } from '../../pages/admin/types';

const VIEW_LABELS: Record<AdminView, string> = {
  dashboard: 'Dashboard',
  inventory: 'Inventory',
  orders: 'Orders',
  payments: 'Payment Health',
  reports: 'Laporan',
  bopis: 'BOPIS Pickup',
  cms: 'CMS Assets',
  banners: 'Banners',
  categories: 'Kategori',
  doku: 'DOKU',
};

type AdminBreadcrumbProps = {
  currentView: AdminView;
};

export function AdminBreadcrumb({ currentView }: AdminBreadcrumbProps) {
  return (
    <nav className="admin-breadcrumb" aria-label="Breadcrumb">
      <span>Admin</span>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{VIEW_LABELS[currentView]}</span>
    </nav>
  );
}
