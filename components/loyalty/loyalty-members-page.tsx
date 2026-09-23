'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

type Member = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  rewardPoints?: number;
  loyaltyTotalEarned?: number;
  loyaltyTotalRedeemed?: number;
  loyaltyReferralCode?: string;
  status?: string;
};

export function LoyaltyMembersPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [q, setQ] = useState('');
  const [adjustId, setAdjustId] = useState('');
  const [adjustPoints, setAdjustPoints] = useState('');
  const [adjustNote, setAdjustNote] = useState('Admin adjustment');
  const [saving, setSaving] = useState(false);

  const load = async (search = q) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(
        `/api/admin/loyalty/members?q=${encodeURIComponent(search)}`,
        { headers: { Authorization: `Bearer ${token}` }, credentials: 'include' }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMembers(data.members || []);
    } catch (error: any) {
      toast({ title: 'Load failed', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const adjust = async () => {
    if (!adjustId || !adjustPoints) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/loyalty/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({
          customerId: adjustId,
          points: Number(adjustPoints),
          note: adjustNote,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast({ title: data.message || 'Points adjusted' });
      setAdjustPoints('');
      await load();
    } catch (error: any) {
      toast({ title: 'Adjust failed', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Loyalty Members</h1>
        <p className="text-slate-600 mt-1">View balances and manually adjust reward points.</p>
      </div>

      <Card className="p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <Label>Search</Label>
          <Input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Name, email, phone, code"
            onKeyDown={e => e.key === 'Enter' && load()}
          />
        </div>
        <Button onClick={() => load()}>Search</Button>
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold text-slate-900">Manual adjust</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <Label>Customer ID</Label>
            <Input value={adjustId} onChange={e => setAdjustId(e.target.value)} placeholder="ObjectId" />
          </div>
          <div>
            <Label>Points (+ / -)</Label>
            <Input
              type="number"
              value={adjustPoints}
              onChange={e => setAdjustPoints(e.target.value)}
              placeholder="e.g. 50 or -20"
            />
          </div>
          <div>
            <Label>Note</Label>
            <Input value={adjustNote} onChange={e => setAdjustNote(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={adjust} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Apply
            </Button>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left p-3">Customer</th>
                  <th className="text-left p-3">Code</th>
                  <th className="text-right p-3">Balance</th>
                  <th className="text-right p-3">Earned</th>
                  <th className="text-right p-3">Redeemed</th>
                  <th className="text-left p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m._id} className="border-t border-slate-100">
                    <td className="p-3">
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-slate-500">{m.email}</div>
                    </td>
                    <td className="p-3 font-mono text-xs">{m.loyaltyReferralCode || '—'}</td>
                    <td className="p-3 text-right font-semibold">{m.rewardPoints || 0}</td>
                    <td className="p-3 text-right">{m.loyaltyTotalEarned || 0}</td>
                    <td className="p-3 text-right">{m.loyaltyTotalRedeemed || 0}</td>
                    <td className="p-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAdjustId(m._id)}
                      >
                        Adjust
                      </Button>
                    </td>
                  </tr>
                ))}
                {members.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No loyalty members found yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
