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
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ];
    }
    if (status && status !== 'all') {
      filter.status = status;
    }

    const blogs = await db
      .collection('blog_posts')
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(
      blogs.map(blog => ({
        ...blog,
        _id: blog._id.toString(),
      }))
    );
  } catch (error) {
    console.error('[v0] Failed to fetch blog posts:', error);
    return NextResponse.json({ error: 'Failed to fetch blog posts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const body = await request.json();

    const slug = body.slug || body.title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '');

    const newBlog = {
      title: body.title || '',
      slug: slug,
      content: body.content || '',
      excerpt: body.excerpt || '',
      featuredImage: body.featuredImage || '',
      metaTitle: body.metaTitle || '',
      metaDescription: body.metaDescription || '',
      metaKeywords: body.metaKeywords || '',
      author: body.author || '',
      status: body.status || 'draft',
      publishedAt: body.status === 'published' ? new Date() : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('blog_posts').insertOne(newBlog);

    return NextResponse.json(
      {
        ...newBlog,
        _id: result.insertedId.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[v0] Failed to create blog post:', error);
    return NextResponse.json({ error: 'Failed to create blog post' }, { status: 500 });
  }
}

