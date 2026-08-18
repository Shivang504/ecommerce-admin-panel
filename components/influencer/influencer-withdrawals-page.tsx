'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

type Withdrawal = {
  _id: string;
  influencerName?: string;
  influencerEmail?: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  accountDetails?: {
    accountHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    upiId?: string;
  };
};

export function InfluencerWithdrawalsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<Withdrawal | null>(null);
  const [action, setAction] = useState<'approved' | 'rejected'>('approved');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const url = statusFilter === 'all' ? '/api/admin/influencer-withdrawals' : `/api/admin/influencer-withdrawals?status=${statusFilter}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setItems(data.withdrawals || []);
      setSummary(data.summary);
    } catch (error: any) {
      toast({ title: 'Failed to load withdrawals', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const process = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/influencer-withdrawals/${selected._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ status: action, adminNote: note }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast({ title: `Withdrawal ${action}` });
      setSelected(null);
      setNote('');
      load();
    } catch (error: any) {
      toast({ title: 'Action failed', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Influencer Withdrawals</h1>
        <p className="text-sm text-muted-foreground">Approve or reject influencer bank/UPI payout requests.</p>
      </div>

      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-4"><p className="text-xs text-gray-500">Pending</p><p className="text-xl font-bold">{summary.pending}</p></Card>
          <Card className="p-4"><p className="text-xs text-gray-500">Pending amount</p><p className="text-xl font-bold">₹{(summary.pendingAmount || 0).toFixed(2)}</p></Card>
          <Card className="p-4"><p className="text-xs text-gray-500">Approved</p><p className="text-xl font-bold">{summary.approved}</p></Card>
          <Card className="p-4"><p className="text-xs text-gray-500">Rejected</p><p className="text-xl font-bold">{summary.rejected}</p></Card>
        </div>
      )}

      <div className="flex gap-2">
        {['all', 'pending', 'approved', 'rejected'].map(status => (
          <Button key={status} variant={statusFilter === status ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(status)}>
            {status}
          </Button>
        ))}
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No withdrawal requests.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3">Influencer</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Bank / UPI</th>
                <th className="p-3">Requested</th>
                <th className="p-3">Status</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item._id} className="border-t">
                  <td className="p-3">
                    <p className="font-medium">{item.influencerName}</p>
                    <p className="text-gray-500">{item.influencerEmail}</p>
                  </td>
                  <td className="p-3 font-semibold">₹{item.amount.toFixed(2)}</td>
                  <td className="p-3">
                    {item.accountDetails?.upiId || `${item.accountDetails?.bankName || ''} ${item.accountDetails?.accountNumber || ''}`}
                  </td>
                  <td className="p-3">{item.requestedAt ? format(new Date(item.requestedAt), 'dd MMM yyyy') : '-'}</td>
                  <td className="p-3 capitalize">{item.status}</td>
                  <td className="p-3 space-x-2">
                    {item.status === 'pending' && (
                      <>
                        <Button size="sm" onClick={() => { setSelected(item); setAction('approved'); }}>Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => { setSelected(item); setAction('rejected'); }}>Reject</Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action === 'approved' ? 'Approve' : 'Reject'} withdrawal</DialogTitle>
          </DialogHeader>
          <p>₹{selected?.amount.toFixed(2)} for {selected?.influencerName}</p>
          <Textarea placeholder="Admin note" value={note} onChange={e => setNote(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
            <Button disabled={saving} onClick={process}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
