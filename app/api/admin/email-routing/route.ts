import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth, getUserFromRequest } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { sendEmail } from '@/lib/email';
import {
  DEFAULT_ADMIN_EMAILS,
  EMAIL_CATEGORIES,
  cleanEmailList,
  clearEmailRouteCache,
  getAdminEmails,
  getAllEmailRoutes,
  type EmailCategory,
} from '@/lib/email-routing';

const CATEGORY_KEYS = Object.keys(EMAIL_CATEGORIES) as EmailCategory[];

async function snapshot() {
  const [routes, adminEmails] = await Promise.all([getAllEmailRoutes(), getAdminEmails()]);
  return {
    categories: CATEGORY_KEYS.map(key => ({ key, label: EMAIL_CATEGORIES[key].label, description: EMAIL_CATEGORIES[key].description, defaults: EMAIL_CATEGORIES[key].defaults, route: routes[key] })),
    adminEmails,
    defaultAdminEmails: DEFAULT_ADMIN_EMAILS,
    provider: 'zoho-api',
  };
}

export async function GET(request: NextRequest) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) return unauthorized;
  clearEmailRouteCache();
  return NextResponse.json(await snapshot());
}

export async function PUT(request: NextRequest) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json();
    const routes: Record<string, { fromEmail: string; fromName: string; cc: string[]; replyTo?: string }> = {};
    for (const key of CATEGORY_KEYS) {
      const input = body?.routes?.[key];
      if (!input) continue;
      const fromEmail = cleanEmailList(input.fromEmail)[0];
      if (!fromEmail) return NextResponse.json({ error: `${EMAIL_CATEGORIES[key].label}: enter a valid sender email` }, { status: 400 });
      routes[key] = {
        fromEmail,
        fromName: String(input.fromName || EMAIL_CATEGORIES[key].defaults.fromName).trim().slice(0, 80),
        cc: cleanEmailList(input.cc).slice(0, 10),
        ...(cleanEmailList(input.replyTo)[0] ? { replyTo: cleanEmailList(input.replyTo)[0] } : {}),
      };
    }
    const adminEmails = cleanEmailList(body?.adminEmails).slice(0, 10);
    const { db } = await connectToDatabase();
    await db.collection('email_settings').updateOne(
      { key: 'routes' },
      {
        $set: { routes, adminEmails: adminEmails.length ? adminEmails : DEFAULT_ADMIN_EMAILS, updatedAt: new Date(), updatedBy: getUserFromRequest(request)?.email || null },
        $setOnInsert: { key: 'routes', createdAt: new Date() },
      },
      { upsert: true },
    );
    clearEmailRouteCache();
    return NextResponse.json({ success: true, ...(await snapshot()) });
  } catch (error) {
    console.error('[EmailRouting] Save failed:', error);
    return NextResponse.json({ error: 'Failed to save email routing' }, { status: 500 });
  }
}

/** Sends a test email for one category to the given address. */
export async function POST(request: NextRequest) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json();
    const category = body?.category as EmailCategory;
    const to = cleanEmailList(body?.to)[0];
    if (!CATEGORY_KEYS.includes(category)) return NextResponse.json({ error: 'Unknown email type' }, { status: 400 });
    if (!to) return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    clearEmailRouteCache();
    const label = EMAIL_CATEGORIES[category].label;
    await sendEmail({
      category,
      to,
      subject: `[Test] ${label} - Tryvvo email routing`,
      html: `<p>This is a test email for <b>${label}</b>.</p><p>If you received it, this sender identity is working.</p>`,
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Test email failed' }, { status: 500 });
  }
}
