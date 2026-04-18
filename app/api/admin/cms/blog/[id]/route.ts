import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();

    const blog = await db.collection('blog_posts').findOne({ _id: new ObjectId(id) });

    if (!blog) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...blog,
      _id: blog._id.toString(),
    });
  } catch (error) {
    console.error('[v0] Failed to fetch blog post:', error);
    return NextResponse.json({ error: 'Failed to fetch blog post' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { db } = await connectToDatabase();

    const existingBlog = await db.collection('blog_posts').findOne({ _id: new ObjectId(id) });
    if (!existingBlog) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });
    }

    const slug = body.slug || body.title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '');

    const updateData = {
      title: body.title,
      slug: slug,
      content: body.content,
      excerpt: body.excerpt,
      featuredImage: body.featuredImage,
      metaTitle: body.metaTitle,
      metaDescription: body.metaDescription,
      metaKeywords: body.metaKeywords,
      author: body.author,
      status: body.status,
      publishedAt: body.status === 'published' && !existingBlog.publishedAt ? new Date() : existingBlog.publishedAt,
      updatedAt: new Date(),
    };

    await db.collection('blog_posts').updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    const updatedBlog = await db.collection('blog_posts').findOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      ...updatedBlog,
      _id: updatedBlog?._id.toString(),
    });
  } catch (error) {
    console.error('[v0] Failed to update blog post:', error);
    return NextResponse.json({ error: 'Failed to update blog post' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await connectToDatabase();

    const result = await db.collection('blog_posts').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Blog post deleted successfully' });
  } catch (error) {
    console.error('[v0] Failed to delete blog post:', error);
    return NextResponse.json({ error: 'Failed to delete blog post' }, { status: 500 });
  }
}

