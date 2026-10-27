'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ExternalLink, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_HOME_CONTENT, type HomeContent } from '@/lib/home-content';

type Path = Array<string | number>;

const SHOP_ORIGIN = (process.env.NEXT_PUBLIC_SHOP_URL || 'https://www.tryvvo.com').replace(/\/$/, '');

const SECTIONS: Array<{ key: keyof HomeContent; label: string; hint: string }> = [
  { key: 'hero', label: 'Hero & side banners', hint: 'Main slider (one card per slide) and the two banners on its right.' },
  { key: 'saleBanner', label: 'Sale banner', hint: 'Full-width banner below the hero.' },
  { key: 'promoCards', label: 'Promo cards', hint: 'The three small offer cards.' },
  { key: 'trendy', label: 'Trendy styles', hint: 'Men / Women / Kids banner shown after Shop by Categories.' },
  { key: 'beautyBanner', label: 'Beauty banner', hint: 'Pink banner between New Arrivals and Best Sellers.' },
  { key: 'footer', label: 'Footer', hint: 'Site-wide footer. The SHOP column lists your top categories automatically.' },
];

const LABELS: Record<string, string> = {
  cta: 'Button',
  href: 'Link',
  side: 'Side banners',
  slides: 'Slides',
  bigText: 'Big text',
  badgeText: 'Badge text',
  imageStyle: 'Image layout',
  offerTop: 'Offer – top line',
  offerBig: 'Offer – big text',
  offerSuffix: 'Offer – suffix',
  offerBottom: 'Offer – bottom line',
  playStoreUrl: 'Google Play link',
  appStoreUrl: 'App Store link',
  shopTitle: 'Shop column title',
  section: 'Also list CMS footer pages from',
};

const SELECTS: Record<string, Array<{ value: string; label: string }>> = {
  imageStyle: [
    { value: 'figure-right', label: 'Picture on the right' },
    { value: 'figure-right-wide', label: 'Wide picture on the right' },
    { value: 'icon-left', label: 'Icon on the left' },
  ],
  section: [
    { value: '', label: 'None' },
    { value: 'help', label: 'Help pages' },
    { value: 'about', label: 'About pages' },
    { value: 'consumer-policy', label: 'Consumer policy pages' },
  ],
};

function labelFor(key: string | number) {
  if (typeof key === 'number') return `#${key + 1}`;
  if (LABELS[key]) return LABELS[key];
  if (/\s/.test(key)) return key;
  const words = key.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function setAt(source: any, path: Path, value: unknown): any {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  const copy = Array.isArray(source) ? [...source] : { ...source };
  copy[head as any] = setAt(source?.[head as any], rest, value);
  return copy;
}

function previewSrc(url: string) {
  if (!url) return '';
  if (url.startsWith('/home/')) return `${SHOP_ORIGIN}${url}`;
  return url;
}

function authHeaders(json = true): Record<string, string> {
  const token = localStorage.getItem('adminToken');
  return { ...(json ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

function ImageField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await fetch('/api/upload', { method: 'POST', body: form, headers: authHeaders(false), credentials: 'include' });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.details || data.error || 'Upload failed');
      onChange(data.url);
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className='flex items-start gap-3'>
      <div className='flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50'>
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewSrc(value)} alt='' className='h-full w-full object-contain' />
        ) : (
          <span className='text-[11px] text-slate-400'>No image</span>
        )}
      </div>
      <div className='flex-1 space-y-2'>
        <Input value={value} onChange={event => onChange(event.target.value)} placeholder='Image URL' />
        <input
          ref={inputRef}
          type='file'
          accept='image/*'
          className='hidden'
          onChange={event => {
            const file = event.target.files?.[0];
            if (file) upload(file);
            event.target.value = '';
          }}
        />
        <Button type='button' variant='outline' size='sm' disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <Upload className='mr-2 h-4 w-4' />}
          Upload image
        </Button>
      </div>
    </div>
  );
}

