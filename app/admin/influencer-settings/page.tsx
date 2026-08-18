import { AdminLayout } from '@/components/layout/admin-layout';
import { InfluencerSettingsPage } from '@/components/influencer/influencer-settings-page';

export const metadata = {
  title: 'Influencer Settings',
  description: 'Manage influencer commission rules',
};

export default function InfluencerSettingsRoute() {
  return (
    <AdminLayout>
      <InfluencerSettingsPage />
    </AdminLayout>
  );
}
