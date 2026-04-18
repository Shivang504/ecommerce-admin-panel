import { AdminLayout } from "@/components/layout/admin-layout";
import { VendorList } from "@/components/vendors/vendor-list";

export const metadata = {
  title: "Pending Vendors | Admin",
  description: "Manage pending vendors",
};

export default async function PendingVendorsPage() {
  return (
    <AdminLayout>
      <VendorList initialStatus="pending" />
    </AdminLayout>
  );
}
