import { AdminLayout } from '@/components/layout/admin-layout';
import { HeroBannerList } from '@/components/cms/hero-banner-list';

export const metadata = {
  title: 'Hero Banners | CMS',
  description: 'Manage hero banners',
};

export default function HeroBannersPage() {
  return (
    <AdminLayout>
      <HeroBannerList />
    </AdminLayout>
  );
}

