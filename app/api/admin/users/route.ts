import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getUserFromRequest, isAdmin, isSuperAdmin, isVendor, userHasPermission } from '@/lib/auth';
import bcrypt from 'bcryptjs';

function serializeAdmin(admin: any) {
  const { password, ...rest } = admin;
  return {
    ...rest,
    _id: admin._id?.toString(),
  };
}

async function getActorPermissions(db: any, userId: string, role: string) {
  if (role === 'superadmin') return null;
  const admin = await db.collection('admins').findOne({ _id: new ObjectId(userId) });
  return Array.isArray(admin?.permissions) ? admin.permissions : [];
}

function buildAdminUserQuery(currentUser: { id: string; role: string }, filters: {
  search?: string | null;
  status?: string | null;
  role?: string | null;
}) {
  const andConditions: any[] = [];

  if (currentUser.role === 'superadmin') {
    andConditions.push({ role: { $in: ['admin', 'superadmin'] } });
  } else if (currentUser.role === 'vendor') {
    andConditions.push({
      $or: [{ createdBy: currentUser.id }, { _id: new ObjectId(currentUser.id) }],
    });
  } else {
    andConditions.push({
      $or: [{ createdBy: currentUser.id }, { _id: new ObjectId(currentUser.id) }],
    });
    andConditions.push({ role: 'admin' });
  }

  if (filters.status && filters.status !== 'all') {
    andConditions.push({ status: filters.status });
  }

  if (filters.role && filters.role !== 'all' && currentUser.role === 'superadmin') {
    andConditions.push({ role: filters.role });
  }

  if (filters.search) {
    andConditions.push({
      $or: [
        { name: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
        { phone: { $regex: filters.search, $options: 'i' } },
      ],
    });
  }

  return andConditions.length ? { $and: andConditions } : {};
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request);

    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!isAdmin(currentUser) && !isVendor(currentUser)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { db } = await connectToDatabase();
    const actorPermissions = await getActorPermissions(db, currentUser.id, currentUser.role);

    if (
      !isSuperAdmin(currentUser) &&
      !isVendor(currentUser) &&
      !userHasPermission(currentUser, actorPermissions, 'users.view')
    ) {
      return NextResponse.json({ error: 'Access denied. Insufficient permissions.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const role = searchParams.get('role');
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10), 1), 100);
    const skip = (page - 1) * limit;

    const query = buildAdminUserQuery(currentUser, { search, status, role });

    const [admins, total] = await Promise.all([
      db.collection('admins').find(query).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).toArray(),
      db.collection('admins').countDocuments(query),
    ]);

    return NextResponse.json({
      users: admins.map(serializeAdmin),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    console.error('[v0] Error fetching admins:', error);
    return NextResponse.json({ error: 'Failed to fetch admins' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request);

    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!isSuperAdmin(currentUser) && !isAdmin(currentUser) && !isVendor(currentUser)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { db } = await connectToDatabase();
    const actorPermissions = await getActorPermissions(db, currentUser.id, currentUser.role);

    if (
      !isSuperAdmin(currentUser) &&
      !isVendor(currentUser) &&
      !userHasPermission(currentUser, actorPermissions, 'users.create')
    ) {
      return NextResponse.json({ error: 'Access denied. Insufficient permissions.' }, { status: 403 });
    }

    const body = await request.json();

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!body.email?.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    if (!body.phone?.trim()) {
      return NextResponse.json({ error: 'Mobile number is required' }, { status: 400 });
    }
    if (!body.password?.trim()) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }
    if (!body.role) {
      return NextResponse.json({ error: 'Role is required' }, { status: 400 });
    }

    if (isVendor(currentUser) && body.role === 'superadmin') {
      return NextResponse.json({ error: 'Access denied. You cannot create superadmin users.' }, { status: 403 });
    }

    if (!isSuperAdmin(currentUser) && body.role === 'superadmin') {
      return NextResponse.json({ error: 'Access denied. You cannot create superadmin users.' }, { status: 403 });
    }

    const existingAdmin = await db.collection('admins').findOne({ email: body.email.trim().toLowerCase() });
    if (existingAdmin) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    let userRole = body.role || 'admin';
    if (isVendor(currentUser) && userRole === 'superadmin') {
      userRole = 'admin';
    }

    const permissions =
      userRole === 'admin' && Array.isArray(body.permissions) ? body.permissions : [];

    const hashedPassword = await bcrypt.hash(body.password, 10);

    const result = await db.collection('admins').insertOne({
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      password: hashedPassword,
      phone: body.phone.trim(),
      status: body.status || 'active',
      role: userRole,
      permissions,
      createdBy: currentUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      serializeAdmin({
        _id: result.insertedId,
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
        phone: body.phone.trim(),
        status: body.status || 'active',
        role: userRole,
        permissions,
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error('[v0] Error creating admin:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
