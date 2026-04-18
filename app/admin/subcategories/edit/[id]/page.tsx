import { AdminLayout } from '@/components/layout/admin-layout';
import { SubcategoryFormPage } from '@/components/subcategories/subcategory-form-page';

export const metadata = {
  title: 'Edit Subcategory | Admin',
  description: 'Edit product subcategory',
};

export default async function EditSubcategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return (
    <AdminLayout>
      <SubcategoryFormPage subcategoryId={id} />
    </AdminLayout>
  );
}

