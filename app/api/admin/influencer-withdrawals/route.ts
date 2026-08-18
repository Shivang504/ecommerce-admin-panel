import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) return unauthorized;

  const { db } = await connectToDatabase();
  const status = request.nextUrl.searchParams.get('status');
  const query: any = {};
  if (status && status !== 'all') query.status = status;

  const withdrawals = await db
    .collection('influencer_withdrawals')
    .find(query)
    .sort({ requestedAt: -1 })
    .toArray();

  const summaryAgg = await db.collection('influencer_withdrawals').aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        amount: { $sum: '$amount' },
      },
    },
  ]).toArray();

  const summary = {
    total: withdrawals.length,
    pending: 0,
    approved: 0,
    rejected: 0,
    pendingAmount: 0,
    approvedAmount: 0,
  };
  summaryAgg.forEach((row: any) => {
    if (row._id === 'pending') {
      summary.pending = row.count;
      summary.pendingAmount = row.amount;
    }
    if (row._id === 'approved') {
      summary.approved = row.count;
      summary.approvedAmount = row.amount;
    }
    if (row._id === 'rejected') summary.rejected = row.count;
  });

  return NextResponse.json({
    success: true,
    withdrawals: withdrawals.map(w => ({ ...w, _id: w._id.toString(), influencerId: w.influencerId?.toString() })),
    summary,
  });
}
