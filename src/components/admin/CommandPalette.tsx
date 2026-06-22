import { useEffect, useRef, useState } from 'react';
import {
  DashboardSquare03Icon,
  PackageIcon,
  Invoice03Icon,
  Payment02Icon,
  QrCodeScanIcon,
  ImageAdd02Icon,
  LayersLogoIcon,
  Tag01Icon,
} from '@hugeicons/core-free-icons';
import { AdminIcon } from './AdminIcon';
import type { AdminView } from '../../pages/admin/types';

type CommandItem = {
  view: AdminView;
  icon: any;
  label: string;
};

const COMMANDS: CommandItem[] = [
  { view: 'dashboard', icon: DashboardSquare03Icon, label: 'Dashboard' },
  { view: 'inventory', icon: PackageIcon, label: 'Inventory' },
  { view: 'orders', icon: Invoice03Icon, label: 'Orders' },
  { view: 'payments', icon: Payment02Icon, label: 'Payment Health' },
  { view: 'bopis', icon: QrCodeScanIcon, label: 'BOPIS Pickup' },
  { view: 'cms', icon: ImageAdd02Icon, label: 'CMS Assets' },
  { view: 'banners', icon: LayersLogoIcon, label: 'Banners' },
  { view: 'categories', icon: Tag01Icon, label: 'Kategori' },
];

type CommandPaletteProps = {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: AdminView) => void;
  allowedViews?: readonly AdminView[];
};

export function CommandPalette({ isOpen, onClose, onNavigate, allowedViews }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = COMMANDS.filter((cmd) => {
    if (allowedViews && !allowedViews.includes(cmd.view)) return false;
    if (!query) return true;
    return cmd.label.toLowerCase().includes(query.toLowerCase());
  });

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      return;
    }
    // Auto-focus input
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // ESC close + focus trap
  useEffect(() => {
    if (!isOpen) return;
    const panel = document.querySelector('.command-palette');
    if (!panel) return;

    const focusableSelector = 'input, button, [tabindex]:not([tabindex="-1"])';
    const getFocusable = () => Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector));

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) return;

      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstEl) {
          event.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          event.preventDefault();
          firstEl.focus();
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="command-palette-backdrop" onClick={onClose}>
      <div className="command-palette" role="dialog" aria-modal="true" aria-label="Command palette" onClick={(e) => e.stopPropagation()}>
        <div className="command-palette-input-wrap">
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="Cari menu admin..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="command-palette-kbd">ESC</kbd>
        </div>
        <div className="command-palette-list">
          {filtered.length === 0 ? (
            <div className="command-palette-empty">Tidak ada hasil</div>
          ) : (
            filtered.map((cmd) => (
              <button
                key={cmd.view}
                type="button"
                className="command-palette-item"
                onClick={() => {
                  onNavigate(cmd.view);
                  onClose();
                }}
              >
                <AdminIcon icon={cmd.icon} size={18} />
                {cmd.label}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
