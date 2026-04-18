import { AdminLayout } from '@/components/layout/admin-layout';
import { MonthlyBannerFormPage } from '@/components/cms/monthly-banner-form-page';

export const metadata = {
  title: 'Edit Monthly Banner | CMS',
  description: 'Edit monthly banner',
};

export default async function EditMonthlyBannerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return (
    <AdminLayout>
      <MonthlyBannerFormPage bannerId={id} />
    </AdminLayout>
  );
}

