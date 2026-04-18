import { AdminLayout } from '@/components/layout/admin-layout';
import { BrandList } from '@/components/brands/brand-list';

export default function BrandsPage() {
  return (
    <AdminLayout>
      <BrandList />
    </AdminLayout>
  );
}
