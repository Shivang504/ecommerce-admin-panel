'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useSettings } from '@/components/settings/settings-provider';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const { settings } = useSettings();
  const primaryColor = settings.primaryColor || '#22c55e';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Reset link is missing. Request a new one.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Could not reset password');
        return;
      }
      setSuccess('Password updated. You can sign in now.');
      setTimeout(() => router.push('/login'), 1200);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className='bg-white dark:bg-slate-800 border-0 shadow-xl rounded-2xl'>
      <div className='p-8'>
        <h2 className='text-2xl font-bold text-slate-900 dark:text-white mb-6'>Set new password</h2>
        {error && (
          <div className='mb-4 p-4 rounded-lg bg-red-50 border border-red-200 flex gap-3'>
            <AlertCircle className='w-5 h-5 text-red-600 shrink-0 mt-0.5' />
            <p className='text-sm text-red-700'>{error}</p>
          </div>
        )}
        {success && (
          <div className='mb-4 p-4 rounded-lg bg-green-50 border border-green-200 flex gap-3'>
            <CheckCircle2 className='w-5 h-5 text-green-700 shrink-0 mt-0.5' />
            <p className='text-sm text-green-800'>{success}</p>
          </div>
        )}
        <form onSubmit={submit} className='space-y-4'>
          <div>
            <label className='block text-sm font-semibold text-slate-700 mb-2'>New password</label>
            <Input
              type='password'
              value={password}
              onChange={e => setPassword(e.target.value)}
              className='w-full h-12 bg-blue-50 border-blue-100 rounded-lg'
              disabled={loading}
            />
          </div>
          <div>
            <label className='block text-sm font-semibold text-slate-700 mb-2'>Confirm password</label>
            <Input
              type='password'
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className='w-full h-12 bg-blue-50 border-blue-100 rounded-lg'
              disabled={loading}
            />
          </div>
          <Button
            type='submit'
            disabled={loading}
            className='w-full text-white h-12 text-base font-semibold rounded-lg'
            style={{ backgroundColor: primaryColor }}>
            {loading ? 'Saving...' : 'Update password'}
          </Button>
        </form>
      </div>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className='min-h-screen bg-slate-50 flex items-center justify-center p-4'>
      <div className='w-full max-w-md'>
        <Suspense fallback={<div className='h-40' />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
