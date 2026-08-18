'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    creditOnStatus: 'delivered' as 'delivered' | 'completed',
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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Influencer Commission Settings</h1>
        <p className="text-slate-600 mt-1">Control eligibility, commission rate and withdrawal rules.</p>
      </div>
      <Card className="border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/60">
          <h2 className="text-lg font-semibold text-slate-900">Program rules</h2>
          <p className="text-sm text-slate-600">These settings apply to all influencer accounts.</p>
        </div>
        <div className="px-6 py-6 space-y-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
            <div className="sm:w-56">
              <Label className="text-sm font-medium text-slate-700">Program enabled</Label>
              <p className="text-xs text-slate-500 mt-1">Turn the influencer program on or off.</p>
            </div>
            <div className="flex-1 flex items-center h-12">
              <Switch checked={settings.enabled} onCheckedChange={checked => setSettings(s => ({ ...s, enabled: checked }))} />
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
            <div className="sm:w-56">
              <Label className="text-sm font-medium text-slate-700">Auto-approve new accounts</Label>
              <p className="text-xs text-slate-500 mt-1">If off, admin must approve each request.</p>
            </div>
            <div className="flex-1 flex items-center h-12">
              <Switch checked={settings.autoApprove} onCheckedChange={checked => setSettings(s => ({ ...s, autoApprove: checked }))} />
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
            <div className="sm:w-56">
              <Label className="text-sm font-medium text-slate-700">First referred order only</Label>
              <p className="text-xs text-slate-500 mt-1">Pay commission only on the customer’s first order.</p>
            </div>
            <div className="flex-1 flex items-center h-12">
              <Switch checked={settings.firstOrderOnly} onCheckedChange={checked => setSettings(s => ({ ...s, firstOrderOnly: checked }))} />
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
            <div className="sm:w-56">
              <Label className="text-sm font-medium text-slate-700">Commission rate (%)</Label>
              <p className="text-xs text-slate-500 mt-1">Percent paid on eligible referred orders.</p>
            </div>
            <div className="flex-1">
              <Input
                id="commissionRate"
                type="number"
                className="h-12"
                value={settings.commissionRate}
                onChange={e => setSettings(s => ({ ...s, commissionRate: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
            <div className="sm:w-56">
              <Label className="text-sm font-medium text-slate-700">Minimum order amount (₹)</Label>
              <p className="text-xs text-slate-500 mt-1">Orders below this amount do not earn commission.</p>
            </div>
            <div className="flex-1">
              <Input
                id="minOrderAmount"
                type="number"
                className="h-12"
                value={settings.minOrderAmount}
                onChange={e => setSettings(s => ({ ...s, minOrderAmount: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
            <div className="sm:w-56">
              <Label className="text-sm font-medium text-slate-700">Credit commission when</Label>
              <p className="text-xs text-slate-500 mt-1">Wallet is credited after this order status.</p>
            </div>
            <div className="flex-1">
              <Select
                value={settings.creditOnStatus}
                onValueChange={value => setSettings(s => ({ ...s, creditOnStatus: value as 'delivered' | 'completed' }))}
              >
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
            <div className="sm:w-56">
              <Label className="text-sm font-medium text-slate-700">Minimum withdrawal (₹)</Label>
              <p className="text-xs text-slate-500 mt-1">Influencers cannot withdraw below this amount.</p>
            </div>
            <div className="flex-1">
              <Input
                id="minWithdrawal"
                type="number"
                className="h-12"
                value={settings.minWithdrawal}
                onChange={e => setSettings(s => ({ ...s, minWithdrawal: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
            <div className="sm:w-56">
              <Label className="text-sm font-medium text-slate-700">Referral cookie days</Label>
              <p className="text-xs text-slate-500 mt-1">How long a referral code stays attributed.</p>
            </div>
            <div className="flex-1">
              <Input
                id="cookieDays"
                type="number"
                className="h-12"
                value={settings.cookieDays}
                onChange={e => setSettings(s => ({ ...s, cookieDays: Number(e.target.value) }))}
              />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save settings
          </Button>
        </div>
      </Card>
    </div>
  );
}
