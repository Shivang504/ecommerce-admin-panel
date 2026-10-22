import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import { deleteCampaign, listCampaigns, updateCampaign } from '@/lib/models/gamification';

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const unauthorized = requireAdminAuth(request);
    if (unauthorized) return unauthorized;
    const { id } = await context.params;
    const body = await request.json();
    await updateCampaign(id, body);
    const campaigns = await listCampaigns();
    return NextResponse.json({ success: true, campaigns });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update campaign' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const unauthorized = requireAdminAuth(request);
    if (unauthorized) return unauthorized;
    const { id } = await context.params;
    await deleteCampaign(id);
    const campaigns = await listCampaigns();
    return NextResponse.json({ success: true, campaigns });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete campaign' }, { status: 400 });
  }
}
