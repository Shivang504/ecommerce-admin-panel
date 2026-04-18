import { AdminLayout } from '@/components/layout/admin-layout';
import { PromoSectionFormPage } from '@/components/cms/promo-section-form-page';

export const metadata = {
  title: 'Edit Promo Section | CMS',
  description: 'Edit promo section',
};

export default async function EditPromoSectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return (
    <AdminLayout>
      <PromoSectionFormPage promoId={id} />
    </AdminLayout>
  );
}

