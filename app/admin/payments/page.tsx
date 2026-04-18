'use client';

import { AdminLayout } from '@/components/layout/admin-layout';
import { PaymentList } from '@/components/payments/payment-list';

export default function PaymentsPage() {
  return (
    <AdminLayout>
      <div className='space-y-6'>
        <div>
          <h1 className='text-3xl font-bold text-gray-900'>Payments</h1>
          <p className='text-gray-600 mt-2'>View and manage all payment transactions</p>
        </div>
        <PaymentList />
      </div>
    </AdminLayout>
  );
}

