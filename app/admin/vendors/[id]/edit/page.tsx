import { AdminLayout } from '@/components/layout/admin-layout';
import { VendorFormPage } from '@/components/vendors/vendor-form-page';

export const metadata = {
  title: 'Edit Vendor | Admin',
  description: 'Edit vendor details',
};

export default async function EditVendorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return (
    <AdminLayout>
      <VendorFormPage vendorId={id} />
    </AdminLayout>
  );
}
