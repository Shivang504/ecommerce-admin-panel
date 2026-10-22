import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';

export type GameTaskType = 'visit' | 'order' | 'review' | 'share';

export interface WheelSlice {
  label: string;
  points: number;
  weight: number;
}

export interface GameTask {
  key: string;
  label: string;
  type: GameTaskType;
  points: number;
}

export interface GameSettings {
  enabled: boolean;
  wheelEnabled: boolean;
  dailyEnabled: boolean;
  referralChallengeEnabled: boolean;
  campaignEnabled: boolean;
  wheelSlices: WheelSlice[];
  dailyRewards: number[];
  referralTarget: number;
  referralBonus: number;
}

const DEFAULT_WHEEL: WheelSlice[] = [
  { label: '10 pts', points: 10, weight: 30 },
  { label: '25 pts', points: 25, weight: 25 },
  { label: '50 pts', points: 50, weight: 20 },
  { label: '100 pts', points: 100, weight: 12 },
  { label: '5 pts', points: 5, weight: 8 },
  { label: 'Try again', points: 0, weight: 5 },
];

const DEFAULTS: GameSettings = {
  enabled: true,
  wheelEnabled: true,
  dailyEnabled: true,
  referralChallengeEnabled: true,
  campaignEnabled: true,
  wheelSlices: DEFAULT_WHEEL,
  dailyRewards: [10, 15, 20, 25, 40, 50, 100],
  referralTarget: 3,
  referralBonus: 300,
};

function roundPoints(value: number): number {
  return Math.max(0, Math.round(Number(value) || 0));
}

export function sanitizeSlices(input: unknown): WheelSlice[] {
  const rows = Array.isArray(input) ? input : [];
  const slices = rows
    .map(row => {
      const item = row as Partial<WheelSlice>;
      return {
        label: String(item.label || '').trim().slice(0, 24),
        points: roundPoints(item.points ?? 0),
        weight: Math.max(1, roundPoints(item.weight ?? 1)),
      };
    })
    .filter(slice => slice.label)
    .slice(0, 8);
  return slices.length >= 2 ? slices : DEFAULT_WHEEL;
}

export function sanitizeRewards(input: unknown): number[] {
  const rows = Array.isArray(input) ? input.map(value => roundPoints(value)).slice(0, 7) : [];
  if (rows.length === 0) return DEFAULTS.dailyRewards;
  while (rows.length < 7) rows.push(rows[rows.length - 1]);
  return rows;
}

export function sanitizeTasks(input: unknown): GameTask[] {
  const allowed = new Set<GameTaskType>(['visit', 'order', 'review', 'share']);
  const rows = Array.isArray(input) ? input : [];
  return rows
    .map(row => {
      const item = row as Partial<GameTask>;
      const type = allowed.has(item.type as GameTaskType) ? (item.type as GameTaskType) : 'visit';
      const points = roundPoints(item.points ?? 0);
      return {
        key: String(item.key || type).replace(/[^a-z0-9_-]/gi, '').slice(0, 32) || type,
        label: String(item.label || type).trim().slice(0, 80),
        type,
        points,
      };
    })
    .filter(task => task.label && task.points > 0)
    .slice(0, 6);
}

function cleanSettings(doc: Record<string, any> | null): GameSettings {
  return {
    enabled: doc?.enabled !== false,
    wheelEnabled: doc?.wheelEnabled !== false,
    dailyEnabled: doc?.dailyEnabled !== false,
    referralChallengeEnabled: doc?.referralChallengeEnabled !== false,
    campaignEnabled: doc?.campaignEnabled !== false,
    wheelSlices: sanitizeSlices(doc?.wheelSlices),
    dailyRewards: sanitizeRewards(doc?.dailyRewards),
    referralTarget: Math.max(1, roundPoints(doc?.referralTarget ?? DEFAULTS.referralTarget)),
    referralBonus: roundPoints(doc?.referralBonus ?? DEFAULTS.referralBonus),
  };
}

