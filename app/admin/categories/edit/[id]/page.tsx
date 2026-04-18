import { AdminLayout } from '@/components/layout/admin-layout';
import { CategoryFormPage } from '@/components/categories/category-form-page';

export const metadata = {
  title: 'Edit Category | Admin',
  description: 'Edit product category',
};

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return (
    <AdminLayout>
      <CategoryFormPage categoryId={id} />
    </AdminLayout>
  );
}
