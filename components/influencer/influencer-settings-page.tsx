'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

export function InfluencerSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    enabled: true,
    commissionRate: 5,
    minOrderAmount: 1,
    firstOrderOnly: false,
    creditOnStatus: 'delivered',
    minWithdrawal: 100,
    cookieDays: 30,
    autoApprove: true,
  });

  const load = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/influencer-settings', {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      const data = await response.json();
      if (data.settings) setSettings(data.settings);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/influencer-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSettings(data.settings);
      toast({ title: 'Commission settings saved' });
    } catch (error: any) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Influencer Commission Settings</h1>
        <p className="text-sm text-muted-foreground">Control eligibility, commission rate and withdrawal rules.</p>
      </div>
      <Card className="p-6 space-y-4">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={settings.enabled} onChange={e => setSettings(s => ({ ...s, enabled: e.target.checked }))} />
          Program enabled
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={settings.autoApprove} onChange={e => setSettings(s => ({ ...s, autoApprove: e.target.checked }))} />
          Auto-approve new influencer accounts
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={settings.firstOrderOnly} onChange={e => setSettings(s => ({ ...s, firstOrderOnly: e.target.checked }))} />
          Commission on first referred order only
        </label>
        <div>
          <p className="text-sm mb-1">Commission rate (%)</p>
          <Input type="number" value={settings.commissionRate} onChange={e => setSettings(s => ({ ...s, commissionRate: Number(e.target.value) }))} />
        </div>
        <div>
          <p className="text-sm mb-1">Minimum order amount</p>
          <Input type="number" value={settings.minOrderAmount} onChange={e => setSettings(s => ({ ...s, minOrderAmount: Number(e.target.value) }))} />
        </div>
        <div>
          <p className="text-sm mb-1">Credit commission when order is</p>
          <select
            className="border rounded-md h-10 px-3 w-full"
            value={settings.creditOnStatus}
            onChange={e => setSettings(s => ({ ...s, creditOnStatus: e.target.value as 'delivered' | 'completed' }))}
          >
            <option value="delivered">Delivered</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div>
          <p className="text-sm mb-1">Minimum withdrawal (₹)</p>
          <Input type="number" value={settings.minWithdrawal} onChange={e => setSettings(s => ({ ...s, minWithdrawal: Number(e.target.value) }))} />
        </div>
        <div>
          <p className="text-sm mb-1">Referral cookie days</p>
          <Input type="number" value={settings.cookieDays} onChange={e => setSettings(s => ({ ...s, cookieDays: Number(e.target.value) }))} />
        </div>
        <Button disabled={saving} onClick={save}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save settings
        </Button>
      </Card>
    </div>
  );
}
