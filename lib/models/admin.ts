import { connectToDatabase } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { ObjectId } from 'mongodb';

export interface AdminUser {
  _id?: string;
  email: string;
  password: string;
  name: string;
  role: 'superadmin' | 'admin' | 'vendor';
  phone?: string;
  status?: 'active' | 'inactive';
  permissions?: string[];
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  lastLoginAt?: Date;
}

export async function getAdminByEmail(email: string) {
  try {
    const { db } = await connectToDatabase();
    const admin = await db.collection('admins').findOne({ email });
    console.log('[v0] Admin lookup for', email, ':', admin ? 'found' : 'not found');
    return admin as AdminUser | null;
  } catch (error) {
    console.error('[v0] Error fetching admin:', error);
    throw error;
  }
}

export async function createDefaultAdmin() {
  try {
    const { db } = await connectToDatabase();
    const admin = await getAdminByEmail('admin@tryvvo.com');

    if (admin) {
      console.log('[v0] Default admin already exists');
      return admin;
    }

    console.log('[v0] Creating default admin user');
    const hashedPassword = await bcrypt.hash('admin@123', 10);
    const result = await db.collection('admins').insertOne({
      email: 'admin@tryvvo.com',
      password: hashedPassword,
      name: 'Super Admin',
      role: 'superadmin',
      createdAt: new Date(),
    });

    console.log('[v0] Default admin created with ID:', result.insertedId);
    return { _id: result.insertedId, email: 'admin@tryvvo.com', name: 'Super Admin' };
  } catch (error) {
    console.error('[v0] Error creating default admin:', error);
    throw error;
  }
}

export function generateAdminResetPasswordToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function setAdminResetPasswordToken(adminId: string, token: string) {
  const { db } = await connectToDatabase();
  const expiryDate = new Date();
  expiryDate.setHours(expiryDate.getHours() + 1);

  await db.collection('admins').updateOne(
    { _id: new ObjectId(adminId) },
    {
      $set: {
        resetPasswordToken: token,
        resetPasswordTokenExpiry: expiryDate,
        updatedAt: new Date(),
      },
    }
  );
}

export async function verifyAdminResetPasswordToken(token: string): Promise<{
  success: boolean;
  adminId?: string;
  error?: string;
  expired?: boolean;
}> {
  const { db } = await connectToDatabase();
  const admin = await db.collection('admins').findOne({ resetPasswordToken: token });

  if (!admin) {
    return { success: false, error: 'Invalid reset link. Request a new one.' };
  }

  if (admin.resetPasswordTokenExpiry && admin.resetPasswordTokenExpiry < new Date()) {
    return { success: false, error: 'This reset link has expired. Request a new one.', expired: true };
  }

  return { success: true, adminId: admin._id.toString() };
}

export async function resetAdminPassword(adminId: string, newPassword: string) {
  const { db } = await connectToDatabase();
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await db.collection('admins').updateOne(
    { _id: new ObjectId(adminId) },
    {
      $set: { password: hashedPassword, updatedAt: new Date() },
      $unset: { resetPasswordToken: '', resetPasswordTokenExpiry: '' },
    }
  );
}

export async function verifyPassword(password: string, hashedPassword: string) {
  try {
    const match = await bcrypt.compare(password, hashedPassword);
    console.log('[v0] Password verification result:', match);
    return match;
  } catch (error) {
    console.error('[v0] Error verifying password:', error);
    throw error;
  }
}
