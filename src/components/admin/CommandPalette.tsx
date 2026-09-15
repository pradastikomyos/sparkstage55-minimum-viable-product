import {
  BarChartIcon,
  DashboardSquare03Icon,
  PackageIcon,
  Invoice03Icon,
  Payment02Icon,
  QrCodeScanIcon,
  ImageAdd02Icon,
  LayersLogoIcon,
  Tag01Icon,
} from '@hugeicons/core-free-icons';
import { AppleSpotlight, type AppleSpotlightItem } from '@/components/block/apple-spotlight';
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
  { view: 'reports', icon: BarChartIcon, label: 'Laporan Penjualan' },
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
  const items: AppleSpotlightItem[] = COMMANDS
    .filter((command) => !allowedViews || allowedViews.includes(command.view))
    .map((command) => ({
      id: command.view,
      label: command.label,
      description: `Buka halaman ${command.label}`,
      icon: <AdminIcon icon={command.icon} size={19} />,
      onSelect: () => {
        onNavigate(command.view);
        onClose();
      },
    }));

  return <AppleSpotlight isOpen={isOpen} handleClose={onClose} items={items} />;
}
