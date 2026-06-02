'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getProductUrl } from '@/app/utils/helper';

type Product = {
  _id: string;
  name: string;
  sellingPrice?: number;
  regularPrice?: number;
  mainImage?: string;
  urlSlug?: string;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/products?limit=24&status=active');
        const data = await res.json();
        const list = Array.isArray(data) ? data : Array.isArray(data?.products) ? data.products : [];
        setProducts(list);
      } catch (e) {
        console.error('Failed to load products', e);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  if (loading) {
    return (
      <div className='site-container py-10'>
        <div className='text-gray-600'>Loading products…</div>
      </div>
    );
  }

  return (
    <div className='site-container py-8'>
      <h1 className='text-2xl sm:text-3xl font-bold text-web mb-6'>Products</h1>

      {products.length === 0 ? (
        <div className='text-gray-600'>No products found.</div>
      ) : (
        <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6'>
          {products.map(p => {
            const href = getProductUrl(p._id, p.urlSlug);
            return (
              <Link
                key={p._id}
                href={href}
                className='bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition'
              >
                <div className='relative aspect-square bg-gray-50'>
                  <Image
                    src={p.mainImage || '/placeholder.jpg'}
                    alt={p.name}
                    fill
                    sizes='(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw'
                    className='object-cover'
                  />
                </div>
                <div className='p-3 sm:p-4'>
                  <div className='text-sm sm:text-base font-semibold text-gray-900 line-clamp-2 min-h-10'>
                    {p.name}
                  </div>
                  <div className='mt-2 text-web font-bold'>
                    ₹{Number(p.sellingPrice ?? p.regularPrice ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

