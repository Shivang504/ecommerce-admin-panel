import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, requireAdminAuth } from '@/lib/auth';
import { deleteClosedBooking, getBookingImage, updateBooking } from '@/lib/ads';

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const unauthorized = requireAdminAuth(request);
    if (unauthorized) return unauthorized;
    const { id } = await context.params;
    await deleteClosedBooking(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Delete failed' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const unauthorized = requireAdminAuth(request);
    if (unauthorized) return unauthorized;
    const { id } = await context.params;
    const body = await request.json();
    await updateBooking(id, body, getUserFromRequest(request)?.email);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Update failed' }, { status: 400 });
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) return unauthorized;
  const { id } = await context.params;
  const image = await getBookingImage(id);
  if (!image) return NextResponse.json({ error: 'No banner image' }, { status: 404 });
  return NextResponse.json({ url: image });
}
