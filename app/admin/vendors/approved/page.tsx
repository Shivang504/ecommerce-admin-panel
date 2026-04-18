import { AdminLayout } from "@/components/layout/admin-layout";
import { VendorList } from "@/components/vendors/vendor-list";

export const metadata = {
  title: "Approved Vendors | Admin",
  description: "Manage approved vendors",
};

export default async function ApprovedVendorsPage() {
  return (
    <AdminLayout>
      <VendorList initialStatus="approved" />
    </AdminLayout>
  );
}
