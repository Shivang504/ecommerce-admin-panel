'use client';

import { AdminLayout } from '@/components/layout/admin-layout';
import { FooterPagesList } from '@/components/cms/footer-pages-list';

export default function FooterPagesPage() {
  return (
    <AdminLayout>
      <FooterPagesList />
    </AdminLayout>
  );
}

