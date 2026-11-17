import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getUserFromRequest, isAdmin } from '@/lib/auth';

// GET - List recent system logs (admin only)
export async function GET(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request);
    if (!currentUser || !isAdmin(currentUser)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');
    const orderId = searchParams.get('orderId');
    const source = searchParams.get('source');
    const limit = Math.min(Number(searchParams.get('limit') || 100), 500);

    const query: Record<string, unknown> = {};
    if (level) query.level = level;
    if (orderId) query.orderId = orderId;
    if (source) query.source = source;

    const { db } = await connectToDatabase();
    const logs = await db
      .collection('system_logs')
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      logs: logs.map((log) => ({
        ...log,
        _id: log._id?.toString(),
      })),
    });
  } catch (error: any) {
    console.error('[System Logs API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load system logs' },
      { status: 500 }
    );
  }
}
