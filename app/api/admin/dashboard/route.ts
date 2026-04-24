import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getUserFromRequest, isVendor } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export const revalidate = 60; // Cache for 60 seconds

const MONTH_KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

/** Calendar month in local server time. Defaults to current month if param missing or invalid. */
function resolveDashboardMonth(monthParam: string | null) {
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth();

  if (monthParam && MONTH_KEY_RE.test(monthParam)) {
    const [ys, ms] = monthParam.split('-').map(Number);
    y = ys;
    m = ms - 1;
    if (m < 0 || m > 11) {
      y = now.getFullYear();
      m = now.getMonth();
    }
  }

  const monthStart = new Date(y, m, 1, 0, 0, 0, 0);
  const monthEnd = new Date(y, m + 1, 0, 23, 59, 59, 999);

  const prevM = m === 0 ? 11 : m - 1;
  const prevY = m === 0 ? y - 1 : y;
  const prevMonthStart = new Date(prevY, prevM, 1, 0, 0, 0, 0);
  const prevMonthEnd = new Date(prevY, prevM + 1, 0, 23, 59, 59, 999);

  const monthKey = `${y}-${pad2(m + 1)}`;
  const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const nowStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const canGoNext = monthStart < nowStart;

  return { y, m, monthStart, monthEnd, prevMonthStart, prevMonthEnd, monthKey, monthLabel, canGoNext };
}

/**
 * Optimized Dashboard API
 * Fetches all dashboard data in a single request with proper projections and aggregations
 * Query: ?month=YYYY-MM (optional) — scopes order-based analytics to that calendar month
 */
