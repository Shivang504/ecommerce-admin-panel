'use client';

import { useEffect, useState } from 'react';
import { Loader2, Mail, RotateCcw, Send } from 'lucide-react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

type Route = { fromEmail: string; fromName: string; cc: string[]; replyTo?: string };
type Category = { key: string; label: string; description: string; defaults: Route; route: Route };
type Draft = { fromEmail: string; fromName: string; cc: string; replyTo: string };

const toDraft = (route: Route): Draft => ({ fromEmail: route.fromEmail, fromName: route.fromName, cc: route.cc.join(', '), replyTo: route.replyTo || '' });

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('adminToken');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export function EmailRoutingPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [adminEmails, setAdminEmails] = useState('');
  const [provider, setProvider] = useState('');
  const [testTo, setTestTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const apply = (data: { categories: Category[]; adminEmails: string[]; provider: string }) => {
    setCategories(data.categories);
    setDrafts(Object.fromEntries(data.categories.map(category => [category.key, toDraft(category.route)])));
    setAdminEmails(data.adminEmails.join(', '));
    setProvider(data.provider);
  };

  useEffect(() => {
    fetch('/api/admin/email-routing', { headers: authHeaders(), credentials: 'include' })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load');
        apply(data);
      })
      .catch(error => toast({ title: 'Load failed', description: error.message, variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [toast]);

  const update = (key: string, field: keyof Draft, value: string) => setDrafts(current => ({ ...current, [key]: { ...current[key], [field]: value } }));

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/email-routing', {
        method: 'PUT',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ routes: drafts, adminEmails }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Save failed');
      apply(data);
      toast({ title: 'Email routing saved', description: 'All apps use the new addresses within a minute.' });
    } catch (error: any) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async (key: string) => {
    if (!testTo.trim()) {
      toast({ title: 'Enter a test address first', variant: 'destructive' });
      return;
    }
    setTesting(key);
    try {
      const response = await fetch('/api/admin/email-routing', {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ category: key, to: testTo }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Test failed');
      toast({ title: 'Test email sent', description: `Check ${testTo} (uses the saved settings).` });
    } catch (error: any) {
      toast({ title: 'Test failed', description: error.message, variant: 'destructive' });
    } finally {
      setTesting(null);
    }
  };

  return (
    <AdminLayout>
      <div className='space-y-6'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div>
            <h1 className='flex items-center gap-2 text-2xl font-bold text-slate-900'>
              <Mail className='h-6 w-6' /> Email Routing
            </h1>
            <p className='mt-1 max-w-3xl text-sm text-slate-500'>
              Choose which sender address and CC each type of email uses across the customer site, vendor portal and admin panel. Every sender address
              must be verified in Zoho.
            </p>
            <p className='mt-1 text-xs text-slate-400'>
              Delivery: {provider === 'zoho-api' ? 'Zoho email API' : provider === 'smtp' ? 'SMTP' : 'not configured (set ZOHO_EMAIL_API_KEY)'}
            </p>
          </div>
          <Button onClick={save} disabled={saving || loading}>
            {saving && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}Save changes
          </Button>
        </div>

        {loading ? (
          <div className='flex h-40 items-center justify-center text-slate-500'>
            <Loader2 className='mr-2 h-5 w-5 animate-spin' /> Loading…
          </div>
        ) : (
          <>
            <div className='grid gap-4 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2'>
              <label className='block space-y-1'>
                <span className='text-sm font-semibold text-slate-800'>Admin email(s)</span>
                <Input value={adminEmails} onChange={event => setAdminEmails(event.target.value)} placeholder='admin@tryvvo.com' />
                <span className='text-xs text-slate-500'>Receives alerts for Tryvvo&apos;s own products and orders no vendor was notified about.</span>
              </label>
              <label className='block space-y-1'>
                <span className='text-sm font-semibold text-slate-800'>Send test emails to</span>
                <Input value={testTo} onChange={event => setTestTo(event.target.value)} placeholder='you@example.com' />
                <span className='text-xs text-slate-500'>Tests use the saved settings. Save first if you changed anything.</span>
              </label>
            </div>

            <div className='overflow-hidden rounded-xl border border-slate-200 bg-white'>
              {categories.map(category => {
                const draft = drafts[category.key];
                return (
                  <div key={category.key} className='grid gap-3 border-b border-slate-100 p-4 last:border-0 lg:grid-cols-[260px_1fr_1fr_1.2fr_auto] lg:items-end'>
                    <div>
                      <p className='text-sm font-semibold text-slate-900'>{category.label}</p>
                      <p className='text-xs text-slate-500'>{category.description}</p>
                    </div>
                    <label className='block space-y-1'>
                      <span className='text-xs font-medium text-slate-600'>From email</span>
                      <Input value={draft.fromEmail} onChange={event => update(category.key, 'fromEmail', event.target.value)} />
                    </label>
                    <label className='block space-y-1'>
                      <span className='text-xs font-medium text-slate-600'>From name</span>
                      <Input value={draft.fromName} onChange={event => update(category.key, 'fromName', event.target.value)} />
                    </label>
                    <label className='block space-y-1'>
                      <span className='text-xs font-medium text-slate-600'>CC (comma separated)</span>
                      <Input value={draft.cc} onChange={event => update(category.key, 'cc', event.target.value)} placeholder='none' />
                    </label>
                    <div className='flex gap-2'>
                      <Button type='button' variant='outline' size='sm' onClick={() => sendTest(category.key)} disabled={testing !== null}>
                        {testing === category.key ? <Loader2 className='h-4 w-4 animate-spin' /> : <Send className='h-4 w-4' />}
                        <span className='ml-1'>Test</span>
                      </Button>
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        title='Use default'
                        onClick={() => setDrafts(current => ({ ...current, [category.key]: toDraft(category.defaults) }))}>
                        <RotateCcw className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
