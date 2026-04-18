import { AdminLayout } from "@/components/layout/admin-layout";
import { VendorList } from "@/components/vendors/vendor-list";

export const metadata = {
  title: "Rejected Vendors | Admin",
  description: "Manage rejected vendors",
};

export default async function RejectedVendorsPage() {
  return (
    <AdminLayout>
      <VendorList initialStatus="rejected" />
    </AdminLayout>
  );
}
