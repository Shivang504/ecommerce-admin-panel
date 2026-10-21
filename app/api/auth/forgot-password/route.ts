import { NextRequest, NextResponse } from 'next/server';
import { generatePasswordResetEmailHTML, sendEmail } from '@/lib/email';
import {
  generateAdminResetPasswordToken,
  getAdminByEmail,
  setAdminResetPasswordToken,
} from '@/lib/models/admin';
import { getVendorByEmail } from '@/lib/models/vendor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = (body?.email ?? body?.identifier ?? '').toString().trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }

    const admin = await getAdminByEmail(email);
    if (!admin?._id) {
      const vendor = await getVendorByEmail(email);
      if (vendor) {
        return NextResponse.json(
          { error: 'This email is a vendor account. Reset the password from the Vendor Panel.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: 'No admin account found for this email' }, { status: 404 });
    }

    if (admin.status === 'inactive') {
      return NextResponse.json({ error: 'This account is inactive. Contact an administrator.' }, { status: 403 });
    }

    const token = generateAdminResetPasswordToken();
    await setAdminResetPasswordToken(String(admin._id), token);

    const origin = request.nextUrl.origin.replace(/\/$/, '');
    const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || origin).replace(/\/$/, '');
    const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

    const sent = await sendEmail({
      to: admin.email,
      subject: 'Reset your admin password',
      html: generatePasswordResetEmailHTML(admin.name || 'Admin', resetLink),
      text: `Reset your admin password: ${resetLink}`,
    });

    if (!sent) {
      return NextResponse.json({ error: 'Could not send the reset email. Try again.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Password reset link sent' });
  } catch (error: any) {
    console.error('[Admin Forgot Password]', error);
    return NextResponse.json({ error: error?.message || 'Failed to send reset link' }, { status: 500 });
  }
}
