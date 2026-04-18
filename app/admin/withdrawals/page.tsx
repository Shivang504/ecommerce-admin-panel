import { AdminLayout } from '@/components/layout/admin-layout';
import { WithdrawalsPage } from '@/components/wallet/withdrawals-page';

export const metadata = {
  title: 'Withdrawals',
  description: 'Manage vendor withdrawal requests',
};

export default function WithdrawalsPageRoute() {
  return (
    <AdminLayout>
      <WithdrawalsPage />
    </AdminLayout>
  );
}

