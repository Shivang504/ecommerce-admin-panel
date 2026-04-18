import { AdminLayout } from '@/components/layout/admin-layout';
import { CustomerList } from '@/components/customers/customer-list';

export const metadata = {
  title: 'Customers | Admin',
  description: 'Manage customers',
};

export default function CustomersPage() {
  return (
    <AdminLayout>
      <CustomerList />
    </AdminLayout>
  );
}
