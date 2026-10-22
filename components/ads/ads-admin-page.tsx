'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

type Placement = {
  _id: string;
  key: string;
  name: string;
  type: 'featured_product' | 'banner';
  description: string;
  pricePerDay: number;
  slots: number;
  minDays: number;
  maxDays: number;
  active: boolean;
  bannerSize?: string;
};

type Booking = {
  _id: string;
  vendorName: string;
  placementName: string;
  type: string;
  productName?: string;
  banner?: { title?: string; link?: string };
  startDate: string;
  endDate: string;
  days: number;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  state: string;
  adminNote?: string;
  impressions?: number;
  clicks?: number;
};

type Summary = { bookings: number; pending: number; live: number; revenue: number; impressions: number; clicks: number };

const FILTERS = ['all', 'pending', 'approved', 'rejected', 'cancelled', 'ended'];

function inr(value: number) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function stateTone(state: string) {
  if (state === 'live') return 'bg-emerald-100 text-emerald-700';
  if (state === 'scheduled') return 'bg-sky-100 text-sky-700';
  if (state === 'pending') return 'bg-amber-100 text-amber-700';
  if (state === 'rejected' || state === 'cancelled') return 'bg-rose-100 text-rose-700';
  return 'bg-slate-100 text-slate-700';
}

export function AdsAdminPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<'bookings' | 'placements'>('bookings');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [dates, setDates] = useState<Record<string, { startDate: string; endDate: string }>>({});
  const [preview, setPreview] = useState('');

  const headers = () => {
    const token = localStorage.getItem('adminToken');
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };

  const load = async (status = filter) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/ads?status=${status}`, { headers: headers(), credentials: 'include' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Failed to load ads');
      setPlacements(data.placements || []);
      setBookings(data.bookings || []);
      setSummary(data.summary || null);
    } catch (error: any) {
      toast({ title: 'Load failed', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (booking: Booking, action: string, extra: Record<string, string> = {}) => {
    let note = '';
    if (action === 'reject') {
      note = window.prompt('Reason for rejecting (the vendor will see this):', '') || '';
    }
    try {
      setBusy(`${booking._id}:${action}`);
      const response = await fetch(`/api/admin/ads/bookings/${booking._id}`, {
        method: 'PATCH',
        headers: headers(),
        credentials: 'include',
        body: JSON.stringify({ action, note, ...extra }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Update failed');
      toast({ title: 'Booking updated' });
      await load();
    } catch (error: any) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    } finally {
      setBusy('');
    }
  };

  const removeBooking = async (booking: Booking) => {
    if (!window.confirm('Delete this closed booking from the list?')) return;
    const response = await fetch(`/api/admin/ads/bookings/${booking._id}`, { method: 'DELETE', headers: headers(), credentials: 'include' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast({ title: 'Delete failed', description: data?.error, variant: 'destructive' });
      return;
    }
    await load();
  };

  const showBanner = async (id: string) => {
    const response = await fetch(`/api/admin/ads/bookings/${id}`, { headers: headers(), credentials: 'include' });
    const data = await response.json().catch(() => ({}));
    if (data?.url) setPreview(data.url);
  };

  const savePlacement = async (placement: Placement) => {
    try {
      setBusy(placement._id);
      const response = await fetch(`/api/admin/ads/placements/${placement._id}`, {
        method: 'PUT',
        headers: headers(),
        credentials: 'include',
        body: JSON.stringify(placement),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Save failed');
      setPlacements(data.placements || []);
      toast({ title: 'Placement saved' });
    } catch (error: any) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    } finally {
      setBusy('');
    }
  };

  const editPlacement = (id: string, patch: Partial<Placement>) =>
    setPlacements(prev => prev.map(item => (item._id === id ? { ...item, ...patch } : item)));

  return (
    <AdminLayout>
      <div className='space-y-6'>
        <div>
          <h1 className='text-2xl font-bold text-slate-900'>Advertisements</h1>
          <p className='mt-1 text-sm text-slate-500'>Vendor ad bookings, featured product slots, banners, pricing, placement, and duration.</p>
        </div>

        {summary && (
          <div className='grid gap-3 sm:grid-cols-3 lg:grid-cols-6'>
            {[
              ['Bookings', summary.bookings],
              ['Waiting approval', summary.pending],
              ['Live today', summary.live],
              ['Ad revenue (paid)', inr(summary.revenue)],
              ['Views', summary.impressions],
              ['Clicks', `${summary.clicks}${summary.impressions ? ` (${((summary.clicks / summary.impressions) * 100).toFixed(1)}%)` : ''}`],
            ].map(([label, value]) => (
              <div key={String(label)} className='rounded-xl border border-slate-200 bg-white p-3'>
                <p className='text-xs text-slate-500'>{label}</p>
                <p className='mt-1 text-lg font-semibold text-slate-900'>{value}</p>
              </div>
            ))}
          </div>
        )}

        <div className='flex flex-wrap gap-2'>
          <Button variant={tab === 'bookings' ? 'default' : 'outline'} onClick={() => setTab('bookings')}>
            Bookings
          </Button>
          <Button variant={tab === 'placements' ? 'default' : 'outline'} onClick={() => setTab('placements')}>
            Placements &amp; pricing
          </Button>
        </div>

        {loading ? (
          <p className='text-sm text-slate-500'>Loading ads...</p>
        ) : tab === 'placements' ? (
          <div className='grid gap-4 lg:grid-cols-2'>
            {placements.map(placement => (
              <section key={placement._id} className='space-y-3 rounded-xl border border-slate-200 bg-white p-4'>
                <div className='flex items-center justify-between gap-3'>
                  <div className='flex-1'>
                    <p className='text-xs uppercase tracking-wide text-slate-500'>
                      {placement.type === 'banner' ? 'Banner' : 'Featured product'} · {placement.key}
                    </p>
                    <Input className='mt-1 font-semibold' value={placement.name} onChange={e => editPlacement(placement._id, { name: e.target.value })} />
                  </div>
                  <div className='flex items-center gap-2 text-sm'>
                    Active
                    <Switch checked={placement.active} onCheckedChange={checked => editPlacement(placement._id, { active: checked })} />
                  </div>
                </div>
                <Input value={placement.description} onChange={e => editPlacement(placement._id, { description: e.target.value })} />
                <div className='grid grid-cols-4 gap-2'>
                  {(
                    [
                      ['pricePerDay', 'Price / day (₹)'],
                      ['slots', 'Slots'],
                      ['minDays', 'Min days'],
                      ['maxDays', 'Max days'],
                    ] as Array<[keyof Placement, string]>
                  ).map(([field, label]) => (
                    <label key={field} className='text-xs text-slate-500'>
                      {label}
                      <Input
                        type='number'
                        className='mt-1'
                        value={Number(placement[field] || 0)}
                        onChange={e => editPlacement(placement._id, { [field]: Number(e.target.value) } as Partial<Placement>)}
                      />
                    </label>
                  ))}
                </div>
                <div className='flex justify-end'>
                  <Button size='sm' disabled={busy === placement._id} onClick={() => savePlacement(placement)}>
                    Save
                  </Button>
                </div>
              </section>
            ))}
          </div>
        ) : (
          <>
            <div className='flex flex-wrap gap-2'>
              {FILTERS.map(item => (
                <Button
                  key={item}
                  size='sm'
                  variant={filter === item ? 'default' : 'outline'}
                  onClick={() => {
                    setFilter(item);
                    load(item);
                  }}>
                  {item}
                </Button>
              ))}
            </div>
            <div className='overflow-x-auto rounded-xl border border-slate-200 bg-white'>
              <table className='min-w-full text-sm'>
                <thead className='bg-[#E8F7F1] text-left text-[#0B8A6A]'>
                  <tr>
                    {['Vendor', 'Placement', 'Item', 'Dates', 'Amount', 'Payment', 'Status', 'Views / clicks', 'Actions'].map(header => (
                      <th key={header} className='px-3 py-3 font-medium'>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.length === 0 ? (
                    <tr>
                      <td colSpan={9} className='px-3 py-8 text-slate-500'>
                        No bookings yet. Vendors book from Supplier panel → Advertise.
                      </td>
                    </tr>
                  ) : (
                    bookings.map(row => {
                      const range = dates[row._id] || { startDate: row.startDate, endDate: row.endDate };
                      const open = row.status === 'pending' || row.status === 'approved';
                      return (
                        <tr key={row._id} className='border-t border-slate-100 align-top'>
                          <td className='px-3 py-3'>{row.vendorName}</td>
                          <td className='px-3 py-3'>{row.placementName}</td>
                          <td className='px-3 py-3'>
                            {row.type === 'banner' ? row.banner?.title || row.productName || 'Banner' : row.productName}
                            {row.type === 'banner' && (
                              <button type='button' className='block text-xs text-[#0B8A6A] underline' onClick={() => showBanner(row._id)}>
                                View banner
                              </button>
                            )}
                          </td>
                          <td className='px-3 py-3'>
                            {open ? (
                              <div className='flex flex-col gap-1'>
                                <Input
                                  type='date'
                                  value={range.startDate}
                                  onChange={e => setDates(prev => ({ ...prev, [row._id]: { ...range, startDate: e.target.value } }))}
                                />
                                <Input
                                  type='date'
                                  value={range.endDate}
                                  onChange={e => setDates(prev => ({ ...prev, [row._id]: { ...range, endDate: e.target.value } }))}
                                />
                                {(range.startDate !== row.startDate || range.endDate !== row.endDate) && (
                                  <Button size='sm' variant='outline' onClick={() => act(row, 'dates', range)}>
                                    Save dates
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <span className='whitespace-nowrap'>
                                {row.startDate} → {row.endDate}
                              </span>
                            )}
                            <span className='block text-xs text-slate-500'>{row.days} days</span>
                          </td>
                          <td className='px-3 py-3'>{inr(row.amount)}</td>
                          <td className='px-3 py-3'>
                            {row.paymentMethod === 'wallet' ? 'Wallet' : 'Offline'}
                            <span className='block text-xs text-slate-500'>{row.paymentStatus}</span>
                          </td>
                          <td className='px-3 py-3'>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${stateTone(row.state)}`}>{row.state}</span>
                            {row.adminNote && <span className='mt-1 block text-xs text-slate-500'>{row.adminNote}</span>}
                          </td>
                          <td className='px-3 py-3'>
                            {row.impressions || 0} / {row.clicks || 0}
                          </td>
                          <td className='px-3 py-3'>
                            <div className='flex flex-col gap-1'>
                              {row.status === 'pending' && (
                                <Button size='sm' disabled={busy === `${row._id}:approve`} onClick={() => act(row, 'approve')}>
                                  Approve
                                </Button>
                              )}
                              {open && (
                                <Button size='sm' variant='outline' disabled={busy === `${row._id}:reject`} onClick={() => act(row, 'reject')}>
                                  Reject
                                </Button>
                              )}
                              {row.paymentStatus === 'unpaid' && open && (
                                <Button size='sm' variant='outline' onClick={() => act(row, 'mark_paid')}>
                                  Mark paid
                                </Button>
                              )}
                              {row.status === 'approved' && (
                                <Button size='sm' variant='outline' onClick={() => act(row, 'end')}>
                                  End now
                                </Button>
                              )}
                              {!open && (
                                <Button size='sm' variant='ghost' onClick={() => removeBooking(row)}>
                                  Delete
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {preview && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6' onClick={() => setPreview('')}>
            <img src={preview} alt='Banner preview' className='max-h-[80vh] max-w-full rounded-lg bg-white' />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
