import { AdminLayout } from '@/components/layout/admin-layout';
import { ChildCategoryFormPage } from '@/components/child-categories/child-category-form-page';

export const metadata = {
  title: 'Add Child Category | Admin',
  description: 'Add new product child category',
};

export default function AddChildCategoryPage() {
  return (
    <AdminLayout>
      <ChildCategoryFormPage />
    </AdminLayout>
  );
}

