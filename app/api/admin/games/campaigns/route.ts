import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import { createCampaign, listCampaigns } from '@/lib/models/gamification';

export async function GET(request: NextRequest) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) return unauthorized;
  const campaigns = await listCampaigns();
  return NextResponse.json({ success: true, campaigns });
}

export async function POST(request: NextRequest) {
  try {
    const unauthorized = requireAdminAuth(request);
    if (unauthorized) return unauthorized;
    const body = await request.json();
    const id = await createCampaign(body);
    const campaigns = await listCampaigns();
    return NextResponse.json({ success: true, id, campaigns });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create campaign' }, { status: 400 });
  }
}
