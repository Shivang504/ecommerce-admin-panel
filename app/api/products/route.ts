import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

function toBool(value: string | null): boolean {
  return value === 'true' || value === '1';
}

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(request.url);

    const search = (searchParams.get('search') || '').trim();
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '24', 10) || 24, 1), 100);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1);
    const skip = (page - 1) * limit;

    const status = (searchParams.get('status') || 'active').trim();
    const lightweight = toBool(searchParams.get('lightweight'));

    const query: any = {};
    if (status) query.status = status;
    if (toBool(searchParams.get('trending'))) query.trending = true;
    if (toBool(searchParams.get('bestSeller'))) query.bestSeller = true;
    if (toBool(searchParams.get('featured'))) query.featured = true;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { urlSlug: { $regex: search, $options: 'i' } },
      ];
    }

    const sortBy = (searchParams.get('sortBy') || 'createdAt').trim();
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
    const sort: any = { [sortBy]: sortOrder, _id: -1 };

    const projection = lightweight
      ? {
          name: 1,
          sellingPrice: 1,
          regularPrice: 1,
          mainImage: 1,
          urlSlug: 1,
          stock: 1,
          status: 1,
          createdAt: 1,
        }
      : undefined;

    const products = await db
      .collection('products')
      .find(query, { projection, maxTimeMS: 8000 })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray();

    const serialized = products.map((p: any) => ({
      ...p,
      _id: p._id?.toString?.() ?? p._id,
    }));

    // Compatibility: several client components expect `/api/products` to return an array.
    if (lightweight || search) {
      return NextResponse.json(serialized);
    }

    // When not lightweight, return an object with products for components that expect `data.products`.
    // We avoid `countDocuments` for performance; a precise total isn't required for most UIs.
    const total = serialized.length < limit ? (page - 1) * limit + serialized.length : page * limit + 1;

    return NextResponse.json({
      products: serialized,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('[Products API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

