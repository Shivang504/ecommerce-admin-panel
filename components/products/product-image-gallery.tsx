'use client';

import { useEffect, useMemo, useState } from 'react';
import { getColorKeyInCombination, uniqueImages } from '@/lib/attribute-images';

type Variant = {
  attributeCombination?: Record<string, string>;
  image?: string;
};

export type ProductGalleryProps = {
  mainImage?: string | null;
  galleryImages?: string[] | null;
  colorGalleryImages?: Record<string, string[]> | null;
  variants?: Variant[] | null;
};

function normalizeUrls(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.map(v => (typeof v === 'string' ? v.trim() : '')).filter(Boolean);
}

function getColorsFromVariants(variants: Variant[]): string[] {
  const colors: string[] = [];
  for (const v of variants) {
    const comb = v.attributeCombination;
    if (!comb) continue;
    const key = getColorKeyInCombination(comb);
    if (!key) continue;
    const value = (comb[key] || '').trim();
    if (value) colors.push(value);
  }
  return uniqueImages(colors);
}

export function ProductImageGallery({ mainImage, galleryImages, colorGalleryImages, variants }: ProductGalleryProps) {
  const baseImages = useMemo(() => {
    return uniqueImages([mainImage || undefined, ...normalizeUrls(galleryImages)]);
  }, [mainImage, galleryImages]);

  const colors = useMemo(() => {
    const fromMap = uniqueImages(Object.keys(colorGalleryImages || {}).map(c => c.trim()).filter(Boolean));
    const fromVariants = getColorsFromVariants(Array.isArray(variants) ? variants : []);
    return uniqueImages([...fromMap, ...fromVariants]);
  }, [colorGalleryImages, variants]);

  const allColorImages = useMemo(() => {
    const map = colorGalleryImages || {};
    const flattened: string[] = [];
    for (const color of Object.keys(map)) {
      flattened.push(...normalizeUrls(map[color]));
    }
    // Also include variant hero images if they exist
    const variantImgs = (Array.isArray(variants) ? variants : [])
      .map(v => (typeof v.image === 'string' ? v.image.trim() : ''))
      .filter(Boolean);
    return uniqueImages([...flattened, ...variantImgs]);
  }, [colorGalleryImages, variants]);

  const [selectedColor, setSelectedColor] = useState<string | null>(colors[0] || null);
  const [activeImage, setActiveImage] = useState<string>(() => {
    // prefer first color image, then main image, then first gallery
    const firstColor = selectedColor ? (colorGalleryImages?.[selectedColor] || [])[0] : undefined;
    return (firstColor || baseImages[0] || allColorImages[0] || '/placeholder.jpg').toString();
  });

  const colorImages = useMemo(() => {
    if (!selectedColor) return [];
    return uniqueImages([
      ...(normalizeUrls(colorGalleryImages?.[selectedColor] || [])),
      ...(Array.isArray(variants)
        ? variants
            .map(v => (typeof v.image === 'string' ? v.image.trim() : ''))
            .filter(Boolean)
        : []),
    ]);
  }, [selectedColor, colorGalleryImages, variants]);

  const thumbnails = useMemo(() => {
    // Requirement: show all color-specific images + gallery thumbnails on the left.
    // When a color is selected, bring that color's images to the front.
    if (selectedColor) {
      return uniqueImages([...colorImages, ...allColorImages, ...baseImages]);
    }
    return uniqueImages([...allColorImages, ...baseImages]);
  }, [selectedColor, colorImages, allColorImages, baseImages]);

  // When color changes, auto-switch to that color's first image.
  useEffect(() => {
    if (!selectedColor) return;
    const first = normalizeUrls(colorGalleryImages?.[selectedColor] || [])[0];
    if (first) setActiveImage(first);
  }, [selectedColor, colorGalleryImages]);

  // Keep active image valid if thumbnails change (e.g., data loads)
  useEffect(() => {
    if (!activeImage || !thumbnails.includes(activeImage)) {
      setActiveImage(thumbnails[0] || '/placeholder.jpg');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thumbnails.join('|')]);

  return (
    <div className='grid grid-cols-12 gap-4'>
      <div className='col-span-12 md:col-span-2'>
        <div className='flex md:flex-col gap-2 overflow-auto md:max-h-[560px] pr-1'>
          {thumbnails.map(url => {
            const isActive = url === activeImage;
            return (
              <button
                key={url}
                type='button'
                onClick={() => setActiveImage(url)}
                className={[
                  'relative h-20 w-20 md:w-full md:h-24 rounded-lg overflow-hidden border',
                  isActive ? 'border-web ring-2 ring-web/20' : 'border-gray-200 hover:border-gray-300',
                ].join(' ')}
                aria-label='Select product image'
              >
                <img src={url} alt='Product thumbnail' className='h-full w-full object-cover' />
              </button>
            );
          })}
        </div>
      </div>

      <div className='col-span-12 md:col-span-10'>
        <div className='rounded-xl border border-gray-200 bg-white overflow-hidden'>
          <div className='aspect-square md:aspect-4/3 bg-gray-50'>
            <img src={activeImage} alt='Product image' className='h-full w-full object-contain' />
          </div>
        </div>

        {colors.length > 0 && (
          <div className='mt-4'>
            <div className='text-sm font-semibold text-gray-800 mb-2'>
              Color:{' '}
              <span className='font-normal text-gray-600'>{selectedColor ? selectedColor : 'Select'}</span>
            </div>
            <div className='flex flex-wrap gap-2'>
              {colors.map(color => {
                const isSelected = color === selectedColor;
                return (
                  <button
                    key={color}
                    type='button'
                    onClick={() => setSelectedColor(color)}
                    className={[
                      'px-3 py-1.5 rounded-full text-sm border transition',
                      isSelected ? 'border-web bg-web text-white' : 'border-gray-300 bg-white text-gray-800 hover:border-gray-400',
                    ].join(' ')}
                  >
                    {color}
                  </button>
                );
              })}
              <button
                type='button'
                onClick={() => setSelectedColor(null)}
                className='px-3 py-1.5 rounded-full text-sm border border-gray-300 bg-white text-gray-800 hover:border-gray-400'
              >
                All
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

