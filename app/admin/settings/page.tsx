import { AdminLayout } from '@/components/layout/admin-layout';
import { SettingsPanel } from '@/components/settings/settings-panel';

export const metadata = {
  title: 'Settings | Admin',
  description: 'Admin settings and configuration',
};

export default function SettingsPage() {
  return (
    <AdminLayout>
      <SettingsPanel />
    </AdminLayout>
  );
}
