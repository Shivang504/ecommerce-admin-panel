import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';
import { requireAdminAuth } from '@/lib/auth';

type ImportRow = {
  rowNumber: number;
  categoryName: string;
  categorySlug?: string;
  categoryStatus?: 'active' | 'inactive';
  categoryPosition?: number;
  categoryFeatured?: boolean;

  subcategoryName?: string;
  subcategorySlug?: string;
  subcategoryStatus?: 'active' | 'inactive';
  subcategoryPosition?: number;
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isActiveInactive(v: unknown): v is 'active' | 'inactive' {
  return v === 'active' || v === 'inactive';
}

export async function POST(request: NextRequest) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const rows: ImportRow[] = Array.isArray(body?.rows) ? body.rows : [];
    const updateExisting: boolean = !!body?.options?.updateExisting;

    if (!rows.length) {
      return NextResponse.json({ error: 'No rows provided' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Determine current max positions to append when position is missing
    const maxCat = await db.collection('categories').findOne({}, { sort: { position: -1 } });
    let nextCategoryPosition = typeof maxCat?.position === 'number' ? maxCat.position + 1 : 0;

    const maxSub = await db.collection('subcategories').findOne({}, { sort: { position: -1 } });
    let nextSubcategoryPosition = typeof maxSub?.position === 'number' ? maxSub.position + 1 : 0;

    const errors: Array<{ rowNumber: number; message: string }> = [];
    let createdCategories = 0;
    let skippedCategories = 0;
    let createdSubcategories = 0;
    let skippedSubcategories = 0;

    // Cache categories encountered/created in this import by slug
    const categoryBySlug = new Map<string, { _id: ObjectId; slug: string }>();

    for (const r of rows) {
      if (!r || typeof r !== 'object') continue;

      const rowNumber = Number(r.rowNumber) || 0;
      const categoryName = String(r.categoryName ?? '').trim();
      if (!categoryName) {
        errors.push({ rowNumber, message: 'Category Name is required' });
        continue;
      }

      const categorySlug = slugify(String(r.categorySlug ?? '').trim() || categoryName);
      if (!categorySlug) {
        errors.push({ rowNumber, message: 'Unable to determine category slug' });
        continue;
      }

      let categoryId: ObjectId | null = null;
      const cached = categoryBySlug.get(categorySlug);
      if (cached) {
        categoryId = cached._id;
      } else {
        const existingCat = await db.collection('categories').findOne({ slug: categorySlug }, { projection: { _id: 1 } });

        if (existingCat?._id) {
          categoryId = existingCat._id as ObjectId;
          categoryBySlug.set(categorySlug, { _id: categoryId, slug: categorySlug });

          if (updateExisting) {
            const updateDoc: any = {
              name: categoryName,
              updatedAt: new Date(),
            };
            if (isActiveInactive(r.categoryStatus)) updateDoc.status = r.categoryStatus;
            if (typeof r.categoryFeatured === 'boolean') updateDoc.featured = r.categoryFeatured;
            if (typeof r.categoryPosition === 'number' && Number.isFinite(r.categoryPosition)) updateDoc.position = r.categoryPosition;

            await db.collection('categories').updateOne({ _id: categoryId }, { $set: updateDoc });
          } else {
            skippedCategories += 1;
          }
        } else {
          const position =
            typeof r.categoryPosition === 'number' && Number.isFinite(r.categoryPosition) ? r.categoryPosition : nextCategoryPosition++;

          const newCategory: any = {
            name: categoryName,
            slug: categorySlug,
            status: isActiveInactive(r.categoryStatus) ? r.categoryStatus : 'active',
            featured: typeof r.categoryFeatured === 'boolean' ? r.categoryFeatured : false,
            position,
            parentId: null,
            focusKeywords: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const insertRes = await db.collection('categories').insertOne(newCategory);
          categoryId = insertRes.insertedId;
          categoryBySlug.set(categorySlug, { _id: categoryId, slug: categorySlug });
          createdCategories += 1;
        }
      }

      // Subcategory (optional)
      const subcategoryName = String(r.subcategoryName ?? '').trim();
      if (!subcategoryName) continue;
      if (!categoryId) {
        errors.push({ rowNumber, message: 'Category could not be created/resolved for subcategory row' });
        continue;
      }

      const subSlug = slugify(String(r.subcategorySlug ?? '').trim() || subcategoryName);
      if (!subSlug) {
        errors.push({ rowNumber, message: 'Unable to determine subcategory slug' });
        continue;
      }

      const existingSub = await db.collection('subcategories').findOne(
        { slug: subSlug, categoryId },
        { projection: { _id: 1 } }
      );

      if (existingSub?._id) {
        if (updateExisting) {
          const updateDoc: any = {
            name: subcategoryName,
            updatedAt: new Date(),
          };
          if (isActiveInactive(r.subcategoryStatus)) updateDoc.status = r.subcategoryStatus;
          if (typeof r.subcategoryPosition === 'number' && Number.isFinite(r.subcategoryPosition)) updateDoc.position = r.subcategoryPosition;

          await db.collection('subcategories').updateOne({ _id: existingSub._id }, { $set: updateDoc });
        } else {
          skippedSubcategories += 1;
        }
        continue;
      }

      const position =
        typeof r.subcategoryPosition === 'number' && Number.isFinite(r.subcategoryPosition)
          ? r.subcategoryPosition
          : nextSubcategoryPosition++;

      const newSub: any = {
        name: subcategoryName,
        slug: subSlug,
        status: isActiveInactive(r.subcategoryStatus) ? r.subcategoryStatus : 'active',
        position,
        categoryId,
        focusKeywords: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.collection('subcategories').insertOne(newSub);
      createdSubcategories += 1;
    }

    return NextResponse.json({
      createdCategories,
      skippedCategories,
      createdSubcategories,
      skippedSubcategories,
      errors,
    });
  } catch (error) {
    console.error('[v0] Bulk import failed:', error);
    return NextResponse.json({ error: 'Bulk import failed' }, { status: 500 });
  }
}

