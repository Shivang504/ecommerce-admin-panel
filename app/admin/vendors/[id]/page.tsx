import { AdminLayout } from '@/components/layout/admin-layout';
import { VendorFormPage } from '@/components/vendors/vendor-form-page';

export const metadata = {
  title: 'View Vendor | Admin',
  description: 'View vendor details',
};

export default async function ViewVendorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return (
    <AdminLayout>
      <VendorFormPage vendorId={id} />
    </AdminLayout>
  );
}
