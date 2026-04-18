import { AdminLayout } from '@/components/layout/admin-layout';
import { PolicyFormPage } from '@/components/cms/policy-form-page';

export const metadata = {
  title: 'Shipping Policy | CMS',
  description: 'Manage shipping policy',
};

export default function ShippingPage() {
  return (
    <AdminLayout>
      <PolicyFormPage policyType='shipping' />
    </AdminLayout>
  );
}

