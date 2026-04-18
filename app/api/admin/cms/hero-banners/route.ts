import { connectToDatabase } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    const filter: any = {};
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { tag: { $regex: search, $options: 'i' } },
      ];
    }
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (type && type !== 'all') {
      filter.type = type;
    }

    const banners = await db
      .collection('hero_banners')
      .find(filter)
      .sort({ order: 1, createdAt: -1 })
      .toArray();

    return NextResponse.json(
      banners.map(banner => ({
        ...banner,
        _id: banner._id.toString(),
      }))
    );
  } catch (error) {
    console.error('[v0] Failed to fetch hero banners:', error);
    return NextResponse.json({ error: 'Failed to fetch hero banners' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const body = await request.json();

    const newBanner = {
      tag: body.tag || '',
      title: body.title || '',
      subtitle: body.subtitle || '',
      buttonText: body.buttonText || '',
      buttonLink: body.buttonLink || '/products',
      image: body.image || '',
      textColor: body.textColor || 'text-white',
      gradient: body.gradient || '',
      type: body.type || 'big', // 'big' | 'medium' | 'small'
      order: body.order || 0,
      status: body.status || 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('hero_banners').insertOne(newBanner);

    return NextResponse.json(
      {
        ...newBanner,
        _id: result.insertedId.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[v0] Failed to create hero banner:', error);
    return NextResponse.json({ error: 'Failed to create hero banner' }, { status: 500 });
  }
}

