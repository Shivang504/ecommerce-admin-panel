import { AdminLayout } from '@/components/layout/admin-layout';
import { PolicyFormPage } from '@/components/cms/policy-form-page';

export const metadata = {
  title: 'Terms & Conditions | CMS',
  description: 'Manage terms and conditions',
};

export default function TermsConditionsPage() {
  return (
    <AdminLayout>
      <PolicyFormPage policyType='terms' />
    </AdminLayout>
  );
}

