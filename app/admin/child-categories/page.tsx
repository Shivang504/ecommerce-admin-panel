import { AdminLayout } from '@/components/layout/admin-layout';
import { ChildCategoryList } from '@/components/child-categories/child-category-list';

export const metadata = {
  title: 'Child Categories | Admin',
  description: 'Manage product child categories',
};

export default function ChildCategoriesPage() {
  return (
    <AdminLayout>
      <ChildCategoryList />
    </AdminLayout>
  );
}

