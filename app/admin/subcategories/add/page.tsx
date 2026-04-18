import { AdminLayout } from '@/components/layout/admin-layout';
import { SubcategoryFormPage } from '@/components/subcategories/subcategory-form-page';

export const metadata = {
  title: 'Add Subcategory | Admin',
  description: 'Add new product subcategory',
};

export default function AddSubcategoryPage() {
  return (
    <AdminLayout>
      <SubcategoryFormPage />
    </AdminLayout>
  );
}

