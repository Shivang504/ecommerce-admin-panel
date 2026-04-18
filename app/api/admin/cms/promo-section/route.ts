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

    const promo = await db
      .collection('promo_section')
      .findOne(filter, { sort: { order: 1, createdAt: -1 } });

    if (!promo) {
      return NextResponse.json(null);
    }

    return NextResponse.json({
      ...promo,
      _id: promo._id.toString(),
    });
  } catch (error) {
    console.error('[v0] Failed to fetch promo section:', error);
    return NextResponse.json({ error: 'Failed to fetch promo section' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const body = await request.json();

    // Delete existing promo section if any
    await db.collection('promo_section').deleteMany({});

    // Combine date and time for start and end
    let startDateTime: Date | null = null;
    let endDateTime: Date | null = null;

    if (body.startDate && body.startTime) {
      const [hours, minutes] = body.startTime.split(':').map(Number);
      startDateTime = new Date(body.startDate);
      startDateTime.setHours(hours || 0, minutes || 0, 0, 0);
    }

    if (body.endDate && body.endTime) {
      const [hours, minutes] = body.endTime.split(':').map(Number);
      endDateTime = new Date(body.endDate);
      endDateTime.setHours(hours || 0, minutes || 0, 0, 0);
    }

    const newPromo = {
      title: body.title || '',
      tagline: body.tagline || '',
      mainHeading: body.mainHeading || '',
      ctaText: body.ctaText || '',
      ctaLink: body.ctaLink || '/products',
      gradientFrom: body.gradientFrom || 'amber-100',
      gradientTo: body.gradientTo || 'yellow-100',
      countdown: body.countdown || {
        days: 7,
        hours: 12,
        minutes: 45,
        seconds: 30,
      },
      order: body.order || 0,
      status: body.status || 'active',
      startDate: startDateTime,
      endDate: endDateTime,
      startTime: body.startTime || '',
      endTime: body.endTime || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('promo_section').insertOne(newPromo);

    return NextResponse.json(
      {
        ...newPromo,
        _id: result.insertedId.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[v0] Failed to create promo section:', error);
    return NextResponse.json({ error: 'Failed to create promo section' }, { status: 500 });
  }
}

