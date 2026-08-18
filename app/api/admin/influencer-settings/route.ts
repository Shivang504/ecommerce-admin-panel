import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import { getInfluencerSettings, saveInfluencerSettings, DEFAULT_INFLUENCER_SETTINGS } from '@/lib/models/influencer';

export async function GET(request: NextRequest) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) return unauthorized;

  const settings = await getInfluencerSettings();
  return NextResponse.json({ success: true, settings });
}

export async function PUT(request: NextRequest) {
  try {
    const unauthorized = requireAdminAuth(request);
    if (unauthorized) return unauthorized;

    const body = await request.json();
    const settings = await saveInfluencerSettings({
      ...DEFAULT_INFLUENCER_SETTINGS,
      ...body,
    });
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save settings' }, { status: 500 });
  }
}
