import { AdminLayout } from '@/components/layout/admin-layout';
import { PolicyFormPage } from '@/components/cms/policy-form-page';

export const metadata = {
  title: 'Privacy Policy | CMS',
  description: 'Manage privacy policy',
};

export default function PrivacyPolicyPage() {
  return (
    <AdminLayout>
      <PolicyFormPage policyType='privacy' />
    </AdminLayout>
  );
}

