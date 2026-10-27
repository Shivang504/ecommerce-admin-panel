import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getUserFromRequest, requireAdminAuth } from '@/lib/auth';
import { DEFAULT_HOME_CONTENT, mergeHomeContent } from '@/lib/home-content';

const SECTION_KEYS = Object.keys(DEFAULT_HOME_CONTENT);
const LINK_KEY = /(href|url|image)$/i;

function sanitize(value: unknown, key = ''): unknown {
  if (Array.isArray(value)) return value.slice(0, 20).map(item => sanitize(item, key));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([childKey, child]) => [childKey, sanitize(child, childKey)]));
  }
  if (typeof value !== 'string') return value;
  const text = value.slice(0, 2000);
  if (LINK_KEY.test(key) && /^\s*(javascript|vbscript|data:text)/i.test(text)) return '#';
  return text;
}

export async function GET(request: NextRequest) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) return unauthorized;
  try {
    const { db } = await connectToDatabase();
    const doc = await db.collection('home_content').findOne({ key: 'home' });
    return NextResponse.json({ content: mergeHomeContent(doc?.content), updatedAt: doc?.updatedAt || null });
  } catch (error: any) {
    console.error('[HomePage CMS] Load failed:', error);
    return NextResponse.json({ error: 'Failed to load home page content' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json();
    const input = body?.content;
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }
    const picked = Object.fromEntries(SECTION_KEYS.filter(key => key in input).map(key => [key, sanitize(input[key], key)]));
    const content = mergeHomeContent(picked as any);
    const user = getUserFromRequest(request);
    const updatedAt = new Date();
    const { db } = await connectToDatabase();
    await db.collection('home_content').updateOne(
      { key: 'home' },
      { $set: { content, updatedAt, updatedBy: user?.email || null }, $setOnInsert: { key: 'home', createdAt: updatedAt } },
      { upsert: true },
    );
    return NextResponse.json({ success: true, content, updatedAt });
  } catch (error: any) {
    console.error('[HomePage CMS] Save failed:', error);
    return NextResponse.json({ error: 'Failed to save home page content' }, { status: 500 });
  }
}
