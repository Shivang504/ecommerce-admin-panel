import { AdminLayout } from '@/components/layout/admin-layout';
import { BrandFormPage } from '@/components/brands/brand-form-page';

export default async function EditBrandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AdminLayout>
      <BrandFormPage brandId={id} />
    </AdminLayout>
  );
}