export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const currentUser = getUserFromRequest(request);
    const monthParam = request.nextUrl.searchParams.get('month');
    const { y, m, monthStart, monthEnd, prevMonthStart, prevMonthEnd, monthKey, monthLabel, canGoNext } =
      resolveDashboardMonth(monthParam);

    // Build filters based on user role
    const productFilter: any = { status: { $in: ['active', 'Active', 'Published'] } };
    const orderFilter: any = {};
    const vendorFilter: any = {};

    if (currentUser && isVendor(currentUser)) {
      productFilter.vendorId = currentUser.id;
      orderFilter['items.vendorId'] = currentUser.id;
      vendorFilter._id = new ObjectId(currentUser.id);
    }

    const orderInMonth = { ...orderFilter, createdAt: { $gte: monthStart, $lte: monthEnd } };
    const orderInPrevMonth = { ...orderFilter, createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd } };

    // Execute all queries in parallel for better performance
    const [
      // Basic stats
      totalOrders,
      pendingOrders,
      cancelledOrders,
      returnedItems,
      totalProducts,
      totalCustomers,
      totalVendors,
      
      // Revenue data (last 7 months)
      revenueData,
      
      // Category distribution
      categoryDistribution,
      
      // Top vendors/suppliers
      topVendors,
      
      // Recent orders
      recentOrders,
      
      // Top products by sales
      topProducts,

      // Previous calendar month (relative to selected month) for KPI comparisons
      prevMonthStats,
    ] = await Promise.all([
      // Total orders in selected month
      db.collection('orders').countDocuments(orderInMonth),

      // Pending orders in selected month
      db.collection('orders').countDocuments({
        ...orderInMonth,
        orderStatus: { $in: ['pending', 'processing', 'confirmed'] },
      }),

      // Cancelled orders in selected month
      db.collection('orders').countDocuments({
        ...orderInMonth,
        orderStatus: 'cancelled',
      }),

      // Orders with returned line items in selected month
      db.collection('orders').countDocuments({
        ...orderInMonth,
        'items.itemStatus': 'returned',
      }),
      
      // Total products
      db.collection('products').countDocuments(productFilter),
      
      // Total customers (only for admins)
      currentUser && isVendor(currentUser)
        ? Promise.resolve(0)
        : db.collection('users').countDocuments({ role: 'customer' }).catch(() => 0),
      
      // Total vendors (only for admins)
      currentUser && isVendor(currentUser)
        ? Promise.resolve(0)
        : db.collection('users').countDocuments({ role: 'vendor' }).catch(() => 0),
      
      // Revenue data for 7 months ending at selected month
      (async () => {
        const months = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date(y, m - i, 1);
          const revMonthStart = new Date(date.getFullYear(), date.getMonth(), 1);
          const revMonthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

          const monthRevenue = await db.collection('orders')
            .aggregate([
              {
                $match: {
                  ...orderFilter,
                  createdAt: { $gte: revMonthStart, $lte: revMonthEnd },
                  orderStatus: { $ne: 'cancelled' }
                }
              },
              {
                $group: {
                  _id: null,
                  income: { $sum: '$total' },
                  expense: { $sum: { $ifNull: ['$shipping', 0] } }
                }
              }
            ])
            .toArray();
          
          const monthName = date.toLocaleDateString('en-US', { month: 'short' });
          const yearShort = String(date.getFullYear()).slice(-2);
          months.push({
            month: `${monthName} '${yearShort}`,
            income: monthRevenue[0]?.income || 0,
            expense: monthRevenue[0]?.expense || 0
          });
        }
        return months;
      })(),
      
      // Category distribution (products by category)
      db.collection('products')
        .aggregate([
          { $match: productFilter },
          {
            $group: {
              _id: '$category',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ])
        .toArray()
        .then(async (categories) => {
          // Get category names
          const categoryIds = categories
            .map(c => c._id)
            .filter(id => id)
            .map(id => ObjectId.isValid(id) ? new ObjectId(id) : id);
          
          if (categoryIds.length === 0) return [];
          
          const categoryDocs = await db.collection('categories')
            .find({ _id: { $in: categoryIds } })
            .project({ _id: 1, name: 1 })
            .toArray();
          
          const categoryMap = new Map(categoryDocs.map(c => [c._id.toString(), c.name]));
          
          const total = categories.reduce((sum, c) => sum + c.count, 0);
          const colors = ['#a5f3fc', '#86efac', '#16a34a', '#fbbf24', '#f87171', '#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#fb7185'];
          
          return categories.map((cat, index) => ({
            name: categoryMap.get(cat._id?.toString() || '') || 'Uncategorized',
            value: total > 0 ? Math.round((cat.count / total) * 100) : 0,
            color: colors[index % colors.length],
            count: cat.count
          }));
        }),
      
      // Top vendors/suppliers in selected month
      db.collection('orders')
        .aggregate([
          {
            $match: {
              ...orderFilter,
              orderStatus: { $ne: 'cancelled' },
              createdAt: { $gte: monthStart, $lte: monthEnd },
            }
          },
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.vendorId',
              orderCount: { $sum: 1 },
              revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
            }
          },
          { $sort: { revenue: -1 } },
          { $limit: 5 }
        ])
        .toArray()
        .then(async (vendors) => {
          if (vendors.length === 0) return [];
          
          const vendorIds = vendors
            .map(v => v._id)
            .filter(id => id && ObjectId.isValid(id))
            .map(id => new ObjectId(id));
          
          if (vendorIds.length === 0) return [];
          
          const vendorDocs = await db.collection('users')
            .find({ _id: { $in: vendorIds }, role: 'vendor' })
            .project({ _id: 1, name: 1, email: 1 })
            .toArray();
          
          const vendorMap = new Map(vendorDocs.map(v => [v._id.toString(), v]));
          
          return vendors.map(v => {
            const vendor = vendorMap.get(v._id?.toString() || '');
            return {
              supplier: vendor?.name || 'Unknown Vendor',
              products: `${v.orderCount} orders`,
              nextShipment: 'N/A', // Can be calculated from pending orders
              contact: vendor?.email || 'N/A',
              rating: 5, // Can be fetched from reviews
              revenue: v.revenue || 0
            };
          });
        }),
      
      // Recent orders in selected month (last 10)
      db.collection('orders')
        .find(orderInMonth)
        .sort({ createdAt: -1 })
        .limit(10)
        .project({
          _id: 1,
          orderNumber: 1,
          customerName: 1,
          customerEmail: 1,
          items: { $slice: ['$items', 1] },
          total: 1,
          orderStatus: 1,
          createdAt: 1
        })
        .toArray()
        .then(orders => orders.map(order => ({
          id: order.orderNumber || order._id.toString().slice(-6).toUpperCase(),
          customer: order.customerName || order.customerEmail || 'Unknown',
          product: order.items?.[0]?.name || 'Multiple items',
          price: order.total || 0,
          status: order.orderStatus || 'pending'
        }))),
      
      // Top products by sales in selected month
      db.collection('orders')
        .aggregate([
          {
            $match: {
              ...orderFilter,
              orderStatus: { $ne: 'cancelled' },
              createdAt: { $gte: monthStart, $lte: monthEnd },
            }
          },
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.productId',
              name: { $first: '$items.name' },
              totalSold: { $sum: '$items.quantity' },
              revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
            }
          },
          { $sort: { totalSold: -1 } },
          { $limit: 5 }
        ])
        .toArray()
        .then(products => products.map(p => ({
          name: p.name || 'Unknown Product',
          category: 'Product', // Can be fetched from product document
          price: `₹${p.totalSold ? (p.revenue / p.totalSold).toFixed(2) : '0.00'}`,
          icon: '📦',
          sales: p.totalSold
        }))),

      // Previous month totals for MoM comparison
      db.collection('orders')
        .aggregate([
          {
            $match: orderInPrevMonth,
          },
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              pendingOrders: {
                $sum: { $cond: [{ $in: ['$orderStatus', ['pending', 'processing', 'confirmed']] }, 1, 0] }
              },
              cancelledOrders: {
                $sum: { $cond: [{ $eq: ['$orderStatus', 'cancelled'] }, 1, 0] }
              },
              returnedOrdersCount: {
                $sum: {
                  $cond: [
                    {
                      $gt: [
                        {
                          $size: {
                            $filter: {
                              input: { $ifNull: ['$items', []] },
                              as: 'it',
                              cond: { $eq: ['$$it.itemStatus', 'returned'] },
                            },
                          },
                        },
                        0,
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            }
          }
        ])
        .toArray()
        .then(
          result =>
            result[0] || {
              totalOrders: 0,
              pendingOrders: 0,
              cancelledOrders: 0,
              returnedOrdersCount: 0,
            }
        ),
    ]);

    // MoM percentage changes vs previous calendar month
    const pct = (cur: number, prev: number) =>
      prev > 0 ? (((cur - prev) / prev) * 100).toFixed(1) : cur > 0 ? '100.0' : '0';

    const ordersChange = pct(totalOrders, prevMonthStats.totalOrders);
    const pendingChange = pct(pendingOrders, prevMonthStats.pendingOrders);
    const cancelledChange = pct(cancelledOrders, prevMonthStats.cancelledOrders);
    const returnedChange = pct(returnedItems, prevMonthStats.returnedOrdersCount);

    const fmtChange = (n: string) => `${n.startsWith('-') ? '' : '+'}${n}% vs previous month`;

    // Format stats with changes
    const stats = {
      totalOrders: {
        value: totalOrders.toLocaleString('en-IN'),
        change: fmtChange(ordersChange),
        trend: parseFloat(ordersChange) >= 0 ? 'up' : 'down'
      },
      pendingOrders: {
        value: pendingOrders.toLocaleString('en-IN'),
        change: fmtChange(pendingChange),
        trend: parseFloat(pendingChange) >= 0 ? 'up' : 'down'
      },
      cancelledOrders: {
        value: cancelledOrders.toLocaleString('en-IN'),
        change: fmtChange(cancelledChange),
        trend: parseFloat(cancelledChange) >= 0 ? 'up' : 'down'
      },
      returnedItems: {
        value: returnedItems.toLocaleString('en-IN'),
        change: fmtChange(returnedChange),
        trend: parseFloat(returnedChange) >= 0 ? 'up' : 'down'
      }
    };

    return NextResponse.json({
      stats,
      revenueData,
      categoryDistribution,
      topProducts: topVendors, // Using vendors as suppliers
      recentOrders,
      topDeals: topProducts, // Top products as deals
      filter: {
        monthKey,
        monthLabel,
        canGoNext,
      },
      summary: {
        totalProducts,
        totalCustomers,
        totalVendors,
        totalOrders
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    });
  } catch (error: any) {
    console.error('[Dashboard API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch dashboard data',
        detail: error?.message || String(error),
        stats: {
          totalOrders: { value: '0', change: '0%', trend: 'up' },
          pendingOrders: { value: '0', change: '0%', trend: 'up' },
          cancelledOrders: { value: '0', change: '0%', trend: 'up' },
          returnedItems: { value: '0', change: '0%', trend: 'up' }
        },
        revenueData: [],
        categoryDistribution: [],
        topProducts: [],
        recentOrders: [],
        topDeals: [],
        summary: { totalProducts: 0, totalCustomers: 0, totalVendors: 0, totalOrders: 0 }
      },
      { status: 500 }
    );
  }
}
