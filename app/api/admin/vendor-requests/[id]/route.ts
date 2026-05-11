import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getUserFromRequest, requireAdminAuth } from '@/lib/auth';
import {
  getVendorAdminRequestById,
  updateVendorAdminRequestByAdmin,
  type VendorAdminRequestStatus,
} from '@/lib/models/vendor-admin-request';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const currentUser = getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const existing = await getVendorAdminRequestById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const body = await request.json();
    const status = body.status as VendorAdminRequestStatus | undefined;
    const adminReply = typeof body.adminReply === 'string' ? body.adminReply.trim() : undefined;

    const allowed: VendorAdminRequestStatus[] = ['open', 'in_progress', 'resolved', 'closed'];
    if (status !== undefined && !allowed.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    if (adminReply !== undefined && adminReply.length > 8000) {
      return NextResponse.json({ error: 'Reply is too long' }, { status: 400 });
    }

    if (status === undefined && adminReply === undefined) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const updated = await updateVendorAdminRequestByAdmin(id, {
      ...(status !== undefined ? { status } : {}),
      ...(adminReply !== undefined ? { adminReply } : {}),
      updatedBy: currentUser.id,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[admin vendor-requests PATCH]', error);
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}
