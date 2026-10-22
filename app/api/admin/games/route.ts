import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import { getGameSettings, listCampaigns, listGameActivity, saveGameSettings } from '@/lib/models/gamification';

export async function GET(request: NextRequest) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) return unauthorized;
  const [settings, campaigns, activity] = await Promise.all([
    getGameSettings(),
    listCampaigns(),
    listGameActivity(),
  ]);
  return NextResponse.json({ success: true, settings, campaigns, activity });
}

export async function PUT(request: NextRequest) {
  try {
    const unauthorized = requireAdminAuth(request);
    if (unauthorized) return unauthorized;
    const body = await request.json();
    const settings = await saveGameSettings(body);
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save games' }, { status: 400 });
  }
}
