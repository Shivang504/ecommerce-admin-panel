'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Search, Wallet } from 'lucide-react';
import { Label } from '@/components/ui/label';

type Influencer = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  influencerStatus: string;
  referralCode: string;
  referralLink: string;
  walletBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  totalReferrals: number;
  totalReferralOrders: number;
};

export function InfluencerManagementPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Influencer | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const authHeaders = () => {
    const token = localStorage.getItem('adminToken');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/influencers', { headers: authHeaders(), credentials: 'include' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setInfluencers(data.influencers || []);
    } catch (error: any) {
      toast({ title: 'Failed to load influencers', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, influencerStatus: string) => {
    const response = await fetch(`/api/admin/influencers/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify({ influencerStatus }),
    });
    const data = await response.json();
    if (!response.ok) {
      toast({ title: 'Update failed', description: data.error, variant: 'destructive' });
      return;
    }
    toast({ title: `Influencer ${influencerStatus}` });
    load();
  };

  const creditCommission = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/influencers', {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          action: 'manual_commission',
          influencerId: selected._id,
          amount: Number(amount),
          note,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast({ title: 'Commission credited', description: data.message });
      setSelected(null);
      setAmount('');
      setNote('');
      load();
    } catch (error: any) {
      toast({ title: 'Credit failed', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (status: string) => {
    const classes: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      suspended: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${classes[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const filtered = influencers.filter(item => {
    const q = search.toLowerCase();
    return (
      item.name?.toLowerCase().includes(q) ||
      item.email?.toLowerCase().includes(q) ||
      item.referralCode?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Influencers</h1>
        <p className="text-gray-500 mt-1">Manage influencer accounts, status and manual commission settlement.</p>
      </div>

      <Card className="p-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input className="pl-10" placeholder="Search by name, email or referral code" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Influencer Accounts</h2>
        {loading ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No influencers found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Influencer</th>
                  <th className="text-left py-3 px-4">Code</th>
                  <th className="text-left py-3 px-4">Referrals</th>
                  <th className="text-left py-3 px-4">Orders</th>
                  <th className="text-left py-3 px-4">Wallet</th>
                  <th className="text-left py-3 px-4">Earned</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item._id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <p className="font-semibold">{item.name || '-'}</p>
                      <p className="text-sm text-gray-500">{item.email}</p>
                    </td>
                    <td className="py-3 px-4 font-mono text-sm">{item.referralCode}</td>
                    <td className="py-3 px-4">{item.totalReferrals}</td>
                    <td className="py-3 px-4">{item.totalReferralOrders}</td>
                    <td className="py-3 px-4 font-semibold">₹{item.walletBalance.toFixed(2)}</td>
                    <td className="py-3 px-4">₹{item.totalEarned.toFixed(2)}</td>
                    <td className="py-3 px-4">{statusBadge(item.influencerStatus)}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-2">
                        {item.influencerStatus !== 'active' && (
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => updateStatus(item._id, 'active')}>Approve</Button>
                        )}
                        {item.influencerStatus !== 'suspended' && (
                          <Button size="sm" variant="destructive" onClick={() => updateStatus(item._id, 'suspended')}>Suspend</Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => setSelected(item)}>
                          <Wallet className="h-4 w-4 mr-1" /> Credit
                        </Button>
                      </div>
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
            <DialogTitle>Manual commission settlement</DialogTitle>
            <DialogDescription>
              Credit commission to {selected?.name}&apos;s influencer wallet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="creditAmount">Amount (₹)</Label>
              <Input
                id="creditAmount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="creditNote">Note (Optional)</Label>
              <Textarea
                id="creditNote"
                placeholder="Add a note..."
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
            <Button disabled={saving} onClick={creditCommission}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Credit wallet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
