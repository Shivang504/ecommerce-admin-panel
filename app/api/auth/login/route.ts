import { NextRequest, NextResponse } from 'next/server';
import { getAdminByEmail, verifyPassword, createDefaultAdmin } from '@/lib/models/admin';
import { getVendorByEmail } from '@/lib/models/vendor';
import { generateToken } from '@/lib/auth';

/** Admin Panel: staff (admin / superadmin) only. Vendors must use the Vendor Panel app. */
export async function POST(request: NextRequest) {
  try {
    try {
      await createDefaultAdmin();
    } catch (adminError) {
      console.error('[v0] Failed to create default admin:', adminError);
      return NextResponse.json(
        { error: 'Database initialization failed', details: String(adminError) },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const admin = await getAdminByEmail(email);
    if (admin) {
      if (admin.status === 'inactive') {
        return NextResponse.json(
          { error: 'Your account is inactive. Please contact administrator.' },
          { status: 401 }
        );
      }

      const passwordMatch = await verifyPassword(password, admin.password);
      if (!passwordMatch) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      const token = generateToken({
        _id: admin._id?.toString(),
        email: admin.email,
        role: admin.role,
      });

      const response = NextResponse.json({
        success: true,
        token,
        admin: { email: admin.email, name: admin.name, role: admin.role },
      });

      response.cookies.set('adminToken', token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 86400 * 7,
        path: '/',
      });

      return response;
    }

    const vendor = await getVendorByEmail(email);
    if (vendor) {
      return NextResponse.json(
        {
          error:
            'This email is registered as a vendor. Please sign in through the Vendor Panel application.',
        },
        { status: 403 }
      );
    }

    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  } catch (error) {
    console.error('[v0] Login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
  }
}
