import { AdminLayout } from '@/components/layout/admin-layout';
import { QualityBannerList } from '@/components/cms/quality-banner-list';

export const metadata = {
  title: 'Quality Banners | CMS',
  description: 'Manage quality banners',
};

export default function QualityBannersPage() {
  return (
    <AdminLayout>
      <QualityBannerList />
    </AdminLayout>
  );
}

