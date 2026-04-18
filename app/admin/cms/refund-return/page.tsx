import { AdminLayout } from '@/components/layout/admin-layout';
import { PolicyFormPage } from '@/components/cms/policy-form-page';

export const metadata = {
  title: 'Refund & Return Policy | CMS',
  description: 'Manage refund and return policy',
};

export default function RefundReturnPage() {
  return (
    <AdminLayout>
      <PolicyFormPage policyType='refund' />
    </AdminLayout>
  );
}

