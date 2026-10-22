import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import { listPlacements, updatePlacement } from '@/lib/ads';

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const unauthorized = requireAdminAuth(request);
    if (unauthorized) return unauthorized;
    const { id } = await context.params;
    const body = await request.json();
    await updatePlacement(id, body);
    return NextResponse.json({ success: true, placements: await listPlacements() });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Update failed' }, { status: 400 });
  }
}
