import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth, getUserFromRequest } from '@/lib/auth';
import { creditLoyaltyPoints } from '@/lib/models/loyalty';

export async function POST(request: NextRequest) {
  try {
    const unauthorized = requireAdminAuth(request);
    if (unauthorized) return unauthorized;

    const body = await request.json();
    const customerId = body.customerId;
    const points = Number(body.points);
    const note = (body.note || 'Admin adjustment').toString();

    if (!customerId || !Number.isFinite(points) || points === 0) {
      return NextResponse.json(
        { error: 'customerId and non-zero points are required' },
        { status: 400 }
      );
    }

    const admin = getUserFromRequest(request);
    const balance = await creditLoyaltyPoints({
      customerId,
      points,
      type: 'adjust',
      note,
      createdBy: admin?.id || admin?.email || 'admin',
    });

    return NextResponse.json({
      success: true,
      balance,
      message: `Adjusted ${points > 0 ? '+' : ''}${points} points`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to adjust points' },
      { status: 500 }
    );
  }
}
