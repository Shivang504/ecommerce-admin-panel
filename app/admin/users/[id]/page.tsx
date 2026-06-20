import { AdminLayout } from '@/components/layout/admin-layout';
import { UserViewPage } from '@/components/users/user-view-page';

export const metadata = {
  title: 'View User | Admin',
  description: 'View admin user details',
};

export default async function ViewUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AdminLayout>
      <UserViewPage adminId={id} />
    </AdminLayout>
  );
}
