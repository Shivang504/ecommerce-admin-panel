import { AdminLayout } from "@/components/layout/admin-layout";
import { VendorList } from "@/components/vendors/vendor-list";

export const metadata = {
  title: "Vendors | Admin",
  description: "Manage vendors",
};

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;

  return (
    <AdminLayout>
      <VendorList initialStatus={params.status} />
    </AdminLayout>
  );
}
