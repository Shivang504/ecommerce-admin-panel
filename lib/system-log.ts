import { connectToDatabase } from '@/lib/mongodb';

export type SystemLogLevel = 'info' | 'warn' | 'error';

export type SystemLogInput = {
  level?: SystemLogLevel;
  source: string; // e.g. admin-orders, vendor-orders, storefront
  action: string; // e.g. order.get, order.status_update
  message: string;
  path?: string;
  method?: string;
  statusCode?: number;
  userId?: string;
  userRole?: string;
  orderId?: string;
  orderNumber?: string;
  details?: Record<string, unknown>;
  error?: unknown;
};

function serializeError(error: unknown): Record<string, unknown> | undefined {
  if (!error) return undefined;
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack?.slice(0, 4000),
    };
  }
  if (typeof error === 'string') return { message: error };
  try {
    return { message: JSON.stringify(error).slice(0, 2000) };
  } catch {
    return { message: String(error) };
  }
}

/** Persist operational logs for admin/vendor/storefront debugging. */
export async function writeSystemLog(input: SystemLogInput): Promise<void> {
  try {
    const { db } = await connectToDatabase();
    const doc = {
      level: input.level || 'info',
      source: input.source,
      action: input.action,
      message: input.message,
      path: input.path || null,
      method: input.method || null,
      statusCode: input.statusCode ?? null,
      userId: input.userId || null,
      userRole: input.userRole || null,
      orderId: input.orderId || null,
      orderNumber: input.orderNumber || null,
      details: input.details || null,
      error: serializeError(input.error) || null,
      createdAt: new Date(),
    };
    await db.collection('system_logs').insertOne(doc);
  } catch (logError) {
    // Never break the main request because logging failed
    console.error('[SystemLog] Failed to write log:', logError);
  }
}

const MAX_INLINE_IMAGE = 2_000;

/** Strip huge base64 blobs so order APIs stay fast and stable. */
export function sanitizeOrderForApi<T extends Record<string, any>>(order: T | null | undefined): T | null {
  if (!order) return null;
  const cloned: any = { ...order };

  if (Array.isArray(cloned.items)) {
    cloned.items = cloned.items.map((item: any) => {
      const next = { ...item };
      const img = next.productImage;
      if (typeof img === 'string' && img.startsWith('data:') && img.length > MAX_INLINE_IMAGE) {
        next.productImage = '';
        next.productImageOmitted = true;
      }
      return next;
    });
  }

  if (cloned.tracking && typeof cloned.tracking === 'object') {
    const tracking = { ...cloned.tracking };
    const label = tracking.labelPdfUrl;
    if (typeof label === 'string' && label.length > MAX_INLINE_IMAGE && !label.startsWith('http')) {
      tracking.labelPdfUrl = null;
      tracking.labelAvailable = true;
      tracking.labelOmitted = true;
    }
    cloned.tracking = tracking;
  }

  return cloned as T;
}
