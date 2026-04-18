import { AdminLayout } from '@/components/layout/admin-layout';
import { CustomerFormPage } from '@/components/customers/customer-form-page';

export const metadata = {
  title: 'View Customer | Admin',
  description: 'View customer details',
};

export default async function ViewCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AdminLayout>
      <CustomerFormPage customerId={id} isViewMode />
    </AdminLayout>
  );
}
