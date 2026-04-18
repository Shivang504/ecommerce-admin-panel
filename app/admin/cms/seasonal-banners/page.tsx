import { AdminLayout } from '@/components/layout/admin-layout';
import { SeasonalBannerList } from '@/components/cms/seasonal-banner-list';

export const metadata = {
  title: 'Seasonal Banners | CMS',
  description: 'Manage seasonal banners',
};

export default function SeasonalBannersPage() {
  return (
    <AdminLayout>
      <SeasonalBannerList />
    </AdminLayout>
  );
}

