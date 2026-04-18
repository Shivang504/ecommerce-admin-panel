import { AdminLayout } from '@/components/layout/admin-layout';
import { SubcategoryList } from '@/components/subcategories/subcategory-list';

export const metadata = {
  title: 'Subcategories | Admin',
  description: 'Manage product subcategories',
};

export default function SubcategoriesPage() {
  return (
    <AdminLayout>
      <SubcategoryList />
    </AdminLayout>
  );
}