export async function ensureWelcomeCampaign() {
  const { db } = await connectToDatabase();
  await db.collection('game_campaigns').updateOne(
    { slug: 'welcome-engagement' },
    {
      $setOnInsert: {
        slug: 'welcome-engagement',
        title: 'Welcome engagement',
        description: 'Visit, share, review, and order to earn extra points.',
        active: true,
        startsAt: null,
        endsAt: null,
        tasks: [
          { key: 'visit', label: 'Open the games page', type: 'visit', points: 5 },
          { key: 'share', label: 'Copy your referral link', type: 'share', points: 10 },
          { key: 'review', label: 'Write a product review', type: 'review', points: 25 },
          { key: 'order', label: 'Place an order', type: 'order', points: 50 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
}

export async function getGameSettings(): Promise<GameSettings> {
  const { db } = await connectToDatabase();
  const doc = await db.collection('game_settings').findOne({});
  return cleanSettings(doc);
}

export async function saveGameSettings(input: Partial<GameSettings>): Promise<GameSettings> {
  const current = await getGameSettings();
  const next = cleanSettings({
    ...current,
    ...input,
    wheelSlices: input.wheelSlices ?? current.wheelSlices,
    dailyRewards: input.dailyRewards ?? current.dailyRewards,
  });
  const { db } = await connectToDatabase();
  await db.collection('game_settings').updateOne(
    {},
    { $set: { ...next, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  );
  return next;
}

export async function listCampaigns() {
  await ensureWelcomeCampaign();
  const { db } = await connectToDatabase();
  const docs = await db.collection('game_campaigns').find({}).sort({ createdAt: 1 }).toArray();
  return docs.map(doc => ({
    _id: doc._id.toString(),
    slug: doc.slug || '',
    title: doc.title || 'Campaign',
    description: doc.description || '',
    active: doc.active !== false,
    startsAt: doc.startsAt || null,
    endsAt: doc.endsAt || null,
    tasks: sanitizeTasks(doc.tasks),
  }));
}

export async function createCampaign(input: {
  title: string;
  description?: string;
  active?: boolean;
  endsAt?: string | null;
  tasks: unknown;
}) {
  const tasks = sanitizeTasks(input.tasks);
  if (!input.title?.trim()) throw new Error('Title is required');
  if (tasks.length === 0) throw new Error('Add at least one task with points');
  const { db } = await connectToDatabase();
  const result = await db.collection('game_campaigns').insertOne({
    slug: `campaign-${Date.now()}`,
    title: input.title.trim().slice(0, 80),
    description: String(input.description || '').trim().slice(0, 240),
    active: input.active !== false,
    startsAt: null,
    endsAt: input.endsAt || null,
    tasks,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return result.insertedId.toString();
}

export async function updateCampaign(
  id: string,
  input: {
    title?: string;
    description?: string;
    active?: boolean;
    endsAt?: string | null;
    tasks?: unknown;
  }
) {
  if (!ObjectId.isValid(id)) throw new Error('Campaign not found');
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.title !== undefined) patch.title = String(input.title).trim().slice(0, 80);
  if (input.description !== undefined) patch.description = String(input.description).trim().slice(0, 240);
  if (input.active !== undefined) patch.active = Boolean(input.active);
  if (input.endsAt !== undefined) patch.endsAt = input.endsAt || null;
  if (input.tasks !== undefined) {
    const tasks = sanitizeTasks(input.tasks);
    if (tasks.length === 0) throw new Error('Add at least one task with points');
    patch.tasks = tasks;
  }
  const { db } = await connectToDatabase();
  const result = await db.collection('game_campaigns').updateOne({ _id: new ObjectId(id) }, { $set: patch });
  if (!result.matchedCount) throw new Error('Campaign not found');
}

export async function deleteCampaign(id: string) {
  if (!ObjectId.isValid(id)) throw new Error('Campaign not found');
  const { db } = await connectToDatabase();
  await db.collection('game_campaigns').deleteOne({ _id: new ObjectId(id) });
}

export async function listGameActivity(limit = 40) {
  const { db } = await connectToDatabase();
  const plays = await db.collection('game_plays').find({}).sort({ createdAt: -1 }).limit(limit).toArray();
  const ids = plays.map(play => play.customerId).filter(Boolean);
  const customers = ids.length
    ? await db.collection('customers').find({ _id: { $in: ids } }).project({ name: 1, email: 1 }).toArray()
    : [];
  const names = new Map(customers.map(customer => [customer._id.toString(), customer]));
  return plays.map(play => {
    const customer = names.get(play.customerId?.toString?.() || '');
    return {
      _id: play._id.toString(),
      kind: play.kind,
      points: play.points || 0,
      note: play.note || '',
      label: play.label || '',
      streak: play.streak || null,
      createdAt: play.createdAt,
      customer: customer?.name || customer?.email || 'Customer',
      email: customer?.email || '',
    };
  });
}
