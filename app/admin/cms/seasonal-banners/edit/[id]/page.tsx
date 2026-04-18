import { AdminLayout } from '@/components/layout/admin-layout';
import { SeasonalBannerFormPage } from '@/components/cms/seasonal-banner-form-page';

export const metadata = {
  title: 'Edit Seasonal Banner | CMS',
  description: 'Edit seasonal banner',
};

export default async function EditSeasonalBannerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return (
    <AdminLayout>
      <SeasonalBannerFormPage bannerId={id} />
    </AdminLayout>
  );
}

