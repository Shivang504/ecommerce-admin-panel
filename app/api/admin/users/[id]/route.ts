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

function canManageUser(
  currentUser: { id: string; role: string },
  targetUser: any
): boolean {
  if (currentUser.role === 'superadmin') {
    if (targetUser.role === 'superadmin' && targetUser._id.toString() !== currentUser.id) {
      return false;
    }
    return true;
  }

  if (targetUser.createdBy === currentUser.id) return true;
  if (targetUser._id.toString() === currentUser.id) return true;
  return false;
}

async function getActorPermissions(db: any, userId: string, role: string) {
  if (role === 'superadmin') return null;
  const admin = await db.collection('admins').findOne({ _id: new ObjectId(userId) });
  return Array.isArray(admin?.permissions) ? admin.permissions : [];
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = getUserFromRequest(request);

    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!isAdmin(currentUser) && !isVendor(currentUser)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const admin = await db.collection('admins').findOne({ _id: new ObjectId(id) });

    if (!admin) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const actorPermissions = await getActorPermissions(db, currentUser.id, currentUser.role);
    const isSelf = admin._id.toString() === currentUser.id;

    if (
      !canManageUser(currentUser, admin) &&
      !(isSelf && userHasPermission(currentUser, actorPermissions, 'users.view'))
    ) {
      if (
        !isSuperAdmin(currentUser) &&
        !isVendor(currentUser) &&
        !userHasPermission(currentUser, actorPermissions, 'users.view')
      ) {
        return NextResponse.json({ error: 'Access denied. Insufficient permissions.' }, { status: 403 });
      }
      return NextResponse.json({ error: 'Access denied. You can only view your own employees.' }, { status: 403 });
    }

    return NextResponse.json({ user: serializeAdmin(admin) });
  } catch (error) {
    console.error('[v0] Error fetching admin:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = getUserFromRequest(request);

    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!isAdmin(currentUser) && !isVendor(currentUser)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await params;
    const { db } = await connectToDatabase();
    const body = await request.json();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const existingUser = await db.collection('admins').findOne({ _id: new ObjectId(id) });
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const actorPermissions = await getActorPermissions(db, currentUser.id, currentUser.role);
    const isStatusOnlyUpdate = Object.keys(body).length === 1 && 'status' in body;
    const requiredPermission = isStatusOnlyUpdate ? 'users.edit' : 'users.edit';

    if (
      !canManageUser(currentUser, existingUser) &&
      !isSuperAdmin(currentUser) &&
      !isVendor(currentUser) &&
      !userHasPermission(currentUser, actorPermissions, requiredPermission)
    ) {
      return NextResponse.json({ error: 'Access denied. Insufficient permissions.' }, { status: 403 });
    }

    if (!canManageUser(currentUser, existingUser) && !isSuperAdmin(currentUser)) {
      return NextResponse.json({ error: 'Access denied. You can only update your own employees.' }, { status: 403 });
    }

    if (!isSuperAdmin(currentUser) && body.role === 'superadmin') {
      return NextResponse.json({ error: 'Access denied. You cannot set role to superadmin.' }, { status: 403 });
    }

    if (existingUser.role === 'superadmin' && body.role && body.role !== 'superadmin' && existingUser._id.toString() !== currentUser.id) {
      return NextResponse.json({ error: 'Access denied. Cannot change superadmin role.' }, { status: 403 });
    }

    const isStatusOnlyUpdateBody = Object.keys(body).length === 1 && 'status' in body;

    if (isStatusOnlyUpdateBody) {
      await db.collection('admins').updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: body.status, updatedAt: new Date() } }
      );

      return NextResponse.json({ success: true, message: 'User updated successfully' });
    }

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!body.phone?.trim()) {
      return NextResponse.json({ error: 'Mobile number is required' }, { status: 400 });
    }

    const nextRole = body.role || existingUser.role || 'admin';
    const fullUpdateData: any = {
      name: body.name.trim(),
      phone: body.phone.trim(),
      status: body.status || 'active',
      role: nextRole,
      updatedAt: new Date(),
    };

    if (nextRole === 'admin') {
      fullUpdateData.permissions = Array.isArray(body.permissions) ? body.permissions : [];
    } else {
      fullUpdateData.permissions = [];
    }

    if (isVendor(currentUser) && fullUpdateData.role === 'superadmin') {
      fullUpdateData.role = 'admin';
    }

    if (body.password?.trim()) {
      fullUpdateData.password = await bcrypt.hash(body.password, 10);
    }

    await db.collection('admins').updateOne({ _id: new ObjectId(id) }, { $set: fullUpdateData });

    return NextResponse.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('[v0] Error updating admin:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = getUserFromRequest(request);

    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!isAdmin(currentUser)) {
      return NextResponse.json({ error: 'Access denied. Only admins can delete users.' }, { status: 403 });
    }

    const { id } = await params;
    const { db } = await connectToDatabase();

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const userToDelete = await db.collection('admins').findOne({ _id: new ObjectId(id) });
    if (!userToDelete) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const actorPermissions = await getActorPermissions(db, currentUser.id, currentUser.role);

    if (
      !canManageUser(currentUser, userToDelete) &&
      !isSuperAdmin(currentUser) &&
      !userHasPermission(currentUser, actorPermissions, 'users.delete')
    ) {
      return NextResponse.json({ error: 'Access denied. Insufficient permissions.' }, { status: 403 });
    }

    if (userToDelete._id.toString() === currentUser.id) {
      return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 });
    }

    if (!canManageUser(currentUser, userToDelete)) {
      return NextResponse.json({ error: 'Access denied. You can only delete your own employees.' }, { status: 403 });
    }

    const result = await db.collection('admins').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('[v0] Error deleting admin:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
