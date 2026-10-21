import { NextRequest, NextResponse } from 'next/server';
import { resetAdminPassword, verifyAdminResetPasswordToken } from '@/lib/models/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = (body?.token ?? '').toString().trim();
    const password = (body?.password ?? '').toString();

    if (!token) {
      return NextResponse.json({ error: 'Reset token is required' }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const check = await verifyAdminResetPasswordToken(token);
    if (!check.success || !check.adminId) {
      return NextResponse.json({ error: check.error || 'Invalid reset link' }, { status: 400 });
    }

    await resetAdminPassword(check.adminId, password);
    return NextResponse.json({ success: true, message: 'Password updated' });
  } catch (error: any) {
    console.error('[Admin Reset Password]', error);
    return NextResponse.json({ error: error?.message || 'Failed to reset password' }, { status: 500 });
  }
}
