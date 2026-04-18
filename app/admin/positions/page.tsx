import { AdminLayout } from '@/components/layout/admin-layout';
import { PositionManagement } from '@/components/positions/position-management';

export const metadata = {
  title: 'Position Management | Admin',
  description: 'Manage positions for categories, subcategories, and child categories',
};

export default function PositionsPage() {
  return (
    <AdminLayout>
      <PositionManagement />
    </AdminLayout>
  );
}

