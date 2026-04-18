import { AdminLayout } from '@/components/layout/admin-layout';
import { TagFormPage } from '@/components/tags/tag-form-page';

export default async function EditTagPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AdminLayout>
      <TagFormPage tagId={id} />
    </AdminLayout>
  );
}

