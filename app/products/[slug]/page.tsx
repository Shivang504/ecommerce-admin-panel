import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { sanitizeAttributeSelections } from '@/lib/product-attributes';
import { ProductDetailClient, type StorefrontProduct } from '@/components/products/product-detail-client';

async function getProductBySlugOrId(slug: string): Promise<StorefrontProduct | null> {
  const { db } = await connectToDatabase();
  const trimmed = (slug || '').trim();
  if (!trimmed) return null;

  const bySlug = await db.collection('products').findOne({ urlSlug: trimmed });
  const product =
    bySlug ||
    (ObjectId.isValid(trimmed) ? await db.collection('products').findOne({ _id: new ObjectId(trimmed) }) : null);

  if (!product) return null;

  return {
    ...(product as any),
    _id: product._id.toString(),
    galleryImages: Array.isArray((product as any).galleryImages) ? (product as any).galleryImages : [],
    colorGalleryImages:
      (product as any).colorGalleryImages && typeof (product as any).colorGalleryImages === 'object'
        ? (product as any).colorGalleryImages
        : {},
    variants: Array.isArray((product as any).variants) ? (product as any).variants : [],
    attributes: sanitizeAttributeSelections((product as any).attributes),
  } as StorefrontProduct;
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlugOrId(slug);

  if (!product) {
    return (
      <div className='site-container py-12'>
        <div className='text-gray-600'>Product not found.</div>
      </div>
    );
  }

  return <ProductDetailClient product={product} />;
}

