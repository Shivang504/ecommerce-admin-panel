import { connectToDatabase } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const section = searchParams.get('section');

    const filter: any = {};
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ];
    }
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (section && section !== 'all') {
      filter.section = section;
    }

    const pages = await db
      .collection('footer_pages')
      .find(filter)
      .sort({ section: 1, title: 1 })
      .toArray();

    return NextResponse.json(
      pages.map(page => ({
        ...page,
        _id: page._id.toString(),
        createdAt: page.createdAt ? new Date(page.createdAt).toISOString() : null,
        updatedAt: page.updatedAt ? new Date(page.updatedAt).toISOString() : null,
        publishedAt: page.publishedAt ? new Date(page.publishedAt).toISOString() : null,
      }))
    );
  } catch (error) {
    console.error('[v0] Failed to fetch footer pages:', error);
    return NextResponse.json({ error: 'Failed to fetch footer pages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const body = await request.json();

    // Generate slug from title if not provided
    const slug = body.slug?.trim() || body.title
      ?.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '') || '';

    if (!body.title || !body.section) {
      return NextResponse.json(
        { error: 'Title and section are required' },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existingPage = await db.collection('footer_pages').findOne({ slug });
    if (existingPage) {
      return NextResponse.json(
        { error: 'A page with this slug already exists' },
        { status: 400 }
      );
    }

    const newPage = {
      title: body.title.trim(),
      slug: slug,
      section: body.section,
      content: body.content || '',
      status: body.status || 'draft',
      publishedAt: body.status === 'published' ? new Date() : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('footer_pages').insertOne(newPage);

    return NextResponse.json(
      {
        ...newPage,
        _id: result.insertedId.toString(),
        createdAt: newPage.createdAt.toISOString(),
        updatedAt: newPage.updatedAt.toISOString(),
        publishedAt: newPage.publishedAt ? newPage.publishedAt.toISOString() : null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[v0] Failed to create footer page:', error);
    return NextResponse.json({ error: 'Failed to create footer page' }, { status: 500 });
  }
}

