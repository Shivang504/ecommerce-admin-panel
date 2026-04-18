import { AdminLayout } from '@/components/layout/admin-layout';
import { BlogFormPage } from '@/components/cms/blog-form-page';

export const metadata = {
  title: 'Edit Blog Post | CMS',
  description: 'Edit blog post',
};

export default async function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return (
    <AdminLayout>
      <BlogFormPage blogId={id} />
    </AdminLayout>
  );
}

