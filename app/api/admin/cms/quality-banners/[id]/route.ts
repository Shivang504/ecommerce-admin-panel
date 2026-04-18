import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();

    const banner = await db.collection('quality_banners').findOne({ _id: new ObjectId(id) });

    if (!banner) {
      return NextResponse.json({ error: 'Quality banner not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...banner,
      _id: banner._id.toString(),
    });
  } catch (error) {
    console.error('[v0] Failed to fetch quality banner:', error);
    return NextResponse.json({ error: 'Failed to fetch quality banner' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { db } = await connectToDatabase();

    const existingBanner = await db.collection('quality_banners').findOne({ _id: new ObjectId(id) });
    if (!existingBanner) {
      return NextResponse.json({ error: 'Quality banner not found' }, { status: 404 });
    }

    const updateData = {
      title: body.title,
      features: body.features,
      order: body.order,
      status: body.status,
      updatedAt: new Date(),
    };

    await db.collection('quality_banners').updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    const updatedBanner = await db.collection('quality_banners').findOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      ...updatedBanner,
      _id: updatedBanner?._id.toString(),
    });
  } catch (error) {
    console.error('[v0] Failed to update quality banner:', error);
    return NextResponse.json({ error: 'Failed to update quality banner' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();

    const result = await db.collection('quality_banners').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Quality banner not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Quality banner deleted successfully' });
  } catch (error) {
    console.error('[v0] Failed to delete quality banner:', error);
    return NextResponse.json({ error: 'Failed to delete quality banner' }, { status: 500 });
  }
}

