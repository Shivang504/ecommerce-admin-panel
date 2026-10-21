'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useSettings } from '@/components/settings/settings-provider';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { settings } = useSettings();
  const primaryColor = settings.primaryColor || '#22c55e';
  const siteName = settings.siteName || 'Tryvvo Admin';

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const value = email.trim();
    if (!value) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Failed to send password reset link');
        return;
      }
      setSuccess('Reset link sent. Check your email.');
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4'>
      <div className='w-full max-w-md'>
        <div className='text-center mb-8 space-y-2'>
          {settings.logo ? (
            <div className='w-20 h-20 mx-auto rounded-2xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden'>
              <img src={settings.logo} alt={siteName} className='w-full h-full object-contain' />
            </div>
          ) : null}
          <h1 className='text-3xl font-bold text-slate-900 dark:text-white mb-1'>{siteName}</h1>
          <p className='text-slate-600 dark:text-slate-400 text-sm'>Reset admin password</p>
        </div>

        <Card className='bg-white dark:bg-slate-800 border-0 shadow-xl rounded-2xl'>
          <div className='p-8'>
            <button
              type='button'
              onClick={() => router.push('/login')}
              className='inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 mb-6'>
              <ArrowLeft className='w-4 h-4' />
              Back to login
            </button>

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
                <label className='block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2'>Email</label>
                <Input
                  type='email'
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder='admin@example.com'
                  className='w-full h-12 bg-blue-50 dark:bg-slate-700 border-blue-100 dark:border-slate-600 rounded-lg'
                  disabled={loading}
                />
              </div>
              <Button
                type='submit'
                disabled={loading}
                className='w-full text-white h-12 text-base font-semibold rounded-lg'
                style={{ backgroundColor: primaryColor }}>
                {loading ? 'Sending...' : 'Send reset link'}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
