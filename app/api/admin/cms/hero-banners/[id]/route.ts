import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();

    const banner = await db.collection('hero_banners').findOne({ _id: new ObjectId(id) });

    if (!banner) {
      return NextResponse.json({ error: 'Hero banner not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...banner,
      _id: banner._id.toString(),
    });
  } catch (error) {
    console.error('[v0] Failed to fetch hero banner:', error);
    return NextResponse.json({ error: 'Failed to fetch hero banner' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { db } = await connectToDatabase();

    const existingBanner = await db.collection('hero_banners').findOne({ _id: new ObjectId(id) });
    if (!existingBanner) {
      return NextResponse.json({ error: 'Hero banner not found' }, { status: 404 });
    }

    const updateData = {
      tag: body.tag,
      title: body.title,
      subtitle: body.subtitle,
      buttonText: body.buttonText,
      buttonLink: body.buttonLink,
      image: body.image,
      textColor: body.textColor,
      gradient: body.gradient,
      type: body.type,
      order: body.order,
      status: body.status,
      updatedAt: new Date(),
    };

    await db.collection('hero_banners').updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    const updatedBanner = await db.collection('hero_banners').findOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      ...updatedBanner,
      _id: updatedBanner?._id.toString(),
    });
  } catch (error) {
    console.error('[v0] Failed to update hero banner:', error);
    return NextResponse.json({ error: 'Failed to update hero banner' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();

    const result = await db.collection('hero_banners').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Hero banner not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Hero banner deleted successfully' });
  } catch (error) {
    console.error('[v0] Failed to delete hero banner:', error);
    return NextResponse.json({ error: 'Failed to delete hero banner' }, { status: 500 });
  }
}

