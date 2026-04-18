import { AdminLayout } from '@/components/layout/admin-layout';
import { ChildCategoryFormPage } from '@/components/child-categories/child-category-form-page';

export const metadata = {
  title: 'Edit Child Category | Admin',
  description: 'Edit product child category',
};

export default async function EditChildCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return (
    <AdminLayout>
      <ChildCategoryFormPage childCategoryId={id} />
    </AdminLayout>
  );
}

