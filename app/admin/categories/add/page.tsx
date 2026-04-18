import { AdminLayout } from '@/components/layout/admin-layout';
import { CategoryFormPage } from '@/components/categories/category-form-page';

export const metadata = {
  title: 'Add Category | Admin',
  description: 'Add new product category',
};

export default function AddCategoryPage() {
  return (
    <AdminLayout>
      <CategoryFormPage />
    </AdminLayout>
  );
}
