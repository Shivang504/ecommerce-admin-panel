import { AdminLayout } from "@/components/layout/admin-layout";
import { VendorList } from "@/components/vendors/vendor-list";

export const metadata = {
  title: "Suspended Vendors | Admin",
  description: "Manage suspended vendors",
};

export default async function SuspendedVendorsPage() {
  return (
    <AdminLayout>
      <VendorList initialStatus="suspended" />
    </AdminLayout>
  );
}
