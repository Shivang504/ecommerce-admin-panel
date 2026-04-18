import { AdminLayout } from '@/components/layout/admin-layout';
import { QualityBannerFormPage } from '@/components/cms/quality-banner-form-page';

export const metadata = {
  title: 'Add Quality Banner | CMS',
  description: 'Add new quality banner',
};

export default function AddQualityBannerPage() {
  return (
    <AdminLayout>
      <QualityBannerFormPage />
    </AdminLayout>
  );
}

