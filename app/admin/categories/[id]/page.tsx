import { AdminLayout } from '@/components/layout/admin-layout';
import { CategoryFormPage } from '@/components/categories/category-form-page';

export const metadata = {
  title: 'View Category | Admin',
  description: 'View category details',
};

export default async function ViewCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return (
    <AdminLayout>
      <CategoryFormPage categoryId={id} />
    </AdminLayout>
  );
}
