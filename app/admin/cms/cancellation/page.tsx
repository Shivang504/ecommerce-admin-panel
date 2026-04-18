import { AdminLayout } from '@/components/layout/admin-layout';
import { PolicyFormPage } from '@/components/cms/policy-form-page';

export const metadata = {
  title: 'Cancellation Policy | CMS',
  description: 'Manage cancellation policy',
};

export default function CancellationPage() {
  return (
    <AdminLayout>
      <PolicyFormPage policyType='cancellation' />
    </AdminLayout>
  );
}

