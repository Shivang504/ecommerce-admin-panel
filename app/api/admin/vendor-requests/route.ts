import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdminAuth } from '@/lib/auth';
import { listAllVendorAdminRequests, type VendorAdminRequest } from '@/lib/models/vendor-admin-request';

function serializeRequest(doc: VendorAdminRequest & { _id: ObjectId }) {
  return {
    _id: doc._id.toString(),
    vendorId:
      doc.vendorId && typeof doc.vendorId === 'object' && 'toString' in doc.vendorId
        ? doc.vendorId.toString()
        : String(doc.vendorId),
    vendorName: doc.vendorName,
    vendorEmail: doc.vendorEmail,
    requestType: doc.requestType,
    subject: doc.subject,
    message: doc.message,
    status: doc.status,
    adminReply: doc.adminReply,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
    updatedBy:
      doc.updatedBy && typeof doc.updatedBy === 'object' && 'toString' in doc.updatedBy
        ? doc.updatedBy.toString()
        : doc.updatedBy
          ? String(doc.updatedBy)
          : undefined,
  };
}

export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as VendorAdminRequest['status'] | null;
    const vendorId = searchParams.get('vendorId') || undefined;
    const filters: { status?: VendorAdminRequest['status']; vendorId?: string } = {};
    if (status && ['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      filters.status = status;
    }
    if (vendorId && ObjectId.isValid(vendorId)) filters.vendorId = vendorId;
    const rows = await listAllVendorAdminRequests(filters);
    return NextResponse.json({
      requests: rows.map(r => serializeRequest(r as VendorAdminRequest & { _id: ObjectId })),
    });
  } catch (error: unknown) {
    console.error('[admin vendor-requests GET]', error);
    return NextResponse.json({ error: 'Failed to load requests' }, { status: 500 });
  }
}
