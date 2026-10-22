import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import { getAdSummary, indiaToday, listBookings, listPlacements } from '@/lib/ads';

export async function GET(request: NextRequest) {
  try {
    const unauthorized = requireAdminAuth(request);
    if (unauthorized) return unauthorized;
    const status = request.nextUrl.searchParams.get('status') || 'all';
    const [placements, bookings, summary] = await Promise.all([listPlacements(), listBookings(status), getAdSummary()]);
    return NextResponse.json({ placements, bookings, summary, today: indiaToday() });
  } catch (error: any) {
    console.error('[Ads] List failed:', error);
    return NextResponse.json({ error: error?.message || 'Failed to load ads' }, { status: 500 });
  }
}
