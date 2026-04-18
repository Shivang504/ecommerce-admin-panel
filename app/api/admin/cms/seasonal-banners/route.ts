import { connectToDatabase } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const filter: any = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    const banners = await db
      .collection('seasonal_banners')
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
    console.error('[v0] Failed to fetch seasonal banners:', error);
    return NextResponse.json({ error: 'Failed to fetch seasonal banners' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const body = await request.json();

    const newBanner = {
      title: body.title || '',
      heroImage: body.heroImage || '',
      products: body.products || [],
      order: body.order || 0,
      status: body.status || 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('seasonal_banners').insertOne(newBanner);

    return NextResponse.json(
      {
        ...newBanner,
        _id: result.insertedId.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[v0] Failed to create seasonal banner:', error);
    return NextResponse.json({ error: 'Failed to create seasonal banner' }, { status: 500 });
  }
}

