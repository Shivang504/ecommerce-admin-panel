import { AdminLayout } from '@/components/layout/admin-layout';
import { PromoSectionFormPage } from '@/components/cms/promo-section-form-page';

export const metadata = {
  title: 'Add Promo Section | CMS',
  description: 'Add new promo section',
};

export default function AddPromoSectionPage() {
  return (
    <AdminLayout>
      <PromoSectionFormPage />
    </AdminLayout>
  );
}

