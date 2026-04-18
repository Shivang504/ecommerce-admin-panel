import { connectToDatabase } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    const filter: any = {};
    if (search) {
      filter.$or = [
        { quote: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }
    if (status && status !== 'all') {
      filter.status = status;
    }

    const slides = await db
      .collection('testimonial_slides')
      .find(filter)
      .sort({ order: 1, createdAt: -1 })
      .toArray();

    return NextResponse.json(
      slides.map(slide => ({
        ...slide,
        _id: slide._id.toString(),
      }))
    );
  } catch (error) {
    console.error('[v0] Failed to fetch testimonial slides:', error);
    return NextResponse.json({ error: 'Failed to fetch testimonial slides' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const body = await request.json();

    const newSlide = {
      quote: body.quote || '',
      author: body.author || '',
      location: body.location || '',
      product: body.product || {
        id: null,
        category: '',
        name: '',
        price: '',
        image: '',
      },
      leftBanner: body.leftBanner || '',
      rightBanner: body.rightBanner || '',
      order: body.order || 0,
      status: body.status || 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('testimonial_slides').insertOne(newSlide);

    return NextResponse.json(
      {
        ...newSlide,
        _id: result.insertedId.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[v0] Failed to create testimonial slide:', error);
    return NextResponse.json({ error: 'Failed to create testimonial slide' }, { status: 500 });
  }
}

