'use client';

/**
 * Client-side dashboard PDF export (jspdf + jspdf-autotable).
 */

export interface DashboardPdfData {
  stats: {
    totalOrders: { value: string; change: string; trend: 'up' | 'down' };
    pendingOrders: { value: string; change: string; trend: 'up' | 'down' };
    cancelledOrders: { value: string; change: string; trend: 'up' | 'down' };
    returnedItems: { value: string; change: string; trend: 'up' | 'down' };
  };
  revenueData: Array<{ month: string; income: number; expense: number }>;
  categoryDistribution: Array<{ name: string; value: number; color: string; count?: number }>;
  topProducts: Array<{
    supplier: string;
    products: string;
    nextShipment: string;
    contact: string;
    rating: number;
    revenue?: number;
  }>;
  recentOrders: Array<{ id: string; customer: string; product: string; price: number; status: string }>;
  topDeals?: Array<{ name: string; category: string; price: string; icon?: string; sales?: number }>;
  filter?: { monthKey: string; monthLabel: string; canGoNext: boolean };
}

const BRAND: [number, number, number] = [64, 29, 93];
const MARGIN = 14;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;

type JsPDFDoc = import('jspdf').jsPDF;

function formatInr(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function trendArrow(trend: 'up' | 'down') {
  return trend === 'up' ? '↑' : '↓';
}

function ensureSpace(doc: JsPDFDoc, y: number, needed: number): number {
  if (y + needed > PAGE_H - MARGIN) {
    doc.addPage();
    return MARGIN + 6;
  }
  return y;
}

function drawHeader(doc: JsPDFDoc, siteLabel: string, monthLabel?: string): number {
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, PAGE_W, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`${siteLabel} · Dashboard Analytics`, MARGIN, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`,
    MARGIN,
    21
  );
  if (monthLabel) {
    doc.text(`Reporting period: ${monthLabel}`, MARGIN, 27);
  }
  doc.setTextColor(30, 41, 59);
  return 40;
}

function drawSectionTitle(doc: JsPDFDoc, title: string, y: number): number {
  y = ensureSpace(doc, y, 12);
  doc.setFillColor(248, 250, 252);
  doc.rect(MARGIN, y - 5, CONTENT_W, 9, 'F');
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(1);
  doc.line(MARGIN, y - 5, MARGIN, y + 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BRAND);
  doc.text(title, MARGIN + 5, y + 1);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  return y + 10;
}

function drawRevenueBars(doc: JsPDFDoc, data: DashboardPdfData['revenueData'], startY: number): number {
  if (!data.length) return startY;

  const chartTop = startY;
  const chartHeight = 42;
  const chartLeft = MARGIN + 2;
  const chartWidth = CONTENT_W - 4;
  const maxVal = Math.max(...data.flatMap(d => [d.income, d.expense]), 1);
  const barGroupW = chartWidth / data.length;
  const barW = Math.min(6, (barGroupW - 4) / 2);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  for (let i = 0; i <= 4; i++) {
    const gy = chartTop + (chartHeight * i) / 4;
    doc.line(chartLeft, gy, chartLeft + chartWidth, gy);
  }

  data.forEach((row, i) => {
    const cx = chartLeft + barGroupW * i + barGroupW / 2;
    const incomeH = (row.income / maxVal) * (chartHeight - 8);
    const expenseH = (row.expense / maxVal) * (chartHeight - 8);
    const baseY = chartTop + chartHeight;

    doc.setFillColor(16, 185, 129);
    doc.rect(cx - barW - 1, baseY - incomeH, barW, incomeH, 'F');
    doc.setFillColor(245, 158, 11);
    doc.rect(cx + 1, baseY - expenseH, barW, expenseH, 'F');

    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(row.month, cx - barW, baseY + 4, { align: 'center' });
  });

  doc.setFontSize(8);
  doc.setTextColor(16, 185, 129);
  doc.text('■ Order value', chartLeft, chartTop - 2);
  doc.setTextColor(245, 158, 11);
  doc.text('■ Shipping / fees', chartLeft + 38, chartTop - 2);

  return chartTop + chartHeight + 10;
}

function parseHexColor(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16) || 148,
    parseInt(h.slice(2, 4), 16) || 163,
    parseInt(h.slice(4, 6), 16) || 184,
  ];
}

function drawCategoryBars(doc: JsPDFDoc, categories: DashboardPdfData['categoryDistribution'], startY: number): number {
  if (!categories.length) {
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('No category data available.', MARGIN, startY + 4);
    return startY + 10;
  }

  const barMaxW = CONTENT_W - 50;
  let y = startY;

  categories.slice(0, 8).forEach(cat => {
    y = ensureSpace(doc, y, 10);
    const [r, g, b] = parseHexColor(cat.color);
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    const label = cat.name.length > 22 ? `${cat.name.slice(0, 19)}…` : cat.name;
    doc.text(label, MARGIN, y + 3);
    doc.setFillColor(241, 245, 249);
    doc.rect(MARGIN + 48, y, barMaxW, 5, 'F');
    doc.setFillColor(r, g, b);
    doc.rect(MARGIN + 48, y, (barMaxW * cat.value) / 100, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text(`${cat.value}%`, MARGIN + 48 + barMaxW + 3, y + 3.5);
    doc.setFont('helvetica', 'normal');
    y += 8;
  });

  return y + 4;
}

function statusLabel(status: string) {
  const s = status === 'completed' ? 'delivered' : status;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing?.dataset.loaded === 'true') {
      resolve();
      return;
    }
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

type AutoTableFn = (doc: JsPDFDoc, options: Record<string, unknown>) => void;

async function loadPdfLibraries(): Promise<{
  jsPDF: new (options?: Record<string, unknown>) => JsPDFDoc;
  autoTable: AutoTableFn;
}> {
  try {
    const { jsPDF } = await import('jspdf');
    const autoTableMod = await import('jspdf-autotable');
    return { jsPDF, autoTable: autoTableMod.default as AutoTableFn };
  } catch {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js');
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js');
    const w = window as Window & { jspdf?: { jsPDF: new (o?: Record<string, unknown>) => JsPDFDoc } };
    if (!w.jspdf?.jsPDF) {
      throw new Error('PDF libraries could not be loaded. Run: npm install jspdf jspdf-autotable');
    }
    const jsPDF = w.jspdf.jsPDF;
    const autoTable: AutoTableFn = (doc, options) => {
      const d = doc as JsPDFDoc & { autoTable: (o: Record<string, unknown>) => void };
      if (typeof d.autoTable !== 'function') {
        throw new Error('jspdf-autotable plugin not available');
      }
      d.autoTable(options);
    };
    return { jsPDF, autoTable };
  }
}

function buildDashboardPdf(
  doc: JsPDFDoc,
  autoTable: AutoTableFn,
  options: { siteLabel: string; monthLabel?: string; data: DashboardPdfData }
): void {
  const { siteLabel, monthLabel, data } = options;
  let y = drawHeader(doc, siteLabel, monthLabel);

  y = drawSectionTitle(doc, 'Key metrics', y);
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Metric', 'Value', 'Change', 'Trend']],
    body: [
      ['Total orders', data.stats.totalOrders.value, data.stats.totalOrders.change, trendArrow(data.stats.totalOrders.trend)],
      ['Pending orders', data.stats.pendingOrders.value, data.stats.pendingOrders.change, trendArrow(data.stats.pendingOrders.trend)],
      ['Cancelled orders', data.stats.cancelledOrders.value, data.stats.cancelledOrders.change, trendArrow(data.stats.cancelledOrders.trend)],
      ['Returns', data.stats.returnedItems.value, data.stats.returnedItems.change, trendArrow(data.stats.returnedItems.trend)],
    ],
    theme: 'grid',
    headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [51, 65, 85] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  y = (doc as JsPDFDoc & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 30;
  y += 8;

  y = drawSectionTitle(doc, 'Revenue & shipping (last 7 months)', y);
  if (data.revenueData.length > 0) {
    y = drawRevenueBars(doc, data.revenueData, y);
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [['Month', 'Order value (₹)', 'Shipping & fees (₹)', 'Net (₹)']],
      body: data.revenueData.map(row => [
        row.month,
        formatInr(row.income),
        formatInr(row.expense),
        formatInr(row.income - row.expense),
      ]),
      theme: 'grid',
      headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    y = (doc as JsPDFDoc & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 24;
    y += 8;
  } else {
    doc.setFontSize(9);
    doc.text('No revenue data for this period.', MARGIN, y + 4);
    y += 12;
  }

  y = ensureSpace(doc, y, 70);
  y = drawSectionTitle(doc, 'Catalog by category', y);
  y = drawCategoryBars(doc, data.categoryDistribution, y);
  if (data.categoryDistribution.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [['Category', 'Share', 'Products']],
      body: data.categoryDistribution.map(c => [
        c.name,
        `${c.value}%`,
        c.count != null ? String(c.count) : '—',
      ]),
      theme: 'grid',
      headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    y = (doc as JsPDFDoc & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 20;
    y += 8;
  }

  y = ensureSpace(doc, y, 40);
  y = drawSectionTitle(doc, `Top vendors${monthLabel ? ` · ${monthLabel}` : ''}`, y);
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Vendor', 'Orders', 'MTD revenue', 'Contact']],
    body:
      data.topProducts.length > 0
        ? data.topProducts.map(row => [
            row.supplier,
            row.products,
            typeof row.revenue === 'number' && row.revenue > 0 ? formatInr(Math.round(row.revenue)) : '—',
            row.contact,
          ])
        : [['No vendor activity in this period', '—', '—', '—']],
    theme: 'grid',
    headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, cellWidth: 'wrap' },
    columnStyles: { 0: { cellWidth: 45 }, 3: { cellWidth: 40 } },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  y = (doc as JsPDFDoc & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 24;
  y += 8;

  y = ensureSpace(doc, y, 40);
  y = drawSectionTitle(doc, 'Best selling products', y);
  const deals = data.topDeals ?? [];
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Product', 'Category / sales', 'Avg. price']],
    body:
      deals.length > 0
        ? deals.map(item => [
            item.name,
            item.sales != null ? `${item.sales} sold` : item.category,
            item.price,
          ])
        : [['No sales data for this period', '—', '—']],
    theme: 'grid',
    headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  y = (doc as JsPDFDoc & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 24;
  y += 8;

  y = ensureSpace(doc, y, 40);
  y = drawSectionTitle(doc, `Recent orders${monthLabel ? ` · ${monthLabel}` : ''}`, y);
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Order ID', 'Customer', 'Product', 'Price', 'Status']],
    body:
      data.recentOrders.length > 0
        ? data.recentOrders.map(order => [
            order.id,
            order.customer,
            order.product.length > 40 ? `${order.product.slice(0, 37)}…` : order.product,
            formatInr(order.price),
            statusLabel(order.status),
          ])
        : [['No recent orders', '—', '—', '—', '—']],
    theme: 'grid',
    headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 7.5, cellWidth: 'wrap' },
    columnStyles: {
      0: { cellWidth: 28 },
      2: { cellWidth: 45 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`${siteLabel} Dashboard · Page ${p} of ${pageCount}`, MARGIN, PAGE_H - 8);
    doc.text('Confidential — internal use', PAGE_W - MARGIN, PAGE_H - 8, { align: 'right' });
  }

  const safeMonth = (monthLabel || data.filter?.monthKey || 'report').replace(/\s+/g, '-').toLowerCase();
  const safeSite = siteLabel.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'store';
  doc.save(`${safeSite}-dashboard-${safeMonth}.pdf`);
}

export async function exportDashboardToPdf(options: {
  siteLabel: string;
  monthLabel?: string;
  data: DashboardPdfData;
}): Promise<void> {
  const { jsPDF, autoTable } = await loadPdfLibraries();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  buildDashboardPdf(doc, autoTable, options);
}
