import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';

const TIME_ZONE = 'Asia/Kolkata';
const LOST_STATUSES = new Set(['cancelled', 'refunded', 'returned']);
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const partsFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
  weekday: 'short',
});

type OrderDoc = {
  _id: ObjectId;
  createdAt: Date;
  customerId?: ObjectId | string;
  orderStatus?: string;
  items?: Array<{ productId?: ObjectId | string; productName?: string; quantity?: number; price?: number }>;
  pricing?: { subtotal?: number; discount?: number; total?: number; loyaltyDiscount?: number; walletDiscount?: number };
  coupon?: { code?: string; discountAmount?: number };
  referral?: { code?: string; influencerName?: string; commissionAmount?: number };
  loyalty?: { pointsRedeemed?: number; discount?: number };
  payment?: { paymentMethod?: string };
  shippingAddress?: { city?: string; state?: string };
};

function istParts(date: Date) {
  const map: Record<string, string> = {};
  for (const part of partsFormat.formatToParts(date)) map[part.type] = part.value;
  return {
    day: `${map.year}-${map.month}-${map.day}`,
    month: `${map.year}-${map.month}`,
    weekday: WEEKDAYS.indexOf(map.weekday),
    hour: Number(map.hour) % 24,
  };
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function titleCase(value?: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function counted(order: OrderDoc) {
  return !LOST_STATUSES.has(String(order.orderStatus || ''));
}

function orderTotal(order: OrderDoc) {
  return Number(order.pricing?.total || 0);
}

function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number);
  return `${MONTHS[month - 1]} ${year}`;
}

