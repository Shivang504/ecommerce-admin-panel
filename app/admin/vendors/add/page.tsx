import { AdminLayout } from '@/components/layout/admin-layout';
import { VendorFormPage } from '@/components/vendors/vendor-form-page';

export const metadata = {
  title: 'Add Vendor | Admin',
  description: 'Add new vendor',
};

export default function AddVendorPage() {
  return (
    <AdminLayout>
      <VendorFormPage />
    </AdminLayout>
  );
}
