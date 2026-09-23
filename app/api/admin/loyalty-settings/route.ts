import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import {
  DEFAULT_LOYALTY_SETTINGS,
  getLoyaltySettings,
  saveLoyaltySettings,
} from '@/lib/models/loyalty';

export async function GET(request: NextRequest) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) return unauthorized;
  const settings = await getLoyaltySettings();
  return NextResponse.json({ success: true, settings });
}

export async function PUT(request: NextRequest) {
  try {
    const unauthorized = requireAdminAuth(request);
    if (unauthorized) return unauthorized;
    const body = await request.json();
    const settings = await saveLoyaltySettings({
      ...DEFAULT_LOYALTY_SETTINGS,
      ...body,
    });
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to save loyalty settings' },
      { status: 500 }
    );
  }
}