function FieldEditor({ name, value, path, onChange }: { name: string | number; value: any; path: Path; onChange: (path: Path, value: unknown) => void }) {
  const key = String(name);

  if (Array.isArray(value)) {
    const template = value[value.length - 1];
    const move = (from: number, to: number) => {
      const next = [...value];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      onChange(path, next);
    };
    return (
      <div className='space-y-3'>
        <div className='flex items-center justify-between'>
          <p className='text-sm font-semibold text-slate-800'>{labelFor(name)}</p>
          <Button
            type='button'
            size='sm'
            variant='outline'
            onClick={() => onChange(path, [...value, typeof template === 'object' ? structuredClone(template) : ''])}>
            <Plus className='mr-1 h-4 w-4' /> Add
          </Button>
        </div>
        {value.map((item, index) => (
          <div key={index} className='rounded-lg border border-slate-200 bg-white p-3'>
            <div className='mb-2 flex items-center justify-between'>
              <span className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
                {labelFor(name)} {index + 1}
              </span>
              <div className='flex gap-1'>
                <Button type='button' size='icon' variant='ghost' disabled={index === 0} onClick={() => move(index, index - 1)} aria-label='Move up'>
                  <ArrowUp className='h-4 w-4' />
                </Button>
                <Button type='button' size='icon' variant='ghost' disabled={index === value.length - 1} onClick={() => move(index, index + 1)} aria-label='Move down'>
                  <ArrowDown className='h-4 w-4' />
                </Button>
                <Button
                  type='button'
                  size='icon'
                  variant='ghost'
                  disabled={value.length <= 1}
                  onClick={() => onChange(path, value.filter((_, itemIndex) => itemIndex !== index))}
                  aria-label='Remove'>
                  <Trash2 className='h-4 w-4 text-rose-600' />
                </Button>
              </div>
            </div>
            {typeof item === 'object' ? (
              <ObjectEditor value={item} path={[...path, index]} onChange={onChange} />
            ) : (
              <Input value={item} onChange={event => onChange([...path, index], event.target.value)} />
            )}
          </div>
        ))}
      </div>
    );
  }

  if (value && typeof value === 'object') {
    return (
      <fieldset className='rounded-lg border border-dashed border-slate-300 p-3'>
        <legend className='px-1 text-sm font-semibold text-slate-800'>{labelFor(name)}</legend>
        <ObjectEditor value={value} path={path} onChange={onChange} />
      </fieldset>
    );
  }

  const text = String(value ?? '');
  let control: React.ReactNode;
  if (SELECTS[key]) {
    control = (
      <select
        value={text}
        onChange={event => onChange(path, event.target.value || undefined)}
        className='h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm'>
        {SELECTS[key].map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  } else if (/image$/i.test(key)) {
    control = <ImageField value={text} onChange={next => onChange(path, next)} />;
  } else if (/(color|background|accent)$/i.test(key)) {
    control = (
      <div className='flex items-center gap-2'>
        <input
          type='color'
          value={/^#[0-9a-f]{6}$/i.test(text) ? text : '#000000'}
          onChange={event => onChange(path, event.target.value.toUpperCase())}
          className='h-9 w-12 cursor-pointer rounded border border-slate-200 bg-white'
        />
        <Input value={text} onChange={event => onChange(path, event.target.value)} className='font-mono' />
      </div>
    );
  } else if (text.includes('\n') || /^(title|subtitle|copyright|badgeText)$/.test(key)) {
    control = <Textarea value={text} rows={2} onChange={event => onChange(path, event.target.value)} />;
  } else {
    control = <Input value={text} onChange={event => onChange(path, event.target.value)} />;
  }

  return (
    <label className='block space-y-1'>
      <span className='text-xs font-medium text-slate-600'>{labelFor(name)}</span>
      {control}
    </label>
  );
}

function ObjectEditor({ value, path, onChange }: { value: Record<string, any>; path: Path; onChange: (path: Path, value: unknown) => void }) {
  const entries = Object.entries(value);
  const simple = entries.filter(([, child]) => child === null || typeof child !== 'object');
  const nested = entries.filter(([, child]) => child !== null && typeof child === 'object');
  return (
    <div className='space-y-4'>
      {simple.length > 0 && (
        <div className='grid gap-3 md:grid-cols-2'>
          {simple.map(([key, child]) => (
            <div key={key} className={/image$/i.test(key) || String(child).includes('\n') ? 'md:col-span-2' : ''}>
              <FieldEditor name={key} value={child} path={[...path, key]} onChange={onChange} />
            </div>
          ))}
        </div>
      )}
      {nested.map(([key, child]) => (
        <FieldEditor key={key} name={key} value={child} path={[...path, key]} onChange={onChange} />
      ))}
    </div>
  );
}

export function HomePageEditor() {
  const { toast } = useToast();
  const [content, setContent] = useState<HomeContent | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    fetch('/api/admin/cms/home-page', { headers: authHeaders(), credentials: 'include' })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load');
        setContent(data.content);
        setUpdatedAt(data.updatedAt);
      })
      .catch(error => toast({ title: 'Load failed', description: error.message, variant: 'destructive' }));
  }, [toast]);

  const change = (path: Path, value: unknown) => {
    setContent(current => setAt(current, path, value));
    setDirty(true);
  };

  const save = async () => {
    if (!content) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/cms/home-page', {
        method: 'PUT',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ content }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Save failed');
      setContent(data.content);
      setUpdatedAt(data.updatedAt);
      setDirty(false);
      toast({ title: 'Home page saved', description: 'Changes show on the website within about a minute.' });
    } catch (error: any) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const resetSection = (key: keyof HomeContent) => {
    if (!content || !window.confirm('Reset this section to the default design content?')) return;
    change([key], structuredClone(DEFAULT_HOME_CONTENT[key]));
  };

  return (
    <AdminLayout>
      <div className='space-y-6'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold text-slate-900'>Home Page</h1>
            <p className='mt-1 text-sm text-slate-500'>
              Edit the text, images, colours and links of every home page banner. Categories, New Arrivals and Best Sellers come from your
              categories and products automatically.
            </p>
            {updatedAt && <p className='mt-1 text-xs text-slate-400'>Last saved {new Date(updatedAt).toLocaleString('en-IN')}</p>}
          </div>
          <div className='flex gap-2'>
            <Button type='button' variant='outline' asChild>
              <a href={SHOP_ORIGIN} target='_blank' rel='noreferrer'>
                <ExternalLink className='mr-2 h-4 w-4' /> View website
              </a>
            </Button>
            <Button type='button' onClick={save} disabled={!content || saving || !dirty}>
              {saving && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              Save changes
            </Button>
          </div>
        </div>

        {!content ? (
          <div className='flex h-40 items-center justify-center text-slate-500'>
            <Loader2 className='mr-2 h-5 w-5 animate-spin' /> Loading…
          </div>
        ) : (
          <Tabs defaultValue={SECTIONS[0].key}>
            <TabsList className='flex h-auto flex-wrap justify-start'>
              {SECTIONS.map(section => (
                <TabsTrigger key={section.key} value={section.key}>
                  {section.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {SECTIONS.map(section => (
              <TabsContent key={section.key} value={section.key} className='mt-4'>
                <div className='rounded-xl border border-slate-200 bg-slate-50 p-4'>
                  <div className='mb-4 flex items-center justify-between gap-3'>
                    <p className='text-sm text-slate-600'>{section.hint}</p>
                    <Button type='button' variant='ghost' size='sm' onClick={() => resetSection(section.key)}>
                      Reset to default
                    </Button>
                  </div>
                  <FieldEditor name={section.label} value={content[section.key]} path={[section.key]} onChange={change} />
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </AdminLayout>
  );
}
