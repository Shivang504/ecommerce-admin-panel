import { AdminLayout } from '@/components/layout/admin-layout';
import { BlogList } from '@/components/cms/blog-list';

export const metadata = {
  title: 'Blog Posts | CMS',
  description: 'Manage blog posts',
};

export default function BlogPage() {
  return (
    <AdminLayout>
      <BlogList />
    </AdminLayout>
  );
}

