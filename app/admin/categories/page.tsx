import { AdminLayout } from '@/components/layout/admin-layout';
import { CategoryList } from '@/components/categories/category-list';

export const metadata = {
  title: 'Categories | Admin',
  description: 'Manage product categories',
};

export default function CategoriesPage() {
  return (
    <AdminLayout>
      <CategoryList />
    </AdminLayout>
  );
}
