import { AdminLayout } from '@/components/layout/admin-layout';
import { HeroBannerFormPage } from '@/components/cms/hero-banner-form-page';

export const metadata = {
  title: 'Edit Hero Banner | CMS',
  description: 'Edit hero banner',
};

export default async function EditHeroBannerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return (
    <AdminLayout>
      <HeroBannerFormPage bannerId={id} />
    </AdminLayout>
  );
}

