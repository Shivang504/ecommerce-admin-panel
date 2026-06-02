import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { sanitizeAttributeSelections } from '@/lib/product-attributes';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { db } = await connectToDatabase();

    const trimmed = (slug || '').trim();
    if (!trimmed) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const bySlug = await db.collection('products').findOne({ urlSlug: trimmed });
    const product =
      bySlug ||
      (ObjectId.isValid(trimmed)
        ? await db.collection('products').findOne({ _id: new ObjectId(trimmed) })
        : null);

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const productData: any = {
      ...product,
      _id: product._id?.toString?.() ?? product._id,
      tags: Array.isArray(product.tags) ? product.tags : [],
      galleryImages: Array.isArray(product.galleryImages) ? product.galleryImages : [],
      relatedProducts: Array.isArray(product.relatedProducts) ? product.relatedProducts : [],
      attributes: sanitizeAttributeSelections(product.attributes),
      colorGalleryImages:
        product.colorGalleryImages && typeof product.colorGalleryImages === 'object'
          ? product.colorGalleryImages
          : {},
      variants: Array.isArray(product.variants) ? product.variants : [],
    };

    return NextResponse.json(productData);
  } catch (error) {
    console.error('[Product API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

