'use client';

import { AdminLayout } from '@/components/layout/admin-layout';
import { FooterPageFormPage } from '@/components/cms/footer-pages-form-page';
import { useParams } from 'next/navigation';

export default function EditFooterPagePage() {
  const params = useParams();
  const pageId = params?.id as string;
  
  return (
    <AdminLayout>
      <FooterPageFormPage pageId={pageId} />
    </AdminLayout>
  );
}

