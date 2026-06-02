'use client';

import { ProductImageGallery } from '@/components/products/product-image-gallery';

type Variant = {
  attributeCombination?: Record<string, string>;
  image?: string;
};

export type StorefrontProduct = {
  _id: string;
  name: string;
  sellingPrice?: number;
  regularPrice?: number;
  shortDescription?: string;
  longDescription?: string;
  mainImage?: string;
  galleryImages?: string[];
  colorGalleryImages?: Record<string, string[]>;
  variants?: Variant[];
};

export function ProductDetailClient({ product }: { product: StorefrontProduct }) {
  return (
    <div className='site-container py-6'>
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
        <ProductImageGallery
          mainImage={product.mainImage}
          galleryImages={product.galleryImages}
          colorGalleryImages={product.colorGalleryImages}
          variants={product.variants}
        />

        <div>
          <h1 className='text-2xl sm:text-3xl font-bold text-gray-900'>{product.name}</h1>
          <div className='mt-3 flex items-baseline gap-3 flex-wrap'>
            <div className='text-2xl font-bold text-web'>
              ₹{Number(product.sellingPrice ?? product.regularPrice ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            {typeof product.regularPrice === 'number' &&
              typeof product.sellingPrice === 'number' &&
              product.regularPrice > product.sellingPrice && (
                <div className='text-sm text-gray-500 line-through'>
                  ₹{product.regularPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
              )}
          </div>

          {product.shortDescription && <p className='mt-4 text-gray-700'>{product.shortDescription}</p>}

          {product.longDescription && (
            <div className='mt-6'>
              <h2 className='text-lg font-semibold text-gray-900 mb-2'>Description</h2>
              <div className='prose max-w-none text-gray-700'>
                <p>{product.longDescription}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

