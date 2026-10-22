import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import { getAdvancedAnalytics } from '@/lib/analytics';

export async function GET(request: NextRequest) {
  try {
    const unauthorized = requireAdminAuth(request);
    if (unauthorized) return unauthorized;
    const months = Number(request.nextUrl.searchParams.get('months') || 12);
    const data = await getAdvancedAnalytics({ months });
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Analytics]', error);
    return NextResponse.json({ error: error?.message || 'Failed to load analytics' }, { status: 500 });
  }
}
