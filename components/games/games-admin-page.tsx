'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

type Slice = { label: string; points: number; weight: number };
type Task = { key: string; label: string; type: 'visit' | 'order' | 'review' | 'share'; points: number };
type Campaign = {
  _id: string;
  title: string;
  description: string;
  active: boolean;
  endsAt?: string | null;
  tasks: Task[];
};
type Settings = {
  enabled: boolean;
  wheelEnabled: boolean;
  dailyEnabled: boolean;
  referralChallengeEnabled: boolean;
  campaignEnabled: boolean;
  wheelSlices: Slice[];
  dailyRewards: number[];
  referralTarget: number;
  referralBonus: number;
};
type Activity = {
  _id: string;
  kind: string;
  points: number;
  note: string;
  customer: string;
  email: string;
  createdAt: string;
};

const EMPTY_TASKS: Task[] = [
  { key: 'visit', label: 'Visit the shop', type: 'visit', points: 5 },
  { key: 'share', label: 'Share referral link', type: 'share', points: 10 },
  { key: 'review', label: 'Write a review', type: 'review', points: 25 },
  { key: 'order', label: 'Place an order', type: 'order', points: 50 },
];

export function GamesAdminPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [draft, setDraft] = useState({ title: '', description: '', tasks: EMPTY_TASKS });

  const headers = () => {
    const token = localStorage.getItem('adminToken');
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  };

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/games', { headers: headers(), credentials: 'include' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load');
      setSettings(data.settings);
      setCampaigns(data.campaigns || []);
      setActivity(data.activity || []);
    } catch (error: any) {
      toast({ title: 'Load failed', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/games', {
        method: 'PUT',
        headers: headers(),
        credentials: 'include',
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Save failed');
      setSettings(data.settings);
      toast({ title: 'Game rules saved' });
    } catch (error: any) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const createCampaign = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/games/campaigns', {
        method: 'POST',
        headers: headers(),
        credentials: 'include',
        body: JSON.stringify(draft),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Create failed');
      setCampaigns(data.campaigns || []);
      setDraft({ title: '', description: '', tasks: EMPTY_TASKS });
      toast({ title: 'Campaign created' });
    } catch (error: any) {
      toast({ title: 'Create failed', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleCampaign = async (campaign: Campaign) => {
    const response = await fetch(`/api/admin/games/campaigns/${campaign._id}`, {
      method: 'PUT',
      headers: headers(),
      credentials: 'include',
      body: JSON.stringify({ active: !campaign.active }),
    });
    const data = await response.json();
    if (!response.ok) {
      toast({ title: 'Update failed', description: data.error, variant: 'destructive' });
      return;
    }
    setCampaigns(data.campaigns || []);
  };

  const removeCampaign = async (id: string) => {
    const response = await fetch(`/api/admin/games/campaigns/${id}`, {
      method: 'DELETE',
      headers: headers(),
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) {
      toast({ title: 'Delete failed', description: data.error, variant: 'destructive' });
      return;
    }
    setCampaigns(data.campaigns || []);
  };

  if (loading || !settings) {
    return (
      <AdminLayout>
        <div className="flex min-h-[320px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </AdminLayout>
    );
  }

  const toggle = (key: keyof Settings, label: string) => (
    <div className="flex items-center justify-between gap-4 py-2">
      <Label>{label}</Label>
      <Switch checked={Boolean(settings[key])} onCheckedChange={checked => setSettings({ ...settings, [key]: checked })} />
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Games</h1>
            <p className="text-sm text-slate-500 mt-1">Spin the wheel, daily login, referral challenge, and engagement campaigns. Points go to loyalty.</p>
          </div>
          <Button onClick={saveSettings} disabled={saving}>{saving ? 'Saving...' : 'Save rules'}</Button>
        </div>

        <Card className="p-5 space-y-1">
          {toggle('enabled', 'Games on')}
          {toggle('wheelEnabled', 'Spin the wheel')}
          {toggle('dailyEnabled', 'Daily login reward')}
          {toggle('referralChallengeEnabled', 'Referral challenge')}
          {toggle('campaignEnabled', 'Engagement campaigns')}
          <div className="grid gap-3 sm:grid-cols-2 pt-3">
            <div>
              <Label>Friends needed</Label>
              <Input type="number" value={settings.referralTarget} onChange={e => setSettings({ ...settings, referralTarget: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Challenge bonus points</Label>
              <Input type="number" value={settings.referralBonus} onChange={e => setSettings({ ...settings, referralBonus: Number(e.target.value) })} />
            </div>
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="font-semibold text-slate-900">Wheel slices</h2>
          {settings.wheelSlices.map((slice, index) => (
            <div key={index} className="grid grid-cols-3 gap-2">
              <Input value={slice.label} onChange={e => {
                const wheelSlices = [...settings.wheelSlices];
                wheelSlices[index] = { ...slice, label: e.target.value };
                setSettings({ ...settings, wheelSlices });
              }} />
              <Input type="number" value={slice.points} onChange={e => {
                const wheelSlices = [...settings.wheelSlices];
                wheelSlices[index] = { ...slice, points: Number(e.target.value) };
                setSettings({ ...settings, wheelSlices });
              }} />
              <Input type="number" value={slice.weight} onChange={e => {
                const wheelSlices = [...settings.wheelSlices];
                wheelSlices[index] = { ...slice, weight: Number(e.target.value) };
                setSettings({ ...settings, wheelSlices });
              }} />
            </div>
          ))}
          <p className="text-xs text-slate-500">Label, points, weight. Higher weight is more likely. 0 points is a miss.</p>
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="font-semibold text-slate-900">Daily rewards, day 1 to 7</h2>
          <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
            {settings.dailyRewards.map((points, index) => (
              <Input key={index} type="number" value={points} onChange={e => {
                const dailyRewards = [...settings.dailyRewards];
                dailyRewards[index] = Number(e.target.value);
                setSettings({ ...settings, dailyRewards });
              }} />
            ))}
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="font-semibold text-slate-900">Campaigns</h2>
          {campaigns.map(campaign => (
            <div key={campaign._id} className="flex flex-wrap items-center justify-between gap-3 border border-slate-200 rounded-lg p-3">
              <div>
                <p className="font-medium">{campaign.title}</p>
                <p className="text-xs text-slate-500">{campaign.tasks.map(task => `${task.label} +${task.points}`).join(' · ')}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => toggleCampaign(campaign)}>{campaign.active ? 'Pause' : 'Resume'}</Button>
                <Button variant="outline" size="sm" onClick={() => removeCampaign(campaign._id)}>Delete</Button>
              </div>
            </div>
          ))}
          <div className="space-y-2 border-t border-slate-100 pt-4">
            <Input placeholder="Campaign title" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} />
            <Input placeholder="Short description" value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} />
            {draft.tasks.map((task, index) => (
              <div key={task.key} className="grid grid-cols-[1fr_120px] gap-2">
                <Input value={task.label} onChange={e => {
                  const tasks = [...draft.tasks];
                  tasks[index] = { ...task, label: e.target.value };
                  setDraft({ ...draft, tasks });
                }} />
                <Input type="number" value={task.points} onChange={e => {
                  const tasks = [...draft.tasks];
                  tasks[index] = { ...task, points: Number(e.target.value) };
                  setDraft({ ...draft, tasks });
                }} />
              </div>
            ))}
            <Button onClick={createCampaign} disabled={saving || !draft.title.trim()}>Add campaign</Button>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Recent plays</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-2">When</th>
                  <th>Customer</th>
                  <th>Kind</th>
                  <th>Points</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {activity.map(row => (
                  <tr key={row._id} className="border-t border-slate-100">
                    <td className="py-2 pr-3">{row.createdAt ? new Date(row.createdAt).toLocaleString() : ''}</td>
                    <td className="pr-3">{row.customer}</td>
                    <td className="pr-3">{row.kind}</td>
                    <td className="pr-3">{row.points}</td>
                    <td>{row.note}</td>
                  </tr>
                ))}
                {activity.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-slate-500">No plays yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
