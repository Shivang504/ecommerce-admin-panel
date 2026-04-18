import { AdminLayout } from '@/components/layout/admin-layout';
import { PromoSectionList } from '@/components/cms/promo-section-list';

export const metadata = {
  title: 'Promo Section | CMS',
  description: 'Manage promo section',
};

export default function PromoSectionPage() {
  return (
    <AdminLayout>
      <PromoSectionList />
    </AdminLayout>
  );
}

