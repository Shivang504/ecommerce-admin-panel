import { AdminLayout } from '@/components/layout/admin-layout';
import { MonthlyBannerList } from '@/components/cms/monthly-banner-list';

export const metadata = {
  title: 'Monthly Banners | CMS',
  description: 'Manage monthly banners',
};

export default function MonthlyBannersPage() {
  return (
    <AdminLayout>
      <MonthlyBannerList />
    </AdminLayout>
  );
}

