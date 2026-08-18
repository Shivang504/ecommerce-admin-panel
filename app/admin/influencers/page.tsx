import { AdminLayout } from '@/components/layout/admin-layout';
import { InfluencerManagementPage } from '@/components/influencer/influencer-management-page';

export const metadata = {
  title: 'Influencers',
  description: 'Manage influencer accounts and commissions',
};

export default function InfluencersPage() {
  return (
    <AdminLayout>
      <InfluencerManagementPage />
    </AdminLayout>
  );
}
