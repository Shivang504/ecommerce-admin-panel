import { AdminLayout } from '@/components/layout/admin-layout';
import { CustomerFormPage } from '@/components/customers/customer-form-page';

export const metadata = {
  title: 'Add Customer | Admin',
  description: 'Add a new customer',
};

export default function AddCustomerPage() {
  return (
    <AdminLayout>
      <CustomerFormPage />
    </AdminLayout>
  );
}
