import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import { listInfluencers, addManualCommission } from '@/lib/models/influencer';

export async function GET(request: NextRequest) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) return unauthorized;

  const influencers = await listInfluencers();
  return NextResponse.json({ success: true, influencers });
}

export async function POST(request: NextRequest) {
  try {
    const unauthorized = requireAdminAuth(request);
    if (unauthorized) return unauthorized;
    const currentUser = (await import('@/lib/auth')).getUserFromRequest(request);

    const body = await request.json();
    if (body.action !== 'manual_commission') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await addManualCommission({
      influencerId: body.influencerId,
      amount: Number(body.amount),
      note: body.note,
      createdBy: currentUser?.id,
    });

    return NextResponse.json({ success: true, message: 'Commission credited to influencer wallet' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to credit commission' }, { status: 400 });
  }
}
