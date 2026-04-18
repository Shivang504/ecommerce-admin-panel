import { AdminLayout } from '@/components/layout/admin-layout';
import { QualityBannerFormPage } from '@/components/cms/quality-banner-form-page';

export const metadata = {
  title: 'Edit Quality Banner | CMS',
  description: 'Edit quality banner',
};

export default async function EditQualityBannerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return (
    <AdminLayout>
      <QualityBannerFormPage bannerId={id} />
    </AdminLayout>
  );
}

