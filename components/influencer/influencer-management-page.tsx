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
import { Loader2, Megaphone, Search, Wallet } from 'lucide-react';

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
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Megaphone className="h-6 w-6" /> Influencers
        </h1>
        <p className="text-sm text-muted-foreground">Manage influencer accounts, status and manual commission settlement.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input className="pl-9" placeholder="Search name, email or code" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No influencers yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="p-3">Influencer</th>
                  <th className="p-3">Code</th>
                  <th className="p-3">Referrals</th>
                  <th className="p-3">Orders</th>
                  <th className="p-3">Wallet</th>
                  <th className="p-3">Earned</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item._id} className="border-t">
                    <td className="p-3">
                      <p className="font-medium">{item.name || '-'}</p>
                      <p className="text-gray-500">{item.email}</p>
                    </td>
                    <td className="p-3 font-mono">{item.referralCode}</td>
                    <td className="p-3">{item.totalReferrals}</td>
                    <td className="p-3">{item.totalReferralOrders}</td>
                    <td className="p-3">₹{item.walletBalance.toFixed(2)}</td>
                    <td className="p-3">₹{item.totalEarned.toFixed(2)}</td>
                    <td className="p-3 capitalize">{item.influencerStatus}</td>
                    <td className="p-3 space-x-2">
                      {item.influencerStatus !== 'active' && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(item._id, 'active')}>Approve</Button>
                      )}
                      {item.influencerStatus !== 'suspended' && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(item._id, 'suspended')}>Suspend</Button>
                      )}
                      <Button size="sm" onClick={() => setSelected(item)}>
                        <Wallet className="h-4 w-4 mr-1" /> Credit
                      </Button>
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
          <Input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
          <Textarea placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} />
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
