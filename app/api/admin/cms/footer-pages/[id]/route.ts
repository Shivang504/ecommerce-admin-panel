import { connectToDatabase } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();

    const page = await db.collection('footer_pages').findOne({ _id: new ObjectId(id) });

    if (!page) {
      return NextResponse.json({ error: 'Footer page not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...page,
      _id: page._id.toString(),
      createdAt: page.createdAt ? new Date(page.createdAt).toISOString() : null,
      updatedAt: page.updatedAt ? new Date(page.updatedAt).toISOString() : null,
      publishedAt: page.publishedAt ? new Date(page.publishedAt).toISOString() : null,
    });
  } catch (error) {
    console.error('[v0] Failed to fetch footer page:', error);
    return NextResponse.json({ error: 'Failed to fetch footer page' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { db } = await connectToDatabase();

    const existingPage = await db.collection('footer_pages').findOne({ _id: new ObjectId(id) });
    if (!existingPage) {
      return NextResponse.json({ error: 'Footer page not found' }, { status: 404 });
    }

    // Generate slug from title if not provided or changed
    let slug = body.slug?.trim();
    if (!slug || slug !== existingPage.slug) {
      slug = body.title
        ?.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '') || existingPage.slug;
    }

    // Check if slug already exists (excluding current page)
    if (slug !== existingPage.slug) {
      const slugExists = await db.collection('footer_pages').findOne({ 
        slug, 
        _id: { $ne: new ObjectId(id) } 
      });
      if (slugExists) {
        return NextResponse.json(
          { error: 'A page with this slug already exists' },
          { status: 400 }
        );
      }
    }

    const updateData = {
      title: body.title.trim(),
      slug: slug,
      section: body.section,
      content: body.content || '',
      status: body.status || 'draft',
      publishedAt: body.status === 'published' && !existingPage.publishedAt 
        ? new Date() 
        : body.status === 'published' 
        ? existingPage.publishedAt 
        : null,
      updatedAt: new Date(),
    };

    await db.collection('footer_pages').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    const updatedPage = await db.collection('footer_pages').findOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      ...updatedPage,
      _id: updatedPage?._id.toString(),
      createdAt: updatedPage?.createdAt ? new Date(updatedPage.createdAt).toISOString() : null,
      updatedAt: updatedPage?.updatedAt ? new Date(updatedPage.updatedAt).toISOString() : null,
      publishedAt: updatedPage?.publishedAt ? new Date(updatedPage.publishedAt).toISOString() : null,
    });
  } catch (error) {
    console.error('[v0] Failed to update footer page:', error);
    return NextResponse.json({ error: 'Failed to update footer page' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();

    const result = await db.collection('footer_pages').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Footer page not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Footer page deleted successfully' });
  } catch (error) {
    console.error('[v0] Failed to delete footer page:', error);
    return NextResponse.json({ error: 'Failed to delete footer page' }, { status: 500 });
  }
}

