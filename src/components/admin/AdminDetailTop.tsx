import { useState } from 'react';
import { Search01Icon } from '@hugeicons/core-free-icons';
import { AdminIcon } from './AdminIcon';
import { AdminBreadcrumb } from './AdminBreadcrumb';
import { useUIStore } from '../../store/uiStore';
import type { AdminView } from '../../pages/admin/types';

const timeFmt = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

type AdminDetailTopProps = {
  view?: AdminView;
  onOpenSidebar?: () => void;
};

export function AdminDetailTop({ view, onOpenSidebar }: AdminDetailTopProps) {
  const [lastRefreshed] = useState(() => timeFmt.format(new Date()));
  const setAdminCommandOpen = useUIStore((state) => state.setAdminCommandOpen);

  return (
    <header className="admin-detail-top">
      {onOpenSidebar && (
        <button
          className="admin-detail-top-menu"
          type="button"
          aria-label="Buka menu admin"
          onClick={onOpenSidebar}
        >
          <span />
          <span />
          <span />
        </button>
      )}
      {view && <AdminBreadcrumb currentView={view} />}
      <span className="admin-detail-top-timestamp">Diperbarui: {lastRefreshed}</span>
      <button
        className="admin-global-search"
        type="button"
        aria-label="Buka pencarian navigasi admin"
        aria-haspopup="dialog"
        aria-keyshortcuts="Control+K Meta+K"
        onClick={() => setAdminCommandOpen(true)}
      >
        <AdminIcon icon={Search01Icon} size={19} />
        <span>Cari menu admin</span>
        <kbd>Ctrl K</kbd>
      </button>
    </header>
  );
}
