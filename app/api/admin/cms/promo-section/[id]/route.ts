import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();

    const promo = await db.collection('promo_section').findOne({ _id: new ObjectId(id) });

    if (!promo) {
      return NextResponse.json({ error: 'Promo section not found' }, { status: 404 });
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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { db } = await connectToDatabase();

    const existingPromo = await db.collection('promo_section').findOne({ _id: new ObjectId(id) });
    if (!existingPromo) {
      return NextResponse.json({ error: 'Promo section not found' }, { status: 404 });
    }

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

    const updateData = {
      title: body.title,
      tagline: body.tagline,
      mainHeading: body.mainHeading,
      ctaText: body.ctaText,
      ctaLink: body.ctaLink,
      gradientFrom: body.gradientFrom,
      gradientTo: body.gradientTo,
      countdown: body.countdown,
      order: body.order,
      status: body.status,
      startDate: startDateTime,
      endDate: endDateTime,
      startTime: body.startTime || '',
      endTime: body.endTime || '',
      updatedAt: new Date(),
    };

    await db.collection('promo_section').updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    const updatedPromo = await db.collection('promo_section').findOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      ...updatedPromo,
      _id: updatedPromo?._id.toString(),
    });
  } catch (error) {
    console.error('[v0] Failed to update promo section:', error);
    return NextResponse.json({ error: 'Failed to update promo section' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();

    const result = await db.collection('promo_section').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Promo section not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Promo section deleted successfully' });
  } catch (error) {
    console.error('[v0] Failed to delete promo section:', error);
    return NextResponse.json({ error: 'Failed to delete promo section' }, { status: 500 });
  }
}

