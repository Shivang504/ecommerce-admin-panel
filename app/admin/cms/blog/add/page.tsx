import { AdminLayout } from '@/components/layout/admin-layout';
import { BlogFormPage } from '@/components/cms/blog-form-page';

export const metadata = {
  title: 'Add Blog Post | CMS',
  description: 'Add new blog post',
};

export default function AddBlogPage() {
  return (
    <AdminLayout>
      <BlogFormPage />
    </AdminLayout>
  );
}

