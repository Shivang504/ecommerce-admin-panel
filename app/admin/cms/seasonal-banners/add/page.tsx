import { AdminLayout } from '@/components/layout/admin-layout';
import { SeasonalBannerFormPage } from '@/components/cms/seasonal-banner-form-page';

export const metadata = {
  title: 'Add Seasonal Banner | CMS',
  description: 'Add new seasonal banner',
};

export default function AddSeasonalBannerPage() {
  return (
    <AdminLayout>
      <SeasonalBannerFormPage />
    </AdminLayout>
  );
}

