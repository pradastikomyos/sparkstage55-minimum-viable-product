import { Outlet } from 'react-router-dom';
import { SiteFooter } from '../../components/layout/SiteFooter';

export function AdminLayout() {
  return (
    <>
      <Outlet />
      <SiteFooter />
    </>
  );
}