function monthKeysBack(count: number, now = new Date()) {
  const current = istParts(now).month;
  const [year, month] = current.split('-').map(Number);
  const keys: string[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(year, month - 1 - offset, 1));
    keys.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

/** Holt linear smoothing; returns the next `horizon` values, never negative. */
export function holtForecast(series: number[], horizon: number, alpha = 0.5, beta = 0.3) {
  if (series.length === 0) return Array(horizon).fill(0);
  let level = series[0];
  let trend = series.length > 1 ? series[1] - series[0] : 0;
  for (let index = 1; index < series.length; index += 1) {
    const previousLevel = level;
    level = alpha * series[index] + (1 - alpha) * (level + trend);
    trend = beta * (level - previousLevel) + (1 - beta) * trend;
  }
  return Array.from({ length: horizon }, (_, step) => Math.max(0, level + trend * (step + 1)));
}

function weekIndex(date: Date, end: Date, weeks: number) {
  const age = Math.floor((end.getTime() - date.getTime()) / (7 * DAY_MS));
  return weeks - 1 - age;
}

function productStock(product: any) {
  if (Array.isArray(product?.variants) && product.variants.length > 0) {
    const total = product.variants.reduce((sum: number, variant: any) => sum + Number(variant?.stock || 0), 0);
    if (total > 0 || product.stock == null) return total;
  }
  return Number(product?.stock || 0);
}

function segmentFor(recencyDays: number, frequency: number, monetary: number, medianSpend: number) {
  if (frequency === 1 && recencyDays <= 30) return 'New';
  if (recencyDays <= 45 && frequency >= 3) return 'Champions';
  if (recencyDays <= 90 && (frequency >= 2 || monetary >= medianSpend * 1.5)) return 'Loyal';
  if (recencyDays <= 90) return 'Promising';
  if (recencyDays <= 180 && frequency >= 2) return 'At risk';
  if (recencyDays <= 180) return 'Needs attention';
  return 'Lost';
}

const SEGMENT_TIPS: Record<string, string> = {
  Champions: 'Reward with early access or loyalty bonus.',
  Loyal: 'Upsell bundles and ask for reviews.',
  Promising: 'Send a second-order coupon.',
  New: 'Welcome series and first review reward.',
  'At risk': 'Win-back coupon before they churn.',
  'Needs attention': 'Remind them with new arrivals.',
  Lost: 'Low-cost reactivation only.',
};

export async function getAdvancedAnalytics(options: { months?: number } = {}) {
  const months = Math.min(24, Math.max(3, Number(options.months || 12)));
  const now = new Date();
  const since = new Date(now.getTime() - months * 31 * DAY_MS);
  const { db } = await connectToDatabase();

  const orders = (await db
    .collection('orders')
    .find(
      { createdAt: { $gte: since, $lte: now } },
      {
        projection: {
          createdAt: 1,
          customerId: 1,
          orderStatus: 1,
          'items.productId': 1,
          'items.productName': 1,
          'items.quantity': 1,
          'items.price': 1,
          pricing: 1,
          'coupon.code': 1,
          'coupon.discountAmount': 1,
          'referral.code': 1,
          'referral.influencerName': 1,
          'referral.commissionAmount': 1,
          'loyalty.pointsRedeemed': 1,
          'loyalty.discount': 1,
          'payment.paymentMethod': 1,
          'shippingAddress.city': 1,
          'shippingAddress.state': 1,
        },
      }
    )
    .sort({ createdAt: 1 })
    .limit(50000)
    .toArray()) as unknown as OrderDoc[];

  const good = orders.filter(counted);

  // Seasonal trend
  const monthKeys = monthKeysBack(months, now);
  const monthMap = new Map(monthKeys.map(key => [key, { orders: 0, revenue: 0, units: 0, cancelled: 0 }]));
  const weekday = WEEKDAYS.map(name => ({ day: name, orders: 0, revenue: 0 }));
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour: `${String(hour).padStart(2, '0')}:00`, orders: 0 }));
  for (const order of orders) {
    const parts = istParts(new Date(order.createdAt));
    const bucket = monthMap.get(parts.month);
    if (!counted(order)) {
      if (bucket) bucket.cancelled += 1;
      continue;
    }
    const units = (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    if (bucket) {
      bucket.orders += 1;
      bucket.revenue += orderTotal(order);
      bucket.units += units;
    }
    weekday[parts.weekday].orders += 1;
    weekday[parts.weekday].revenue += orderTotal(order);
    hours[parts.hour].orders += 1;
  }
  const monthly = monthKeys.map(key => {
    const row = monthMap.get(key)!;
    return { month: monthLabel(key), key, orders: row.orders, units: row.units, cancelled: row.cancelled, revenue: round(row.revenue) };
  });
  const activeMonths = monthly.filter(row => row.orders > 0);
  const averageMonthRevenue = activeMonths.length
    ? activeMonths.reduce((sum, row) => sum + row.revenue, 0) / activeMonths.length
    : 0;
  const seasonalIndex = monthly.map(row => ({
    month: row.month,
    index: averageMonthRevenue > 0 ? round(row.revenue / averageMonthRevenue) : 0,
  }));
  const peakMonth = [...monthly].sort((a, b) => b.revenue - a.revenue)[0];
  const peakDay = [...weekday].sort((a, b) => b.orders - a.orders)[0];
  const peakHour = [...hours].sort((a, b) => b.orders - a.orders)[0];
  const lastThree = monthly.slice(-3).reduce((sum, row) => sum + row.revenue, 0);
  const priorThree = monthly.slice(-6, -3).reduce((sum, row) => sum + row.revenue, 0);
  const growth = priorThree > 0 ? round(((lastThree - priorThree) / priorThree) * 100, 1) : null;
  const revenueForecast = holtForecast(monthly.map(row => row.revenue), 3).map((value, index) => {
    const [year, month] = monthKeys[monthKeys.length - 1].split('-').map(Number);
    const date = new Date(Date.UTC(year, month + index, 1));
    return {
      month: `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`,
      revenue: round(value),
    };
  });

  // Demand forecast (12 weeks of history, 4 weeks ahead)
  const weeks = 12;
  const weekStart = new Date(now.getTime() - weeks * 7 * DAY_MS);
  const productWeeks = new Map<string, { name: string; series: number[]; revenue: number }>();
  for (const order of good) {
    const created = new Date(order.createdAt);
    if (created < weekStart) continue;
    const slot = weekIndex(created, now, weeks);
    if (slot < 0 || slot >= weeks) continue;
    for (const item of order.items || []) {
      const id = String(item.productId || '');
      if (!id) continue;
      const row = productWeeks.get(id) || { name: item.productName || 'Product', series: Array(weeks).fill(0), revenue: 0 };
      row.series[slot] += Number(item.quantity || 0);
      row.revenue += Number(item.price || 0) * Number(item.quantity || 0);
      productWeeks.set(id, row);
    }
  }
  const productIds = [...productWeeks.keys()].filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id));
  const productDocs = productIds.length
    ? await db
        .collection('products')
        .find({ _id: { $in: productIds } })
        .project({ name: 1, sku: 1, stock: 1, variants: 1, category: 1 })
        .toArray()
    : [];
  const productById = new Map(productDocs.map(doc => [doc._id.toString(), doc]));
  const demand = [...productWeeks.entries()]
    .map(([id, row]) => {
      const product = productById.get(id);
      const forecastWeeks = holtForecast(row.series, 4);
      const next4 = forecastWeeks.reduce((sum, value) => sum + value, 0);
      const sold = row.series.reduce((sum, value) => sum + value, 0);
      const recent = row.series.slice(-4).reduce((sum, value) => sum + value, 0);
      const earlier = row.series.slice(-8, -4).reduce((sum, value) => sum + value, 0);
      const stock = productStock(product);
      const dailyRate = next4 / 28;
      const daysCover = dailyRate > 0 ? Math.floor(stock / dailyRate) : null;
      const reorderQty = Math.max(0, Math.ceil(next4 + forecastWeeks[0] - stock));
      const trend = earlier === 0 ? (recent > 0 ? 'Rising' : 'Flat') : recent > earlier * 1.15 ? 'Rising' : recent < earlier * 0.85 ? 'Falling' : 'Steady';
      return {
        productId: id,
        name: product?.name || row.name,
        sku: product?.sku || '',
        sold12w: sold,
        last4w: recent,
        forecast4w: round(next4, 1),
        stock,
        daysCover,
        reorderQty,
        trend,
        risk: daysCover !== null && daysCover <= 14 ? 'Stock out soon' : stock === 0 ? 'Out of stock' : 'OK',
        weekly: row.series,
      };
    })
    .sort((a, b) => b.forecast4w - a.forecast4w)
    .slice(0, 40);

  // Customer behaviour
  const firstOrderAll = await db
    .collection('orders')
    .aggregate([
      { $match: { customerId: { $exists: true, $ne: null }, orderStatus: { $nin: [...LOST_STATUSES] } } },
      {
        $group: {
          _id: '$customerId',
          first: { $min: '$createdAt' },
          last: { $max: '$createdAt' },
          orders: { $sum: 1 },
          spend: { $sum: { $ifNull: ['$pricing.total', 0] } },
        },
      },
    ])
    .toArray();
  const spends = firstOrderAll.map(row => Number(row.spend || 0)).sort((a, b) => a - b);
  const medianSpend = spends.length ? spends[Math.floor(spends.length / 2)] : 0;
  const segmentCounts = new Map<string, { customers: number; revenue: number }>();
  for (const row of firstOrderAll) {
    const recencyDays = Math.floor((now.getTime() - new Date(row.last).getTime()) / DAY_MS);
    const name = segmentFor(recencyDays, row.orders, Number(row.spend || 0), medianSpend);
    const bucket = segmentCounts.get(name) || { customers: 0, revenue: 0 };
    bucket.customers += 1;
    bucket.revenue += Number(row.spend || 0);
    segmentCounts.set(name, bucket);
  }
  const segments = Object.keys(SEGMENT_TIPS)
    .map(name => ({
      segment: name,
      customers: segmentCounts.get(name)?.customers || 0,
      revenue: round(segmentCounts.get(name)?.revenue || 0),
      action: SEGMENT_TIPS[name],
    }))
    .filter(row => row.customers > 0);

  const firstById = new Map(firstOrderAll.map(row => [String(row._id), new Date(row.first)]));
  const customersInRange = new Map<string, { orders: number; spend: number; dates: number[] }>();
  for (const order of good) {
    const id = String(order.customerId || '');
    if (!id) continue;
    const row = customersInRange.get(id) || { orders: 0, spend: 0, dates: [] };
    row.orders += 1;
    row.spend += orderTotal(order);
    row.dates.push(new Date(order.createdAt).getTime());
    customersInRange.set(id, row);
  }
  let newCustomers = 0;
  let returningCustomers = 0;
  const gaps: number[] = [];
  for (const [id, row] of customersInRange) {
    const first = firstById.get(id);
    if (first && first >= since) newCustomers += 1;
    else returningCustomers += 1;
    row.dates.sort((a, b) => a - b);
    for (let index = 1; index < row.dates.length; index += 1) {
      gaps.push((row.dates[index] - row.dates[index - 1]) / DAY_MS);
    }
  }
  const repeatBuyers = firstOrderAll.filter(row => row.orders >= 2).length;
  const revenue = good.reduce((sum, order) => sum + orderTotal(order), 0);
  const newByMonth = monthKeys.map(key => ({ month: monthLabel(key), newCustomers: 0, returning: 0 }));
  const monthPosition = new Map(monthKeys.map((key, index) => [key, index]));
  const seenInMonth = new Set<string>();
  for (const order of good) {
    const id = String(order.customerId || '');
    if (!id) continue;
    const key = istParts(new Date(order.createdAt)).month;
    const position = monthPosition.get(key);
    if (position === undefined || seenInMonth.has(`${id}:${key}`)) continue;
    seenInMonth.add(`${id}:${key}`);
    const first = firstById.get(id);
    if (first && istParts(first).month === key) newByMonth[position].newCustomers += 1;
    else newByMonth[position].returning += 1;
  }
  const cityMap = new Map<string, { orders: number; revenue: number }>();
  for (const order of good) {
    const city =
      [titleCase(order.shippingAddress?.city), titleCase(order.shippingAddress?.state)].filter(Boolean).join(', ') || 'Unknown';
    const row = cityMap.get(city) || { orders: 0, revenue: 0 };
    row.orders += 1;
    row.revenue += orderTotal(order);
    cityMap.set(city, row);
  }
  const topCities = [...cityMap.entries()]
    .map(([city, row]) => ({ city, orders: row.orders, revenue: round(row.revenue) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Funnel from page views
  const views = await db
    .collection('page_views')
    .find({ createdAt: { $gte: since, $lte: now } }, { projection: { path: 1, sessionId: 1, source: 1, medium: 1, campaign: 1 } })
    .limit(200000)
    .toArray();
  const sessions = new Map<string, Set<string>>();
  let anonymous = 0;
  for (const view of views) {
    const path = String(view.path || '/');
    const stage = path.startsWith('/order-success')
      ? 'order'
      : path.startsWith('/checkout')
        ? 'checkout'
        : path.startsWith('/cart')
          ? 'cart'
          : path.startsWith('/products/') || path.startsWith('/product/')
            ? 'product'
            : 'visit';
    const key = view.sessionId ? String(view.sessionId) : `anon-${anonymous++}`;
    const set = sessions.get(key) || new Set<string>();
    set.add('visit');
    set.add(stage);
    sessions.set(key, set);
  }
  const stageCount = (stage: string) => [...sessions.values()].filter(set => set.has(stage)).length;
  const funnelVisits = Math.max(stageCount('visit'), 1);
  const funnel = [
    { stage: 'Visited', sessions: stageCount('visit') },
    { stage: 'Viewed a product', sessions: stageCount('product') },
    { stage: 'Opened cart', sessions: stageCount('cart') },
    { stage: 'Reached checkout', sessions: stageCount('checkout') },
    { stage: 'Placed order (page)', sessions: stageCount('order') },
  ].map(row => ({ ...row, rate: round((row.sessions / funnelVisits) * 100, 1) }));
  const trackedSessions = views.filter(view => view.sessionId).length > 0;

  // Marketing insights
  const couponMap = new Map<string, { orders: number; discount: number; revenue: number }>();
  const influencerMap = new Map<string, { orders: number; revenue: number; commission: number }>();
  const paymentMap = new Map<string, { orders: number; revenue: number }>();
  let discountTotal = 0;
  let loyaltyPoints = 0;
  let loyaltyDiscount = 0;
  let couponOrders = 0;
  for (const order of good) {
    const total = orderTotal(order);
    if (order.coupon?.code) {
      couponOrders += 1;
      const code = order.coupon.code.toUpperCase();
      const row = couponMap.get(code) || { orders: 0, discount: 0, revenue: 0 };
      row.orders += 1;
      row.discount += Number(order.coupon.discountAmount || 0);
      row.revenue += total;
      couponMap.set(code, row);
    }
    if (order.referral?.code) {
      const name = order.referral.influencerName || order.referral.code;
      const row = influencerMap.get(name) || { orders: 0, revenue: 0, commission: 0 };
      row.orders += 1;
      row.revenue += total;
      row.commission += Number(order.referral.commissionAmount || 0);
      influencerMap.set(name, row);
    }
    const method = String(order.payment?.paymentMethod || 'unknown').toUpperCase();
    const pay = paymentMap.get(method) || { orders: 0, revenue: 0 };
    pay.orders += 1;
    pay.revenue += total;
    paymentMap.set(method, pay);
    discountTotal += Number(order.pricing?.discount || 0);
    loyaltyPoints += Number(order.loyalty?.pointsRedeemed || 0);
    loyaltyDiscount += Number(order.loyalty?.discount || order.pricing?.loyaltyDiscount || 0);
  }
  const sourceMap = new Map<string, { visits: number; sessions: Set<string> }>();
  for (const view of views) {
    const source = view.source ? String(view.source) : 'not tracked';
    const medium = view.medium ? ` / ${view.medium}` : '';
    const key = `${source}${medium}`;
    const row = sourceMap.get(key) || { visits: 0, sessions: new Set<string>() };
    row.visits += 1;
    if (view.sessionId) row.sessions.add(String(view.sessionId));
    sourceMap.set(key, row);
  }
  const plays = await db
    .collection('game_plays')
    .aggregate([
      { $match: { createdAt: { $gte: since, $lte: now } } },
      { $group: { _id: '$kind', plays: { $sum: 1 }, points: { $sum: { $ifNull: ['$points', 0] } }, players: { $addToSet: '$customerId' } } },
      { $project: { plays: 1, points: 1, players: { $size: '$players' } } },
    ])
    .toArray();

  const insights: string[] = [];
  if (peakMonth?.revenue > 0) insights.push(`Best month in range: ${peakMonth.month} (INR ${round(peakMonth.revenue).toLocaleString('en-IN')}).`);
  if (peakDay?.orders > 0) insights.push(`Most orders land on ${peakDay.day}. Schedule campaigns the day before.`);
  if (peakHour?.orders > 0) insights.push(`Peak order hour is ${peakHour.hour} IST. Send pushes and emails about an hour earlier.`);
  if (growth !== null) insights.push(`Revenue last 3 months vs the 3 before: ${growth > 0 ? '+' : ''}${growth}%.`);
  const stockRisk = demand.filter(row => row.risk !== 'OK').length;
  if (stockRisk) insights.push(`${stockRisk} selling product(s) may run out within 2 weeks. See Demand forecast.`);
  const atRisk = segments.find(row => row.segment === 'At risk');
  if (atRisk) insights.push(`${atRisk.customers} repeat customer(s) have gone quiet for 3 to 6 months. Send a win-back coupon.`);
  if (good.length) insights.push(`${round((couponOrders / good.length) * 100, 1)}% of orders used a coupon.`);
  if (!trackedSessions) insights.push('Traffic source tracking starts with this release. Source and funnel numbers fill in from now on.');

  return {
    generatedAt: now.toISOString(),
    months,
    summary: {
      orders: good.length,
      cancelled: orders.length - good.length,
      revenue: round(revenue),
      aov: good.length ? round(revenue / good.length) : 0,
      customers: customersInRange.size,
      newCustomers,
      returningCustomers,
      repeatRate: firstOrderAll.length ? round((repeatBuyers / firstOrderAll.length) * 100, 1) : 0,
      avgDaysBetweenOrders: gaps.length ? round(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length, 1) : null,
      growth,
    },
    insights,
    demand,
    seasonal: {
      monthly,
      seasonalIndex,
      weekday: weekday.map(row => ({ ...row, revenue: round(row.revenue) })),
      hours,
      revenueForecast,
      enoughHistory: activeMonths.length >= 6,
    },
    customers: {
      segments,
      newByMonth,
      topCities,
      funnel,
      trackedSessions,
    },
    marketing: {
      coupons: [...couponMap.entries()]
        .map(([code, row]) => ({ code, orders: row.orders, discount: round(row.discount), revenue: round(row.revenue) }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 15),
      influencers: [...influencerMap.entries()]
        .map(([name, row]) => ({ name, orders: row.orders, revenue: round(row.revenue), commission: round(row.commission) }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 15),
      payments: [...paymentMap.entries()]
        .map(([method, row]) => ({ method, orders: row.orders, revenue: round(row.revenue) }))
        .sort((a, b) => b.revenue - a.revenue),
      sources: [...sourceMap.entries()]
        .map(([source, row]) => ({ source, visits: row.visits, sessions: row.sessions.size }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 15),
      games: plays.map(row => ({ kind: String(row._id), plays: row.plays, players: row.players, points: row.points })),
      discountTotal: round(discountTotal),
      loyaltyPoints: round(loyaltyPoints),
      loyaltyDiscount: round(loyaltyDiscount),
      discountShare: revenue > 0 ? round((discountTotal / (revenue + discountTotal)) * 100, 1) : 0,
    },
  };
}

export type AdvancedAnalytics = Awaited<ReturnType<typeof getAdvancedAnalytics>>;
