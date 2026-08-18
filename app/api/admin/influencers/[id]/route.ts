import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { serializeInfluencer } from '@/lib/models/influencer';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const unauthorized = requireAdminAuth(request);
    if (unauthorized) return unauthorized;

    const { id } = await params;
    const body = await request.json();
    const { db } = await connectToDatabase();

    const update: any = { updatedAt: new Date() };
    if (body.influencerStatus && ['active', 'suspended', 'pending'].includes(body.influencerStatus)) {
      update.influencerStatus = body.influencerStatus;
    }

    await db.collection('customers').updateOne({ _id: new ObjectId(id) }, { $set: update });
    const customer = await db.collection('customers').findOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true, influencer: serializeInfluencer(customer) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update influencer' }, { status: 500 });
  }
}
