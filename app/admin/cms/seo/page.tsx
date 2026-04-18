import { AdminLayout } from '@/components/layout/admin-layout';
import { SeoFormPage } from '@/components/cms/seo-form-page';

export const metadata = {
  title: 'SEO Settings | CMS',
  description: 'Manage SEO settings',
};

export default function SeoPage() {
  return (
    <AdminLayout>
      <SeoFormPage />
    </AdminLayout>
  );
}

