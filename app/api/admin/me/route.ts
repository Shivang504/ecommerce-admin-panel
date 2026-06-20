import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getUserFromRequest, isAdmin, isSuperAdmin } from '@/lib/auth';
import { ALL_PERMISSIONS } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request);

    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!isAdmin(currentUser)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { db } = await connectToDatabase();
    const admin = await db.collection('admins').findOne({ _id: new ObjectId(currentUser.id) });

    if (!admin) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const permissions = isSuperAdmin(currentUser)
      ? ALL_PERMISSIONS
      : Array.isArray(admin.permissions)
        ? admin.permissions
        : [];

    return NextResponse.json({
      user: {
        _id: admin._id.toString(),
        name: admin.name,
        email: admin.email,
        phone: admin.phone || '',
        role: admin.role,
        status: admin.status || 'active',
        permissions,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt,
        lastLoginAt: admin.lastLoginAt,
      },
    });
  } catch (error) {
    console.error('[v0] Error fetching current admin:', error);
    return NextResponse.json({ error: 'Failed to fetch current user' }, { status: 500 });
  }
}
