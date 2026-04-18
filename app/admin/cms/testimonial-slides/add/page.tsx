import { AdminLayout } from '@/components/layout/admin-layout';
import { TestimonialSlideFormPage } from '@/components/cms/testimonial-slide-form-page';

export const metadata = {
  title: 'Add Testimonial Slide | CMS',
  description: 'Add new testimonial slide',
};

export default function AddTestimonialSlidePage() {
  return (
    <AdminLayout>
      <TestimonialSlideFormPage />
    </AdminLayout>
  );
}

