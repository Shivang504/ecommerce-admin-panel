import { AdminLayout } from '@/components/layout/admin-layout';
import { MonthlyBannerFormPage } from '@/components/cms/monthly-banner-form-page';

export const metadata = {
  title: 'Add Monthly Banner | CMS',
  description: 'Add new monthly banner',
};

export default function AddMonthlyBannerPage() {
  return (
    <AdminLayout>
      <MonthlyBannerFormPage />
    </AdminLayout>
  );
}

