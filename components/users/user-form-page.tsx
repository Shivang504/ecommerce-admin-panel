'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import FormField from '@/components/formField/formField';
import Dropdown from '@/components/customDropdown/customDropdown';
import { ModulePermissionsPicker } from '@/components/users/module-permissions-picker';
import { usePermissions } from '@/hooks/use-permissions';
import { ArrowLeft } from 'lucide-react';

interface AdminFormData {
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  status?: 'active' | 'inactive';
  password?: string;
  confirmPassword?: string;
  role?: 'superadmin' | 'admin' | 'vendor';
  permissions?: string[];
}

interface UserFormPageProps {
  adminId?: string;
}

const ROLE_OPTIONS = [
  { label: 'Admin', value: 'admin' },
  { label: 'Super Admin', value: 'superadmin' },
];

export function UserFormPage({ adminId }: UserFormPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { isSuperAdmin, loading: permissionsLoading } = usePermissions();

  const [formData, setFormData] = useState<AdminFormData>({
    name: '',
    email: '',
    phone: '',
    status: 'active',
    password: '',
    confirmPassword: '',
    role: 'admin',
    permissions: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!adminId);

  useEffect(() => {
    document.body.style.overflowY = 'hidden';
    return () => {
      document.body.style.overflowY = 'auto';
    };
  }, []);

  useEffect(() => {
    if (!adminId) {
      setLoading(false);
      return;
    }

    const fetchAdmin = async () => {
      try {
        const response = await fetch(`/api/admin/users/${adminId}`);
        if (response.ok) {
          const data = await response.json();
          setFormData({
            ...data.user,
            password: '',
            confirmPassword: '',
            permissions: data.user.permissions || [],
          });
        } else {
          toast({
            title: 'Error',
            description: 'Failed to fetch user',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Fetch user error:', error);
        toast({
          title: 'Error',
          description: 'Failed to load user',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAdmin();
  }, [adminId, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) newErrors.name = 'Name is required';
    if (!formData.email?.trim()) newErrors.email = 'Email is required';
    if (!formData.phone?.trim()) newErrors.phone = 'Mobile number is required';
    if (!formData.role) newErrors.role = 'Role is required';

    if (!adminId) {
      if (!formData.password?.trim()) newErrors.password = 'Password is required for new users';
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    } else if (formData.password && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields correctly',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const method = adminId ? 'PUT' : 'POST';
      const url = adminId ? `/api/admin/users/${adminId}` : '/api/admin/users';

      const { _id, confirmPassword, ...dataToSend } = formData as AdminFormData & { confirmPassword?: string };

      if (!dataToSend.password) {
        delete dataToSend.password;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: adminId ? 'User updated successfully' : 'User created successfully',
          variant: 'success',
        });
        router.push('/admin/users');
      } else {
        let message = 'Failed to save user';
        try {
          const error = await response.json();
          if (error && typeof error.error === 'string') message = error.error;
        } catch {
          // ignore
        }

        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Save user error:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while saving the user',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const roleOptions = isSuperAdmin
    ? ROLE_OPTIONS
    : ROLE_OPTIONS.filter(option => option.value !== 'superadmin');

  if (loading || permissionsLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <p className='text-muted-foreground'>Loading user...</p>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8'>
      <div className='max-w-5xl mx-auto space-y-6'>
        <div className='bg-white rounded-lg shadow-sm p-4 md:p-6'>
          <div className='flex items-center gap-4'>
            <button
              type='button'
              onClick={() => router.push('/admin/users')}
              className='inline-flex items-center justify-center cursor-pointer bg-white p-2 text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200'>
              <ArrowLeft className='h-5 w-5' />
            </button>
            <div>
              <h1 className='text-2xl md:text-3xl font-bold text-slate-900'>
                {adminId ? 'Edit Admin User' : 'Create Admin User'}
              </h1>
              <p className='text-sm text-slate-500'>Manage admin account details and module access.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className='space-y-6'>
          <Card className='bg-white border border-slate-200'>
            <div className='space-y-6 px-6 py-6'>
              <div className='space-y-4'>
                <h3 className='text-xl font-semibold text-slate-900'>Basic Information</h3>

                <FormField
                  label='Name'
                  required
                  id='name'
                  name='name'
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder='John Doe'
                  disabled={saving}
                  error={errors.name}
                />

                <FormField
                  label='Email'
                  required
                  id='email'
                  name='email'
                  type='email'
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder='john@example.com'
                  disabled={saving || !!adminId}
                  error={errors.email}
                  helperText={adminId ? 'Email cannot be changed' : undefined}
                />

                <FormField
                  label='Mobile'
                  required
                  id='phone'
                  name='phone'
                  value={formData.phone || ''}
                  onChange={handleInputChange}
                  placeholder='+91 9876543210'
                  disabled={saving}
                  error={errors.phone}
                />
              </div>

              <div className='space-y-4'>
                <h3 className='text-xl font-semibold text-slate-900'>
                  {adminId ? 'Change Password' : 'Password'}
                </h3>
                <p className='text-sm text-slate-500'>
                  {adminId ? 'Leave blank to keep the current password.' : 'Set a password for this user.'}
                </p>

                <FormField
                  label={adminId ? 'New Password' : 'Password'}
                  required={!adminId}
                  id='password'
                  name='password'
                  type='password'
                  value={formData.password || ''}
                  onChange={handleInputChange}
                  placeholder='••••••••'
                  disabled={saving}
                  error={errors.password}
                />

                <FormField
                  label='Confirm Password'
                  required={!adminId}
                  id='confirmPassword'
                  name='confirmPassword'
                  type='password'
                  value={formData.confirmPassword || ''}
                  onChange={handleInputChange}
                  placeholder='••••••••'
                  disabled={saving}
                  error={errors.confirmPassword}
                />
              </div>

              <div className='space-y-4'>
                <h3 className='text-xl font-semibold text-slate-900'>Role & Status</h3>

                <Dropdown
                  options={[{ label: 'Select Role', value: '' }, ...roleOptions]}
                  placeholder='Select Role'
                  withSearch={false}
                  labelMain='Role *'
                  value={formData.role || ''}
                  onChange={option =>
                    setFormData(prev => ({
                      ...prev,
                      role: option.value as AdminFormData['role'],
                      permissions: option.value === 'superadmin' ? [] : prev.permissions,
                    }))
                  }
                  error={errors.role}
                />

                <div className='flex items-center justify-between p-4 border rounded-lg'>
                  <div>
                    <p className='text-sm font-medium'>Status</p>
                    <p className='text-xs text-muted-foreground'>Inactive users cannot log in</p>
                  </div>
                  <Switch
                    id='status'
                    checked={(formData.status || 'active') === 'active'}
                    onCheckedChange={checked =>
                      setFormData(prev => ({ ...prev, status: checked ? 'active' : 'inactive' }))
                    }
                  />
                </div>
              </div>

              {formData.role === 'admin' && (
                <ModulePermissionsPicker
                  value={formData.permissions || []}
                  onChange={permissions => setFormData(prev => ({ ...prev, permissions }))}
                  disabled={saving}
                />
              )}

              {formData.role === 'superadmin' && (
                <div className='rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800'>
                  Super Admin has full access to all modules and actions.
                </div>
              )}
            </div>
          </Card>

          <div className='flex flex-col sm:flex-row gap-3 justify-end pt-4'>
            <Button
              type='button'
              variant='outline'
              className='border-slate-200'
              onClick={() => router.push('/admin/users')}
              disabled={saving}>
              Cancel
            </Button>
            <Button type='submit' disabled={saving} className='bg-[#22c55e] hover:bg-[#16a34a]'>
              {saving ? 'Saving...' : adminId ? 'Update User' : 'Create User'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
