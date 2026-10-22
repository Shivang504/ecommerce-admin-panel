import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';

const DEFAULT_PLACEMENTS = [
  {
    key: 'home_sponsored',
    name: 'Home page – Sponsored products',
    type: 'featured_product',
    description: 'Product card in the Sponsored row on the home page.',
    pricePerDay: 199,
    slots: 8,
    minDays: 1,
    maxDays: 30,
    active: true,
  },
  {
    key: 'listing_sponsored',
    name: 'Product listing – Sponsored',
    type: 'featured_product',
    description: 'Product card above the results on the product listing and search page.',
    pricePerDay: 149,
    slots: 4,
    minDays: 1,
    maxDays: 30,
    active: true,
  },
  {
    key: 'home_banner',
    name: 'Home page – Banner',
    type: 'banner',
    description: 'Wide banner below the home page hero.',
    pricePerDay: 499,
    slots: 3,
    minDays: 1,
    maxDays: 30,
    active: true,
    bannerSize: '1600 × 400 px',
  },
  {
    key: 'listing_banner',
    name: 'Product listing – Top banner',
    type: 'banner',
    description: 'Wide banner at the top of the product listing and search page.',
    pricePerDay: 299,
    slots: 2,
    minDays: 1,
    maxDays: 30,
    active: true,
    bannerSize: '1600 × 300 px',
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;

export function indiaToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function dayDiff(start: string, end: string) {
  const toUtc = (day: string) => {
    const [year, month, date] = day.split('-').map(Number);
    return Date.UTC(year, month - 1, date);
  };
  return Math.round((toUtc(end) - toUtc(start)) / DAY_MS) + 1;
}

function money(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function liveState(booking: { status: string; startDate: string; endDate: string }, today = indiaToday()) {
  if (booking.status !== 'approved') return booking.status;
  if (today < booking.startDate) return 'scheduled';
  if (today > booking.endDate) return 'completed';
  return 'live';
}

export async function ensurePlacements() {
  const { db } = await connectToDatabase();
  if ((await db.collection('ad_placements').countDocuments()) > 0) return;
  await db
    .collection('ad_placements')
    .insertMany(DEFAULT_PLACEMENTS.map(placement => ({ ...placement, createdAt: new Date(), updatedAt: new Date() })));
}

export async function listPlacements() {
  await ensurePlacements();
  const { db } = await connectToDatabase();
  const docs = await db.collection('ad_placements').find({}).sort({ type: 1, pricePerDay: -1 }).toArray();
  return docs.map(doc => ({ ...doc, _id: doc._id.toString() }));
}

export async function updatePlacement(
  id: string,
  input: { name?: string; description?: string; pricePerDay?: number; slots?: number; minDays?: number; maxDays?: number; active?: boolean }
) {
  if (!ObjectId.isValid(id)) throw new Error('Placement not found');
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) patch.name = String(input.name).trim().slice(0, 80);
  if (input.description !== undefined) patch.description = String(input.description).trim().slice(0, 200);
  if (input.pricePerDay !== undefined) patch.pricePerDay = Math.max(0, money(input.pricePerDay));
  if (input.slots !== undefined) patch.slots = Math.max(1, Math.floor(Number(input.slots) || 1));
  if (input.minDays !== undefined) patch.minDays = Math.max(1, Math.floor(Number(input.minDays) || 1));
  if (input.maxDays !== undefined) patch.maxDays = Math.max(1, Math.floor(Number(input.maxDays) || 1));
  if (input.active !== undefined) patch.active = Boolean(input.active);
  if (patch.minDays && patch.maxDays && (patch.minDays as number) > (patch.maxDays as number)) {
    throw new Error('Min days cannot be more than max days');
  }
  const { db } = await connectToDatabase();
  const result = await db.collection('ad_placements').updateOne({ _id: new ObjectId(id) }, { $set: patch });
  if (!result.matchedCount) throw new Error('Placement not found');
}

export async function listBookings(status?: string) {
  const { db } = await connectToDatabase();
  const filter = status && status !== 'all' ? { status } : {};
  const docs = await db
    .collection('ad_bookings')
    .find(filter, { projection: { 'banner.imageUrl': 0 } })
    .sort({ createdAt: -1 })
    .limit(300)
    .toArray();
  const today = indiaToday();
  return docs.map(doc => ({ ...doc, _id: doc._id.toString(), state: liveState(doc as any, today) }));
}

export async function getAdSummary() {
  const { db } = await connectToDatabase();
  const today = indiaToday();
  const [rows] = await db
    .collection('ad_bookings')
    .aggregate([
      {
        $group: {
          _id: null,
          bookings: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          live: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$status', 'approved'] }, { $lte: ['$startDate', today] }, { $gte: ['$endDate', today] }] },
                1,
                0,
              ],
            },
          },
          revenue: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$paymentStatus', 'paid'] }, { $in: ['$status', ['approved', 'ended', 'pending']] }] },
                '$amount',
                0,
              ],
            },
          },
          impressions: { $sum: { $ifNull: ['$impressions', 0] } },
          clicks: { $sum: { $ifNull: ['$clicks', 0] } },
        },
      },
    ])
    .toArray();
  return {
    bookings: rows?.bookings || 0,
    pending: rows?.pending || 0,
    live: rows?.live || 0,
    revenue: money(rows?.revenue || 0),
    impressions: rows?.impressions || 0,
    clicks: rows?.clicks || 0,
  };
}

