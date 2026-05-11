'use client';

import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import type { VendorAdminRequestStatus, VendorAdminRequestType } from '@/lib/models/vendor-admin-request';

const REQUEST_TYPE_OPTIONS: { value: VendorAdminRequestType; label: string }[] = [
  { value: 'new_catalogue_category', label: 'New catalogue or category' },
  { value: 'brand_or_tag', label: 'New brand or tag' },
  { value: 'listing_merchandising', label: 'Listing or merchandising' },
  { value: 'account_billing', label: 'Account or billing' },
  { value: 'technical', label: 'Technical issue' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS: { value: VendorAdminRequestStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

function typeLabel(type: VendorAdminRequestType) {
  return REQUEST_TYPE_OPTIONS.find(o => o.value === type)?.label ?? type;
}

function statusBadgeClass(status: VendorAdminRequestStatus) {
  switch (status) {
    case 'open':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200';
    case 'in_progress':
      return 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200';
    case 'resolved':
      return 'bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-200';
    case 'closed':
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export interface SerializedVendorRequest {
  _id: string;
  vendorId: string;
  vendorName?: string;
  vendorEmail?: string;
  requestType: VendorAdminRequestType;
  subject: string;
  message: string;
  status: VendorAdminRequestStatus;
  adminReply?: string;
  createdAt: string;
  updatedAt: string;
}

export function AdminVendorRequestsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<SerializedVendorRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState<VendorAdminRequestStatus | 'all'>('all');

  const [manageOpen, setManageOpen] = useState(false);
  const [selected, setSelected] = useState<SerializedVendorRequest | null>(null);
  const [adminStatus, setAdminStatus] = useState<VendorAdminRequestStatus>('open');
  const [adminReply, setAdminReply] = useState('');
  const [savingAdmin, setSavingAdmin] = useState(false);

  const authHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const qs = filterStatus !== 'all' ? `?status=${encodeURIComponent(filterStatus)}` : '';
      const res = await fetch(`/api/admin/vendor-requests${qs}`, {
        headers: authHeaders(),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: 'Error',
          description: data.error || 'Failed to load',
          variant: 'destructive',
        });
        return;
      }
      setRequests(Array.isArray(data.requests) ? data.requests : []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load requests', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [filterStatus, toast]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const openManage = (row: SerializedVendorRequest) => {
    setSelected(row);
    setAdminStatus(row.status);
    setAdminReply(row.adminReply || '');
    setManageOpen(true);
  };

  const saveAdmin = async () => {
    if (!selected) return;
    setSavingAdmin(true);
    try {
      const res = await fetch(`/api/admin/vendor-requests/${selected._id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          status: adminStatus,
          adminReply,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Error', description: data.error || 'Update failed', variant: 'destructive' });
        return;
      }
      toast({ title: 'Saved', description: 'Request updated.', variant: 'success' });
      setManageOpen(false);
      setSelected(null);
      await loadRequests();
    } catch {
      toast({ title: 'Error', description: 'Update failed', variant: 'destructive' });
    } finally {
      setSavingAdmin(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Vendor requests</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Requests submitted from the vendor portal (catalogue changes, categories, billing, and other support).
        </p>
      </div>

      <Card className="border-slate-200 p-6 dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">All requests</h2>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-slate-500">Status</Label>
            <Select
              value={filterStatus}
              onValueChange={v => setFilterStatus(v as VendorAdminRequestStatus | 'all')}>
              <SelectTrigger className="w-[180px] bg-white dark:bg-slate-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {STATUS_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : requests.length === 0 ? (
          <p className="py-8 text-center text-slate-500">No vendor requests yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map(row => (
                  <TableRow key={row._id}>
                    <TableCell className="whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                      {format(new Date(row.createdAt), 'dd MMM yyyy, HH:mm')}
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-sm" title={row.vendorName}>
                      {row.vendorName || '—'}
                    </TableCell>
                    <TableCell className="text-sm">{typeLabel(row.requestType)}</TableCell>
                    <TableCell className="max-w-[240px]">
                      <div className="truncate font-medium text-slate-900 dark:text-white" title={row.subject}>
                        {row.subject}
                      </div>
                      <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{row.message}</p>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(row.status)}`}>
                        {STATUS_OPTIONS.find(s => s.value === row.status)?.label ?? row.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button type="button" variant="outline" size="sm" onClick={() => openManage(row)}>
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Update request</DialogTitle>
            <DialogDescription>{selected?.subject}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 py-2">
              <div className="rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-800">
                <p className="text-xs font-medium text-slate-500">Vendor</p>
                <p className="text-slate-900 dark:text-white">{selected.vendorName || '—'}</p>
                {selected.vendorEmail && <p className="text-xs text-slate-600">{selected.vendorEmail}</p>}
              </div>
              <div className="text-sm text-slate-700 dark:text-slate-300">
                <p className="text-xs font-medium text-slate-500">Message</p>
                <p className="whitespace-pre-wrap">{selected.message}</p>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={adminStatus} onValueChange={v => setAdminStatus(v as VendorAdminRequestStatus)}>
                  <SelectTrigger className="bg-white dark:bg-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-reply">Reply to vendor</Label>
                <Textarea
                  id="admin-reply"
                  value={adminReply}
                  onChange={e => setAdminReply(e.target.value)}
                  rows={5}
                  className="bg-white dark:bg-slate-800"
                  maxLength={8000}
                  placeholder="Optional reply; vendors can see this in their vendor portal request list."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setManageOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveAdmin} disabled={savingAdmin}>
              {savingAdmin ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
