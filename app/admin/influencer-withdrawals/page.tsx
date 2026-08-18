import { AdminLayout } from '@/components/layout/admin-layout';
import { InfluencerWithdrawalsPage } from '@/components/influencer/influencer-withdrawals-page';

export const metadata = {
  title: 'Influencer Withdrawals',
  description: 'Approve influencer withdrawal requests',
};

export default function InfluencerWithdrawalsRoute() {
  return (
    <AdminLayout>
      <InfluencerWithdrawalsPage />
    </AdminLayout>
  );
}
