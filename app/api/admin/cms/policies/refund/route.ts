import { connectToDatabase } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const policy = await db.collection('cms_policies').findOne({ type: 'refund' });

    if (!policy) {
      return NextResponse.json({
        type: 'refund',
        title: 'Refund and Return Policy',
        content: '',
        metaTitle: '',
        metaDescription: '',
        status: 'active',
      });
    }

    return NextResponse.json({
      ...policy,
      _id: policy._id.toString(),
    });
  } catch (error) {
    console.error('[v0] Failed to fetch refund policy:', error);
    return NextResponse.json({ error: 'Failed to fetch refund policy' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const body = await request.json();

    const policyData = {
      type: 'refund',
      title: body.title || 'Refund and Return Policy',
      content: body.content || '',
      metaTitle: body.metaTitle || '',
      metaDescription: body.metaDescription || '',
      status: body.status || 'active',
      updatedAt: new Date(),
    };

    const existing = await db.collection('cms_policies').findOne({ type: 'refund' });

    if (existing) {
      await db.collection('cms_policies').updateOne(
        { type: 'refund' },
        { $set: policyData }
      );
      const updated = await db.collection('cms_policies').findOne({ type: 'refund' });
      return NextResponse.json({
        ...updated,
        _id: updated?._id.toString(),
      });
    } else {
      const result = await db.collection('cms_policies').insertOne({
        ...policyData,
        createdAt: new Date(),
      });
      const newPolicy = await db.collection('cms_policies').findOne({ _id: result.insertedId });
      return NextResponse.json(
        {
          ...newPolicy,
          _id: newPolicy?._id.toString(),
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error('[v0] Failed to save refund policy:', error);
    return NextResponse.json({ error: 'Failed to save refund policy' }, { status: 500 });
  }
}

