import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();

    const slide = await db.collection('testimonial_slides').findOne({ _id: new ObjectId(id) });

    if (!slide) {
      return NextResponse.json({ error: 'Testimonial slide not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...slide,
      _id: slide._id.toString(),
    });
  } catch (error) {
    console.error('[v0] Failed to fetch testimonial slide:', error);
    return NextResponse.json({ error: 'Failed to fetch testimonial slide' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { db } = await connectToDatabase();

    const existingSlide = await db.collection('testimonial_slides').findOne({ _id: new ObjectId(id) });
    if (!existingSlide) {
      return NextResponse.json({ error: 'Testimonial slide not found' }, { status: 404 });
    }

    const updateData = {
      quote: body.quote,
      author: body.author,
      location: body.location,
      product: body.product,
      leftBanner: body.leftBanner,
      rightBanner: body.rightBanner,
      order: body.order,
      status: body.status,
      updatedAt: new Date(),
    };

    await db.collection('testimonial_slides').updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    const updatedSlide = await db.collection('testimonial_slides').findOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      ...updatedSlide,
      _id: updatedSlide?._id.toString(),
    });
  } catch (error) {
    console.error('[v0] Failed to update testimonial slide:', error);
    return NextResponse.json({ error: 'Failed to update testimonial slide' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();

    const result = await db.collection('testimonial_slides').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Testimonial slide not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Testimonial slide deleted successfully' });
  } catch (error) {
    console.error('[v0] Failed to delete testimonial slide:', error);
    return NextResponse.json({ error: 'Failed to delete testimonial slide' }, { status: 500 });
  }
}

