import { AdminLayout } from '@/components/layout/admin-layout';
import { CustomerFormPage } from '@/components/customers/customer-form-page';

export const metadata = {
  title: 'Edit Customer | Admin',
  description: 'Edit customer details',
};

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AdminLayout>
      <CustomerFormPage customerId={id} />
    </AdminLayout>
  );
}
