import { AdminLayout } from '@/components/layout/admin-layout';
import { CategoryBulkImport } from '@/components/categories/category-bulk-import';

export const metadata = {
  title: 'Bulk Import | Admin',
  description: 'Bulk import categories and subcategories via Excel',
};

export default function CategoryBulkImportPage() {
  return (
    <AdminLayout>
      <CategoryBulkImport />
    </AdminLayout>
  );
}

