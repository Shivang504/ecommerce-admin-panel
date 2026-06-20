'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Pencil } from 'lucide-react';
import { formatIndianDate } from '@/app/utils/helper';
import { Spinner } from '@/components/ui/spinner';
import { formatPermissionLabel } from '@/lib/permissions';
import { PermissionGuard } from '@/components/auth/permission-guard';

interface AdminDetails {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  status?: 'active' | 'inactive';
  role?: string;
  permissions?: string[];
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

interface UserViewPageProps {
  adminId: string;
}

export function UserViewPage({ adminId }: UserViewPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState<AdminDetails | null>(null);

  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        const response = await fetch(`/api/admin/users/${adminId}`);
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error?.error || 'Failed to fetch user');
        }
        const data = await response.json();
        setAdmin(data.user);
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to load user',
          variant: 'destructive',
        });
        router.push('/admin/users');
      } finally {
        setLoading(false);
      }
    };

    fetchAdmin();
  }, [adminId, router, toast]);

  const DetailItem = ({ label, value }: { label: string; value?: ReactNode }) => (
    <div className='rounded-lg border border-slate-200 p-4'>
      <p className='text-xs uppercase tracking-wide text-slate-500'>{label}</p>
      <p className='mt-1 text-sm font-medium text-slate-900'>{value ?? '-'}</p>
    </div>
  );

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <Spinner className='h-8 w-8' />
      </div>
    );
  }

  if (!admin) return null;

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-center gap-4'>
          <button
            type='button'
            onClick={() => router.push('/admin/users')}
            className='inline-flex items-center justify-center bg-white p-2 text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200'>
            <ArrowLeft className='h-5 w-5' />
          </button>
          <div>
            <h1 className='text-3xl font-bold text-slate-900'>View Admin User</h1>
            <p className='text-sm text-slate-500'>{admin.email}</p>
          </div>
        </div>
        <PermissionGuard permission='users.edit'>
          <Button onClick={() => router.push(`/admin/users/${adminId}/edit`)} className='gap-2 bg-[#22c55e]'>
            <Pencil className='h-4 w-4' />
            Edit User
          </Button>
        </PermissionGuard>
      </div>

      <Card className='p-6 shadow-md space-y-6'>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
          <DetailItem label='Name' value={admin.name} />
          <DetailItem label='Email' value={admin.email} />
          <DetailItem label='Mobile' value={admin.phone || '-'} />
          <DetailItem
            label='Role'
            value={
              <Badge variant='outline' className='capitalize'>
                {admin.role === 'superadmin' ? 'Super Admin' : admin.role || 'Admin'}
              </Badge>
            }
          />
          <DetailItem
            label='Status'
            value={
              <Badge className={admin.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}>
                {admin.status === 'active' ? 'Active' : 'Inactive'}
              </Badge>
            }
          />
          <DetailItem label='Created At' value={admin.createdAt ? formatIndianDate(admin.createdAt) : '-'} />
          <DetailItem label='Updated At' value={admin.updatedAt ? formatIndianDate(admin.updatedAt) : '-'} />
          <DetailItem label='Last Login' value={admin.lastLoginAt ? formatIndianDate(admin.lastLoginAt) : '-'} />
        </div>

        {admin.role === 'admin' && (
          <div className='space-y-3'>
            <h2 className='text-lg font-semibold text-slate-900'>Module Permissions</h2>
            {Array.isArray(admin.permissions) && admin.permissions.length > 0 ? (
              <div className='flex flex-wrap gap-2'>
                {admin.permissions.map(permission => (
                  <Badge key={permission} variant='secondary' className='text-xs'>
                    {formatPermissionLabel(permission)}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className='text-sm text-slate-500'>No module permissions assigned.</p>
            )}
          </div>
        )}

        {admin.role === 'superadmin' && (
          <p className='text-sm text-slate-600'>Super Admin has full access to all modules.</p>
        )}
      </Card>
    </div>
  );
}
