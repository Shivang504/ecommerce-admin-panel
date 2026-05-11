import { AdminLayout } from '@/components/layout/admin-layout';
import { AdminVendorRequestsPage } from '@/components/vendor-requests/admin-vendor-requests-page';

export const metadata = {
  title: 'Vendor requests',
  description: 'Review requests from vendors',
};

export default function AdminVendorRequestsRoute() {
  return (
    <AdminLayout>
      <AdminVendorRequestsPage />
    </AdminLayout>
  );
}
