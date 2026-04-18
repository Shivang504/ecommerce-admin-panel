import { AdminLayout } from '@/components/layout/admin-layout';
import { TestimonialSlideList } from '@/components/cms/testimonial-slide-list';

export const metadata = {
  title: 'Testimonial Slides | CMS',
  description: 'Manage testimonial slides',
};

export default function TestimonialSlidesPage() {
  return (
    <AdminLayout>
      <TestimonialSlideList />
    </AdminLayout>
  );
}

