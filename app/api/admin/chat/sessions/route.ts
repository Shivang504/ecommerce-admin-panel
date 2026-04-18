import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getAllChatSessions, assignChatToAdmin, closeChatSession, approveChatSession } from '@/lib/models/chat';

// GET - Get all chat sessions (admin)
export async function GET(request: NextRequest) {
  try {
    const admin = getUserFromRequest(request);
    if (!admin || (admin.role !== 'admin' && admin.role !== 'superadmin')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status') as any;
    const chatId = searchParams.get('chatId');

    // If chatId is provided, get specific chat session
    if (chatId) {
      const { getChatSession, getChatMessages } = await import('@/lib/models/chat');
      const session = await getChatSession(chatId);
      if (!session) {
        return NextResponse.json(
          { error: 'Chat session not found' },
          { status: 404 }
        );
      }
      const messages = await getChatMessages(chatId, 100);
      return NextResponse.json({
        success: true,
        session,
        messages,
      });
    }

    const result = await getAllChatSessions(status, page, limit);

    return NextResponse.json({
      success: true,
      sessions: result.sessions,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    });
  } catch (error: any) {
    console.error('[Admin Chat API] Error fetching sessions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch chat sessions' },
      { status: 500 }
    );
  }
}

// POST - Assign chat to admin
export async function POST(request: NextRequest) {
  try {
    const admin = getUserFromRequest(request);
    if (!admin || (admin.role !== 'admin' && admin.role !== 'superadmin')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { chatId, action } = body;

    if (!chatId) {
      return NextResponse.json(
        { error: 'Chat ID is required' },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      const session = await approveChatSession(chatId, admin.id, admin.name || 'Admin');
      if (!session) {
        return NextResponse.json(
          { error: 'Chat session not found or already approved' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        session,
      });
    } else if (action === 'assign') {
      const session = await assignChatToAdmin(chatId, admin.id, admin.name || 'Admin');
      return NextResponse.json({
        success: true,
        session,
      });
    } else if (action === 'close') {
      await closeChatSession(chatId);
      return NextResponse.json({
        success: true,
      });
    } else if (action === 'reopen') {
      const { reopenChatSession } = await import('@/lib/models/chat');
      const session = await reopenChatSession(chatId, admin.id, admin.name || 'Admin');
      return NextResponse.json({
        success: true,
        session,
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('[Admin Chat API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}

