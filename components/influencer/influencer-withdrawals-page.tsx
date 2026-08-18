'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle, Clock, Loader2, Search, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  const [searchQuery, setSearchQuery] = useState('');

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const classes = {
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${classes[status as keyof typeof classes] || ''}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const filteredItems = items.filter(item => {
    const q = searchQuery.toLowerCase();
    return (
      item.influencerName?.toLowerCase().includes(q) ||
      item.influencerEmail?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Influencer Withdrawals</h1>
        <p className="text-gray-500 mt-1">Approve or reject influencer bank/UPI payout requests.</p>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold mt-1 text-yellow-600">{summary.pending}</p>
            <p className="text-sm text-gray-500 mt-1">₹{(summary.pendingAmount || 0).toFixed(2)}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-gray-500">Approved</p>
            <p className="text-2xl font-bold mt-1 text-green-600">{summary.approved}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-gray-500">Rejected</p>
            <p className="text-2xl font-bold mt-1 text-red-600">{summary.rejected}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-gray-500">Pending amount</p>
            <p className="text-2xl font-bold mt-1">₹{(summary.pendingAmount || 0).toFixed(2)}</p>
          </Card>
        </div>
      )}

      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by influencer name or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['all', 'pending', 'approved', 'rejected'].map(status => (
              <Button key={status} variant={statusFilter === status ? 'default' : 'outline'} onClick={() => setStatusFilter(status)}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Withdrawal Requests</h2>
        {loading ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : filteredItems.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No withdrawals found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Influencer</th>
                  <th className="text-left py-3 px-4">Amount</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Requested</th>
                  <th className="text-left py-3 px-4">Account Details</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => (
                  <tr key={item._id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <p className="font-semibold">{item.influencerName}</p>
                      <p className="text-sm text-gray-500">{item.influencerEmail}</p>
                    </td>
                    <td className="py-3 px-4 font-semibold">₹{item.amount.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.status)}
                        {getStatusBadge(item.status)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {item.requestedAt ? format(new Date(item.requestedAt), 'MMM dd, yyyy HH:mm') : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {item.accountDetails?.bankName && (
                        <div>
                          <p>{item.accountDetails.bankName}</p>
                          <p className="text-xs">***{item.accountDetails.accountNumber?.slice(-4)}</p>
                        </div>
                      )}
                      {item.accountDetails?.upiId && <p>{item.accountDetails.upiId}</p>}
                    </td>
                    <td className="py-3 px-4">
                      {item.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => { setSelected(item); setAction('approved'); }}>Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => { setSelected(item); setAction('rejected'); }}>Reject</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action === 'approved' ? 'Approve' : 'Reject'} Withdrawal</DialogTitle>
            <DialogDescription>
              {selected && (
                <>
                  {action === 'approved'
                    ? `Approve withdrawal of ₹${selected.amount.toFixed(2)} for ${selected.influencerName}?`
                    : `Reject withdrawal request of ₹${selected.amount.toFixed(2)}?`}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="adminNote">Note (Optional)</Label>
              <Textarea
                id="adminNote"
                placeholder={`Add a note for this ${action === 'approved' ? 'approval' : 'rejection'}...`}
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelected(null); setNote(''); }}>Cancel</Button>
            <Button
              disabled={saving}
              onClick={process}
              className={action === 'rejected' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {action === 'approved' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
