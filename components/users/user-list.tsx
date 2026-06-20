'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Download, Eye, Plus, Search, Trash2, Pencil } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import Dropdown from '@/components/customDropdown/customDropdown';
import { formatIndianDate } from '@/app/utils/helper';
import { DataTableBody } from '@/components/ui/data-table-body';
import { Spinner } from '@/components/ui/spinner';
import { PermissionGuard } from '@/components/auth/permission-guard';
import { usePermissions } from '@/hooks/use-permissions';

interface Admin {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  status?: 'active' | 'inactive';
  createdAt?: string;
  role?: string;
}

export function UserList() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const { isSuperAdmin } = usePermissions();

  useEffect(() => {
    fetchAdmins();
  }, [searchTerm, statusFilter, roleFilter, page, limit]);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (roleFilter !== 'all') params.append('role', roleFilter);
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const response = await fetch(`/api/admin/users?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch users');
      }

      setAdmins(Array.isArray(data.users) ? data.users : []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('[v0] Failed to fetch admins:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch users',
        variant: 'destructive',
      });
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (adminId: string, currentStatus: string) => {
    try {
      setTogglingStatusId(adminId);
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

      const response = await fetch(`/api/admin/users/${adminId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setAdmins(admins.map(a => (a._id === adminId ? { ...a, status: newStatus as 'active' | 'inactive' } : a)));
        toast({
          title: 'Success',
          description: `User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
          variant: 'success',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update user status',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[v0] Status toggle error:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while updating status',
        variant: 'destructive',
      });
    } finally {
      setTogglingStatusId(null);
    }
  };

  const handleDelete = async (adminId: string, adminName: string) => {
    try {
      setDeletingId(adminId);
      const response = await fetch(`/api/admin/users/${adminId}`, { method: 'DELETE' });
      if (response.ok) {
        toast({
          title: 'Success',
          description: `User "${adminName}" deleted successfully`,
          variant: 'success',
        });
        fetchAdmins();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to delete user',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[v0] Delete error:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while deleting the user',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = () => {
    const csv = [
      ['Name', 'Email', 'Mobile', 'Role', 'Status'],
      ...admins.map(a => [a.name, a.email, a.phone || '', a.role || '', a.status || 'active']),
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (page <= 3) {
      for (let i = 1; i <= 4; i++) pages.push(i);
      pages.push('...');
      pages.push(totalPages);
    } else if (page >= totalPages - 2) {
      pages.push(1);
      pages.push('...');
      for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push('...');
      for (let i = page - 1; i <= page + 1; i++) pages.push(i);
      pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>Admin Users</h1>
          <p className='text-sm text-slate-500 mt-1'>Manage Super Admin and Admin accounts with module permissions.</p>
        </div>
        <div className='flex flex-row gap-2'>
          <Button variant='outline' onClick={handleExport} className='gap-2'>
            <Download className='h-4 w-4' />
            Export
          </Button>
          <PermissionGuard permission='users.create'>
            <Button onClick={() => router.push('/admin/users/add')} className='gap-2 bg-[#22c55e]'>
              <Plus className='h-5 w-5' />
              Add User
            </Button>
          </PermissionGuard>
        </div>
      </div>

      <Card className='p-6 shadow-md'>
        <div className='space-y-4'>
          <div className='flex flex-row flex-wrap gap-3'>
            <div className='flex relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder='Search by name, email, or mobile...'
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className='pl-10 max-w-[320px]'
              />
            </div>

            <Dropdown
              options={[
                { label: 'All Status', value: 'all' },
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
              ]}
              value={statusFilter}
              onChange={option => {
                setStatusFilter(option.value);
                setPage(1);
              }}
              withSearch={false}
              placeholder='Status'
            />

            {isSuperAdmin && (
              <Dropdown
                options={[
                  { label: 'All Roles', value: 'all' },
                  { label: 'Super Admin', value: 'superadmin' },
                  { label: 'Admin', value: 'admin' },
                ]}
                value={roleFilter}
                onChange={option => {
                  setRoleFilter(option.value);
                  setPage(1);
                }}
                withSearch={false}
                placeholder='Role'
              />
            )}
          </div>

          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow className='bg-gray-50 border-b border-gray-200 hover:bg-gray-50'>
                  <TableHead className='font-semibold text-gray-700 py-4'>Name</TableHead>
                  <TableHead className='font-semibold text-gray-700 py-4'>Email</TableHead>
                  <TableHead className='font-semibold text-gray-700 py-4'>Mobile</TableHead>
                  <TableHead className='font-semibold text-gray-700 py-4'>Role</TableHead>
                  <TableHead className='font-semibold text-gray-700 py-4'>Created At</TableHead>
                  <TableHead className='font-semibold text-gray-700 py-4 text-center'>Status</TableHead>
                  <TableHead className='font-semibold text-gray-700 py-4 text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <DataTableBody loading={loading} data={admins} columns={7} loadingText='Loading users...' emptyText='No users found'>
                {admins.map(admin => (
                  <TableRow key={admin._id} className='border-b border-gray-200 hover:bg-green-50 transition-colors duration-150'>
                    <TableCell className='font-semibold text-gray-900 py-4'>{admin.name}</TableCell>
                    <TableCell className='text-gray-600 py-4'>{admin.email}</TableCell>
                    <TableCell className='text-gray-600 py-4'>{admin.phone || '-'}</TableCell>
                    <TableCell className='text-gray-600 py-4 capitalize'>
                      <Badge variant='outline'>{admin.role === 'superadmin' ? 'Super Admin' : admin.role || 'Admin'}</Badge>
                    </TableCell>
                    <TableCell className='text-gray-600 py-4'>{admin.createdAt ? formatIndianDate(admin.createdAt) : '-'}</TableCell>
                    <TableCell className='py-4 text-center'>
                      <PermissionGuard permission='users.edit' fallback={<StatusBadge status={admin.status} />}>
                        {togglingStatusId === admin._id ? (
                          <Spinner className='h-4 w-4 mx-auto' />
                        ) : (
                          <Switch
                            size='md'
                            checked={admin.status === 'active'}
                            onCheckedChange={() => handleStatusToggle(admin._id, admin.status || 'active')}
                            disabled={togglingStatusId === admin._id}
                          />
                        )}
                      </PermissionGuard>
                    </TableCell>
                    <TableCell className='py-4'>
                      <div className='flex justify-end gap-4'>
                        <PermissionGuard permission='users.view'>
                          <button
                            onClick={() => router.push(`/admin/users/${admin._id}`)}
                            disabled={togglingStatusId === admin._id || deletingId === admin._id}
                            className='text-blue-600 hover:text-blue-800 disabled:opacity-50'>
                            <Eye className='h-5 w-5' />
                          </button>
                        </PermissionGuard>
                        <PermissionGuard permission='users.edit'>
                          <button
                            onClick={() => router.push(`/admin/users/${admin._id}/edit`)}
                            disabled={togglingStatusId === admin._id || deletingId === admin._id}
                            className='text-gray-600 hover:text-gray-900 disabled:opacity-50'>
                            <Pencil className='h-5 w-5' />
                          </button>
                        </PermissionGuard>
                        <PermissionGuard permission='users.delete'>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                disabled={togglingStatusId === admin._id || deletingId === admin._id}
                                className='text-red-500 hover:text-red-700 disabled:opacity-50'>
                                {deletingId === admin._id ? <Spinner className='h-5 w-5' /> : <Trash2 className='h-5 w-5' />}
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{admin.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={!!deletingId}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(admin._id, admin.name)}
                                  className='bg-destructive'
                                  disabled={!!deletingId}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </PermissionGuard>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </DataTableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-4 border-t'>
              <p className='text-sm text-gray-600'>
                Showing <span className='font-medium'>{total === 0 ? 0 : (page - 1) * limit + 1}</span> to{' '}
                <span className='font-medium'>{Math.min(page * limit, total)}</span> of{' '}
                <span className='font-medium'>{total}</span> users
              </p>
              <div className='flex items-center gap-2'>
                <Button variant='outline' size='sm' disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  Previous
                </Button>
                {getPageNumbers().map((pageNum, index) => (
                  <Button
                    key={`${pageNum}-${index}`}
                    variant={pageNum === page ? 'default' : 'outline'}
                    size='sm'
                    disabled={typeof pageNum === 'string'}
                    onClick={() => typeof pageNum === 'number' && setPage(pageNum)}>
                    {pageNum}
                  </Button>
                ))}
                <Button variant='outline' size='sm' disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status?: 'active' | 'inactive' }) {
  return (
    <Badge className={status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}>
      {status === 'active' ? 'Active' : 'Inactive'}
    </Badge>
  );
}
