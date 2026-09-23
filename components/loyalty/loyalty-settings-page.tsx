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

export function LoyaltySettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    enabled: true,
    pointsPerRupee: 0.1,
    rupeePerPoint: 0.1,
    minRedeemPoints: 100,
    reviewPoints: 50,
    reviewPhotoBonusPoints: 25,
    referralReferrerPoints: 200,
    referralRefereePoints: 100,
    creditOnStatus: 'delivered' as 'delivered' | 'completed',
    minOrderAmount: 1,
    exclusiveProductIds: '' as string,
    exclusiveUnlockPoints: 0,
  });

  const load = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/loyalty-settings', {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      const data = await response.json();
      if (data.settings) {
        setSettings({
          ...data.settings,
          exclusiveProductIds: (data.settings.exclusiveProductIds || []).join(', '),
        });
      }
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
      const payload = {
        ...settings,
        exclusiveProductIds: settings.exclusiveProductIds
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
      };
      const response = await fetch('/api/admin/loyalty-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSettings({
        ...data.settings,
        exclusiveProductIds: (data.settings.exclusiveProductIds || []).join(', '),
      });
      toast({ title: 'Loyalty settings saved' });
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

  const field = (
    label: string,
    hint: string,
    children: React.ReactNode
  ) => (
    <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
      <div className="sm:w-56">
        <Label className="text-sm font-medium text-slate-700">{label}</Label>
        <p className="text-xs text-slate-500 mt-1">{hint}</p>
      </div>
      <div className="flex-1 flex items-center min-h-12">{children}</div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Loyalty &amp; Rewards Settings</h1>
        <p className="text-slate-600 mt-1">
          Points for purchases, reviews, referrals, and checkout redemption.
        </p>
      </div>
      <Card className="border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/60">
          <h2 className="text-lg font-semibold text-slate-900">Program rules</h2>
        </div>
        <div className="px-6 py-6 space-y-8">
          {field('Program enabled', 'Turn loyalty rewards on or off.', (
            <Switch
              checked={settings.enabled}
              onCheckedChange={checked => setSettings(s => ({ ...s, enabled: checked }))}
            />
          ))}
          {field('Points per ₹1', 'Default 0.1 = 1 point per ₹10 spent.', (
            <Input
              type="number"
              step="0.01"
              className="max-w-[160px]"
              value={settings.pointsPerRupee}
              onChange={e => setSettings(s => ({ ...s, pointsPerRupee: Number(e.target.value) }))}
            />
          ))}
          {field('₹ per point (redeem)', 'Default 0.1 = 10 points = ₹1 discount.', (
            <Input
              type="number"
              step="0.01"
              className="max-w-[160px]"
              value={settings.rupeePerPoint}
              onChange={e => setSettings(s => ({ ...s, rupeePerPoint: Number(e.target.value) }))}
            />
          ))}
          {field('Min redeem points', 'Minimum balance required to redeem at checkout.', (
            <Input
              type="number"
              className="max-w-[160px]"
              value={settings.minRedeemPoints}
              onChange={e => setSettings(s => ({ ...s, minRedeemPoints: Number(e.target.value) }))}
            />
          ))}
          {field('Review points', 'Awarded once per product when customer submits a review.', (
            <Input
              type="number"
              className="max-w-[160px]"
              value={settings.reviewPoints}
              onChange={e => setSettings(s => ({ ...s, reviewPoints: Number(e.target.value) }))}
            />
          ))}
          {field('Review photo bonus', 'Extra points when review includes photos.', (
            <Input
              type="number"
              className="max-w-[160px]"
              value={settings.reviewPhotoBonusPoints}
              onChange={e =>
                setSettings(s => ({ ...s, reviewPhotoBonusPoints: Number(e.target.value) }))
              }
            />
          ))}
          {field('Referrer points', 'Points to the customer who shared the loyalty link.', (
            <Input
              type="number"
              className="max-w-[160px]"
              value={settings.referralReferrerPoints}
              onChange={e =>
                setSettings(s => ({ ...s, referralReferrerPoints: Number(e.target.value) }))
              }
            />
          ))}
          {field('Referee welcome points', 'Points to the new customer after first delivery.', (
            <Input
              type="number"
              className="max-w-[160px]"
              value={settings.referralRefereePoints}
              onChange={e =>
                setSettings(s => ({ ...s, referralRefereePoints: Number(e.target.value) }))
              }
            />
          ))}
          {field('Credit on status', 'When purchase points are credited.', (
            <Select
              value={settings.creditOnStatus}
              onValueChange={(v: 'delivered' | 'completed') =>
                setSettings(s => ({ ...s, creditOnStatus: v }))
              }
            >
              <SelectTrigger className="max-w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          ))}
          {field('Exclusive product IDs', 'Comma-separated product ObjectIds for exclusive rewards.', (
            <Input
              value={settings.exclusiveProductIds}
              onChange={e => setSettings(s => ({ ...s, exclusiveProductIds: e.target.value }))}
              placeholder="507f1f..., 507f2f..."
            />
          ))}
          {field('Exclusive unlock points', 'Minimum points balance to buy exclusive products.', (
            <Input
              type="number"
              className="max-w-[160px]"
              value={settings.exclusiveUnlockPoints}
              onChange={e =>
                setSettings(s => ({ ...s, exclusiveUnlockPoints: Number(e.target.value) }))
              }
            />
          ))}
          <div className="pt-2">
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save settings
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