async function refundIfWallet(doc: any) {
  if (doc.paymentMethod !== 'wallet' || doc.paymentStatus !== 'paid' || !ObjectId.isValid(String(doc.vendorId))) return;
  const { db } = await connectToDatabase();
  await db.collection('vendors').updateOne(
    { _id: new ObjectId(String(doc.vendorId)) },
    { $inc: { walletBalance: doc.amount, totalAdSpend: -doc.amount }, $set: { updatedAt: new Date() } }
  );
  await db.collection('ad_bookings').updateOne({ _id: doc._id }, { $set: { paymentStatus: 'refunded', refundedAt: new Date() } });
}

export async function updateBooking(
  id: string,
  input: { action: 'approve' | 'reject' | 'mark_paid' | 'end' | 'dates'; note?: string; startDate?: string; endDate?: string },
  adminEmail?: string
) {
  if (!ObjectId.isValid(id)) throw new Error('Booking not found');
  const { db } = await connectToDatabase();
  const doc = await db.collection('ad_bookings').findOne({ _id: new ObjectId(id) });
  if (!doc) throw new Error('Booking not found');
  const note = input.note ? String(input.note).trim().slice(0, 200) : undefined;
  const base = { updatedAt: new Date(), updatedBy: adminEmail, ...(note ? { adminNote: note } : {}) };

  if (input.action === 'approve') {
    if (doc.status !== 'pending') throw new Error('Only a pending booking can be approved');
    await db.collection('ad_bookings').updateOne({ _id: doc._id }, { $set: { ...base, status: 'approved', approvedAt: new Date() } });
    return;
  }
  if (input.action === 'reject') {
    if (doc.status !== 'pending' && doc.status !== 'approved') throw new Error('This booking is already closed');
    await db.collection('ad_bookings').updateOne({ _id: doc._id }, { $set: { ...base, status: 'rejected', rejectedAt: new Date() } });
    await refundIfWallet(doc);
    return;
  }
  if (input.action === 'mark_paid') {
    if (doc.paymentStatus === 'paid') throw new Error('Already paid');
    await db.collection('ad_bookings').updateOne({ _id: doc._id }, { $set: { ...base, paymentStatus: 'paid', paidAt: new Date() } });
    return;
  }
  if (input.action === 'end') {
    if (doc.status !== 'approved') throw new Error('Only an approved booking can be ended');
    const today = indiaToday();
    const endDate = today < doc.endDate ? (today < doc.startDate ? doc.startDate : today) : doc.endDate;
    await db.collection('ad_bookings').updateOne(
      { _id: doc._id },
      { $set: { ...base, status: 'ended', endedAt: new Date(), endDate, days: dayDiff(doc.startDate, endDate) } }
    );
    return;
  }
  if (input.action === 'dates') {
    const startDate = String(input.startDate || '');
    const endDate = String(input.endDate || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < startDate) {
      throw new Error('Pick a valid start and end date');
    }
    await db.collection('ad_bookings').updateOne(
      { _id: doc._id },
      { $set: { ...base, startDate, endDate, days: dayDiff(startDate, endDate) } }
    );
    return;
  }
  throw new Error('Unknown action');
}

export async function deleteClosedBooking(id: string) {
  if (!ObjectId.isValid(id)) throw new Error('Booking not found');
  const { db } = await connectToDatabase();
  const result = await db
    .collection('ad_bookings')
    .deleteOne({ _id: new ObjectId(id), status: { $in: ['rejected', 'cancelled', 'ended'] } });
  if (!result.deletedCount) throw new Error('Only rejected, cancelled, or ended bookings can be deleted');
}

export async function getBookingImage(id: string) {
  if (!ObjectId.isValid(id)) return null;
  const { db } = await connectToDatabase();
  const doc = await db.collection('ad_bookings').findOne({ _id: new ObjectId(id) }, { projection: { 'banner.imageUrl': 1 } });
  return (doc?.banner?.imageUrl as string) || null;
}
