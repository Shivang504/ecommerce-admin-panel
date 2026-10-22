'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Button } from '@/components/ui/button';
import { downloadExcel, downloadPdf, type ReportRow, type ReportSheet } from '@/lib/report-export';
import type { AdvancedAnalytics } from '@/lib/analytics';

type Tab = 'overview' | 'demand' | 'seasonal' | 'customers' | 'marketing';

const TABS: Record<Tab, string> = {
  overview: 'Overview',
  demand: 'Demand forecast',
  seasonal: 'Seasonal trend',
  customers: 'Customer behaviour',
  marketing: 'Marketing insights',
};

const GREEN = '#0B8A6A';
const AMBER = '#F4B942';

function inr(value: number) {
  return `INR ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [months, setMonths] = useState(12);
  const [data, setData] = useState<AdvancedAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (range = months) => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/analytics?months=${range}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.error || 'Failed to load analytics');
      setData(json);
    } catch (err: any) {
      setError(err?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sheets = useMemo(() => buildSheets(tab, data), [tab, data]);
  const summaryRow: ReportRow[] = data
    ? [
        {
          Orders: data.summary.orders,
          Revenue: inr(data.summary.revenue),
          AOV: inr(data.summary.aov),
          Customers: data.summary.customers,
          'Repeat rate': `${data.summary.repeatRate}%`,
          Growth: data.summary.growth === null ? 'n/a' : `${data.summary.growth}%`,
        },
      ]
    : [];

  const exportFile = (kind: 'excel' | 'pdf') => {
    const name = `tryvvo-analytics-${tab}-${months}m`;
    if (kind === 'excel') {
      downloadExcel(name, sheets);
      return;
    }
    downloadPdf(name, { title: `${TABS[tab]} analytics`, range: `Last ${months} months`, summary: summaryRow, sheets });
  };

  return (
    <AdminLayout>
      <div className='space-y-6'>
        <div className='flex flex-wrap items-end justify-between gap-3'>
          <div>
            <h1 className='text-2xl font-bold text-slate-900'>Analytics</h1>
            <p className='mt-1 text-sm text-slate-500'>Demand forecast, seasonal trend, customer behaviour, and marketing insights.</p>
          </div>
          <div className='flex flex-wrap items-end gap-2'>
            <label className='text-xs text-slate-500'>
              History
              <select
                className='mt-1 block rounded-md border px-2 py-1.5 text-sm'
                value={months}
                onChange={e => {
                  const next = Number(e.target.value);
                  setMonths(next);
                  load(next);
                }}>
                <option value={3}>3 months</option>
                <option value={6}>6 months</option>
                <option value={12}>12 months</option>
                <option value={24}>24 months</option>
              </select>
            </label>
            <Button variant='outline' disabled={!data} onClick={() => exportFile('excel')}>
              Export Excel
            </Button>
            <Button variant='outline' disabled={!data} onClick={() => exportFile('pdf')}>
              Export PDF
            </Button>
          </div>
        </div>

        <div className='flex flex-wrap gap-2'>
          {(Object.keys(TABS) as Tab[]).map(id => (
            <Button key={id} variant={tab === id ? 'default' : 'outline'} onClick={() => setTab(id)}>
              {TABS[id]}
            </Button>
          ))}
        </div>

        {data && (
          <div className='grid gap-3 sm:grid-cols-3 lg:grid-cols-6'>
            {Object.entries(summaryRow[0] || {}).map(([label, value]) => (
              <div key={label} className='rounded-xl border border-slate-200 bg-white p-3'>
                <p className='text-xs text-slate-500'>{label}</p>
                <p className='mt-1 text-lg font-semibold text-slate-900'>{value}</p>
              </div>
            ))}
          </div>
        )}

        {error && <p className='text-sm text-red-600'>{error}</p>}
        {loading || !data ? (
          <p className='text-sm text-slate-500'>Loading analytics...</p>
        ) : (
          <div className='space-y-6'>
            {tab === 'overview' && <Overview data={data} />}
            {tab === 'demand' && <Demand data={data} />}
            {tab === 'seasonal' && <Seasonal data={data} />}
            {tab === 'customers' && <Customers data={data} />}
            {tab === 'marketing' && <Marketing data={data} />}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className='rounded-xl border border-slate-200 bg-white p-4'>
      <h2 className='text-sm font-semibold text-slate-800'>{title}</h2>
      {note && <p className='mt-0.5 text-xs text-slate-500'>{note}</p>}
      <div className='mt-3'>{children}</div>
    </section>
  );
}

function Overview({ data }: { data: AdvancedAnalytics }) {
  return (
    <>
      <Panel title='What the data says'>
        {data.insights.length === 0 ? (
          <p className='text-sm text-slate-500'>Not enough orders yet for insights.</p>
        ) : (
          <ul className='list-disc space-y-1 pl-5 text-sm text-slate-700'>
            {data.insights.map(line => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title='Revenue by month and next 3 months' note='Forecast uses trend smoothing on monthly revenue.'>
        <ResponsiveContainer width='100%' height={280}>
          <LineChart
            data={[
              ...data.seasonal.monthly.map(row => ({ month: row.month, revenue: row.revenue, forecast: null as number | null })),
              ...data.seasonal.revenueForecast.map(row => ({ month: row.month, revenue: null as number | null, forecast: row.revenue })),
            ]}>
            <CartesianGrid strokeDasharray='3 3' stroke='#f1f5f9' />
            <XAxis dataKey='month' fontSize={11} />
            <YAxis fontSize={11} />
            <Tooltip />
            <Legend />
            <Line type='monotone' dataKey='revenue' name='Revenue' stroke={GREEN} strokeWidth={2} connectNulls />
            <Line type='monotone' dataKey='forecast' name='Forecast' stroke={AMBER} strokeDasharray='6 4' strokeWidth={2} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </Panel>
    </>
  );
}

function Demand({ data }: { data: AdvancedAnalytics }) {
  return (
    <Panel
      title='Product demand, next 4 weeks'
      note='Based on the last 12 weeks of units sold. Reorder qty covers 5 weeks of forecast demand minus stock.'>
      {data.demand.length === 0 ? (
        <p className='text-sm text-slate-500'>No counted sales in the last 12 weeks, so there is nothing to forecast yet.</p>
      ) : (
        <Table rows={sheetRows(buildSheets('demand', data))} />
      )}
    </Panel>
  );
}

function Seasonal({ data }: { data: AdvancedAnalytics }) {
  return (
    <>
      {!data.seasonal.enoughHistory && (
        <p className='rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800'>
          Less than 6 months with orders. Seasonal patterns get reliable after a full year.
        </p>
      )}
      <Panel title='Orders and revenue by month'>
        <ResponsiveContainer width='100%' height={260}>
          <BarChart data={data.seasonal.monthly}>
            <CartesianGrid strokeDasharray='3 3' stroke='#f1f5f9' />
            <XAxis dataKey='month' fontSize={11} />
            <YAxis yAxisId='left' fontSize={11} />
            <YAxis yAxisId='right' orientation='right' fontSize={11} />
            <Tooltip />
            <Legend />
            <Bar yAxisId='left' dataKey='revenue' name='Revenue' fill={GREEN} />
            <Bar yAxisId='right' dataKey='orders' name='Orders' fill={AMBER} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
      <div className='grid gap-6 lg:grid-cols-2'>
        <Panel title='Day of week' note='IST'>
          <ResponsiveContainer width='100%' height={220}>
            <BarChart data={data.seasonal.weekday}>
              <XAxis dataKey='day' fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey='orders' name='Orders' fill={GREEN} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title='Hour of day' note='IST'>
          <ResponsiveContainer width='100%' height={220}>
            <BarChart data={data.seasonal.hours}>
              <XAxis dataKey='hour' fontSize={10} interval={2} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey='orders' name='Orders' fill={GREEN} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
      <Panel title='Seasonal index' note='1.00 is an average month. Above 1 is a strong month.'>
        <Table rows={data.seasonal.seasonalIndex.map(row => ({ Month: row.month, Index: row.index.toFixed(2) }))} />
      </Panel>
    </>
  );
}

function Customers({ data }: { data: AdvancedAnalytics }) {
  const summary = data.summary;
  return (
    <>
      <div className='grid gap-3 sm:grid-cols-4'>
        {[
          ['New buyers', summary.newCustomers],
          ['Returning buyers', summary.returningCustomers],
          ['Repeat rate (all time)', `${summary.repeatRate}%`],
          ['Days between orders', summary.avgDaysBetweenOrders ?? 'n/a'],
        ].map(([label, value]) => (
          <div key={String(label)} className='rounded-xl border border-slate-200 bg-white p-3'>
            <p className='text-xs text-slate-500'>{label}</p>
            <p className='mt-1 text-lg font-semibold text-slate-900'>{value}</p>
          </div>
        ))}
      </div>
      <Panel title='New vs returning buyers by month'>
        <ResponsiveContainer width='100%' height={240}>
          <BarChart data={data.customers.newByMonth}>
            <XAxis dataKey='month' fontSize={11} />
            <YAxis fontSize={11} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey='newCustomers' name='New' stackId='a' fill={GREEN} />
            <Bar dataKey='returning' name='Returning' stackId='a' fill={AMBER} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
      <Panel title='Customer segments (RFM)' note='Recency, frequency, and spend from all non-cancelled orders.'>
        <Table
          rows={data.customers.segments.map(row => ({
            Segment: row.segment,
            Customers: row.customers,
            Revenue: inr(row.revenue),
            'Next step': row.action,
          }))}
        />
      </Panel>
      <Panel
        title='Shopping funnel'
        note={data.customers.trackedSessions ? 'Sessions from shop page views.' : 'Session tracking starts with this release. Older views count as one visit each.'}>
        <Table rows={data.customers.funnel.map(row => ({ Stage: row.stage, Sessions: row.sessions, 'Of visits': `${row.rate}%` }))} />
      </Panel>
      <Panel title='Top cities'>
        <Table rows={data.customers.topCities.map(row => ({ City: row.city, Orders: row.orders, Revenue: inr(row.revenue) }))} />
      </Panel>
    </>
  );
}

function Marketing({ data }: { data: AdvancedAnalytics }) {
  const marketing = data.marketing;
  return (
    <>
      <div className='grid gap-3 sm:grid-cols-4'>
        {[
          ['Discount given', inr(marketing.discountTotal)],
          ['Discount share', `${marketing.discountShare}%`],
          ['Loyalty points redeemed', marketing.loyaltyPoints],
          ['Loyalty discount', inr(marketing.loyaltyDiscount)],
        ].map(([label, value]) => (
          <div key={String(label)} className='rounded-xl border border-slate-200 bg-white p-3'>
            <p className='text-xs text-slate-500'>{label}</p>
            <p className='mt-1 text-lg font-semibold text-slate-900'>{value}</p>
          </div>
        ))}
      </div>
      {buildSheets('marketing', data).map(sheet => (
        <Panel key={sheet.name} title={sheet.name}>
          <Table rows={sheet.rows} />
        </Panel>
      ))}
    </>
  );
}

function sheetRows(sheets: ReportSheet[]) {
  return sheets[0]?.rows || [];
}

function buildSheets(tab: Tab, data: AdvancedAnalytics | null): ReportSheet[] {
  if (!data) return [];
  if (tab === 'overview') {
    return [
      { name: 'Insights', rows: data.insights.map(line => ({ Insight: line })) },
      {
        name: 'Revenue forecast',
        rows: data.seasonal.revenueForecast.map(row => ({ Month: row.month, 'Forecast revenue': inr(row.revenue) })),
      },
    ];
  }
  if (tab === 'demand') {
    return [
      {
        name: 'Demand forecast',
        rows: data.demand.map(row => ({
          Product: row.name,
          SKU: row.sku || '-',
          'Sold 12w': row.sold12w,
          'Last 4w': row.last4w,
          'Forecast 4w': row.forecast4w,
          Stock: row.stock,
          'Days cover': row.daysCover ?? '-',
          'Reorder qty': row.reorderQty,
          Trend: row.trend,
          Risk: row.risk,
        })),
      },
    ];
  }
  if (tab === 'seasonal') {
    return [
      {
        name: 'Monthly',
        rows: data.seasonal.monthly.map(row => ({
          Month: row.month,
          Orders: row.orders,
          Units: row.units,
          Cancelled: row.cancelled,
          Revenue: inr(row.revenue),
        })),
      },
      { name: 'Day of week', rows: data.seasonal.weekday.map(row => ({ Day: row.day, Orders: row.orders, Revenue: inr(row.revenue) })) },
      { name: 'Hour of day', rows: data.seasonal.hours.map(row => ({ Hour: row.hour, Orders: row.orders })) },
    ];
  }
  if (tab === 'customers') {
    return [
      {
        name: 'Segments',
        rows: data.customers.segments.map(row => ({
          Segment: row.segment,
          Customers: row.customers,
          Revenue: inr(row.revenue),
          'Next step': row.action,
        })),
      },
      { name: 'Funnel', rows: data.customers.funnel.map(row => ({ Stage: row.stage, Sessions: row.sessions, 'Of visits': `${row.rate}%` })) },
      { name: 'Top cities', rows: data.customers.topCities.map(row => ({ City: row.city, Orders: row.orders, Revenue: inr(row.revenue) })) },
    ];
  }
  const marketing = data.marketing;
  return [
    {
      name: 'Coupons',
      rows: marketing.coupons.map(row => ({ Code: row.code, Orders: row.orders, Discount: inr(row.discount), Revenue: inr(row.revenue) })),
    },
    {
      name: 'Influencer referrals',
      rows: marketing.influencers.map(row => ({
        Influencer: row.name,
        Orders: row.orders,
        Revenue: inr(row.revenue),
        Commission: inr(row.commission),
      })),
    },
    { name: 'Traffic sources', rows: marketing.sources.map(row => ({ Source: row.source, Visits: row.visits, Sessions: row.sessions })) },
    { name: 'Payment mix', rows: marketing.payments.map(row => ({ Method: row.method, Orders: row.orders, Revenue: inr(row.revenue) })) },
    { name: 'Games', rows: marketing.games.map(row => ({ Game: row.kind, Plays: row.plays, Players: row.players, Points: row.points })) },
  ];
}

function Table({ rows }: { rows: ReportRow[] }) {
  const headers = Object.keys(rows[0] || {});
  return (
    <div className='overflow-x-auto rounded-lg border border-slate-200'>
      <table className='min-w-full text-sm'>
        <thead className='bg-[#E8F7F1] text-left text-[#0B8A6A]'>
          <tr>
            {headers.map(header => (
              <th key={header} className='px-3 py-2 font-medium'>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className='px-3 py-6 text-slate-500' colSpan={Math.max(headers.length, 1)}>
                No data yet.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index} className='border-t border-slate-100'>
                {headers.map(header => (
                  <td key={header} className='px-3 py-2 text-slate-800'>
                    {row[header]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
