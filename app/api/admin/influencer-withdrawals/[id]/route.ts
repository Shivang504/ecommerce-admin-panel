import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth, getUserFromRequest } from '@/lib/auth';
import { processInfluencerWithdrawal } from '@/lib/models/influencer';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const unauthorized = requireAdminAuth(request);
    if (unauthorized) return unauthorized;

    const currentUser = getUserFromRequest(request);
    const { id } = await params;
    const body = await request.json();
    const status = body.status as 'approved' | 'rejected';
    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    await processInfluencerWithdrawal(id, status, body.adminNote, currentUser?.id);
    return NextResponse.json({ success: true, message: `Withdrawal ${status}` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to process withdrawal' }, { status: 400 });
  }
}
