import { AdminLayout } from '@/components/layout/admin-layout';
import { TestimonialSlideFormPage } from '@/components/cms/testimonial-slide-form-page';

export const metadata = {
  title: 'Edit Testimonial Slide | CMS',
  description: 'Edit testimonial slide',
};

export default async function EditTestimonialSlidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return (
    <AdminLayout>
      <TestimonialSlideFormPage slideId={id} />
    </AdminLayout>
  );
}

