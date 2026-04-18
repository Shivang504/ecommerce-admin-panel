import { AdminLayout } from '@/components/layout/admin-layout';
import { HeroBannerFormPage } from '@/components/cms/hero-banner-form-page';

export const metadata = {
  title: 'Add Hero Banner | CMS',
  description: 'Add new hero banner',
};

export default function AddHeroBannerPage() {
  return (
    <AdminLayout>
      <HeroBannerFormPage />
    </AdminLayout>
  );
}

