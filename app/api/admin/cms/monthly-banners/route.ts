import { connectToDatabase } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const month = searchParams.get('month');

    const filter: any = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (month) {
      filter.month = month;
    }

    const banners = await db
      .collection('monthly_banners')
      .find(filter)
      .sort({ month: -1, order: 1, createdAt: -1 })
      .toArray();

    return NextResponse.json(
      banners.map(banner => ({
        ...banner,
        _id: banner._id.toString(),
      }))
    );
  } catch (error) {
    console.error('[v0] Failed to fetch monthly banners:', error);
    return NextResponse.json({ error: 'Failed to fetch monthly banners' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const body = await request.json();

    const newBanner = {
      title: body.title || '',
      description: body.description || '',
      month: body.month || new Date().getMonth() + 1, // 1-12
      year: body.year || new Date().getFullYear(),
      categories: body.categories || [],
      products: body.products || [],
      order: body.order || 0,
      status: body.status || 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('monthly_banners').insertOne(newBanner);

    return NextResponse.json(
      {
        ...newBanner,
        _id: result.insertedId.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[v0] Failed to create monthly banner:', error);
    return NextResponse.json({ error: 'Failed to create monthly banner' }, { status: 500 });
  }
}

