import { connectToDatabase } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const seo = await db.collection('seo_settings').findOne({});

    if (!seo) {
      return NextResponse.json({
        siteName: '',
        siteTitle: '',
        siteDescription: '',
        siteKeywords: '',
        ogImage: '',
        favicon: '',
        headerLogo: '',
        footerLogo: '',
        googleAnalyticsId: '',
        googleTagManagerId: '',
        facebookPixelId: '',
        twitterHandle: '',
        facebookPage: '',
        instagramHandle: '',
      });
    }

    return NextResponse.json({
      ...seo,
      _id: seo._id.toString(),
    });
  } catch (error) {
    console.error('[v0] Failed to fetch SEO settings:', error);
    return NextResponse.json({ error: 'Failed to fetch SEO settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const body = await request.json();

    const seoData = {
      siteName: body.siteName || '',
      siteTitle: body.siteTitle || '',
      siteDescription: body.siteDescription || '',
      siteKeywords: body.siteKeywords || '',
      ogImage: body.ogImage || '',
      favicon: body.favicon || '',
      headerLogo: body.headerLogo || '',
      footerLogo: body.footerLogo || '',
      googleAnalyticsId: body.googleAnalyticsId || '',
      googleTagManagerId: body.googleTagManagerId || '',
      facebookPixelId: body.facebookPixelId || '',
      twitterHandle: body.twitterHandle || '',
      facebookPage: body.facebookPage || '',
      instagramHandle: body.instagramHandle || '',
      updatedAt: new Date(),
    };

    const existing = await db.collection('seo_settings').findOne({});

    if (existing) {
      await db.collection('seo_settings').updateOne({}, { $set: seoData });
      const updated = await db.collection('seo_settings').findOne({});
      return NextResponse.json({
        ...updated,
        _id: updated?._id.toString(),
      });
    } else {
      const result = await db.collection('seo_settings').insertOne({
        ...seoData,
        createdAt: new Date(),
      });
      const newSeo = await db.collection('seo_settings').findOne({ _id: result.insertedId });
      return NextResponse.json(
        {
          ...newSeo,
          _id: newSeo?._id.toString(),
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error('[v0] Failed to save SEO settings:', error);
    return NextResponse.json({ error: 'Failed to save SEO settings' }, { status: 500 });
  }
}

