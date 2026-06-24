import { Outlet, ScrollRestoration } from 'react-router-dom';
import { HomepageMenu } from '../navigation/HomepageMenu';
import { SearchOverlay } from '../navigation/SearchOverlay';
import { CartDrawer } from '../cart/CartDrawer';
import { useUIStore } from '../../store/uiStore';

export function RootLayout() {
  const { menuOpen, searchOpen, setMenuOpen, setSearchOpen } = useUIStore();

  return (
    <>
      <div
        className={`mega-menu-scrim${menuOpen ? ' active' : ''}`}
        onClick={() => setMenuOpen(false)}
      />
      <HomepageMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSearchClick={() => setSearchOpen(true)}
      />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <CartDrawer />

      <Outlet />
      <ScrollRestoration />
    </>
  );
}
