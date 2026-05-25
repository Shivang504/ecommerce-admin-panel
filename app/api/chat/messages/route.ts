import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest, getChatCustomerFromRequest } from '@/lib/auth';
import { addChatMessage, getChatMessages, markChatMessagesAsRead } from '@/lib/models/chat';

// POST - Send a chat message
export async function POST(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request);
    const isAdmin = !!admin;
    const decoded = isAdmin ? null : getChatCustomerFromRequest(request);

    // Validate authentication - need either admin or customer token
    if (!isAdmin && !decoded) {
      return NextResponse.json(
        { error: 'Authentication required. Please login as admin or customer.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { chatId, message, attachments } = body;

    if (!chatId || !message) {
      return NextResponse.json(
        { error: 'Chat ID and message are required' },
        { status: 400 }
      );
    }

    // Check chat session status
    const { getChatSession } = await import('@/lib/models/chat');
    const chatSession = await getChatSession(chatId);
    
    if (!chatSession) {
      return NextResponse.json(
        { error: 'Chat session not found' },
        { status: 404 }
      );
    }

    // Only allow messages if status is 'active' (customer can't message if pending/waiting)
    if (!isAdmin && chatSession.status !== 'active') {
      return NextResponse.json(
        { error: 'Chat session is not active yet. Please wait for admin approval.' },
        { status: 403 }
      );
    }

    // Determine sender information with explicit validation
    // PRIORITY: Admin token wins - if we have a valid admin token, it's an admin message
    let senderId: string;
    let senderType: 'admin' | 'customer';
    let senderName: string | undefined;

    if (isAdmin && admin) {
      // Admin sending message - check admin token FIRST
      senderId = admin.id;
      senderType = 'admin';
      senderName = admin.email || admin.name || 'Admin';
    } else if (decoded && decoded.customerId) {
      // Customer sending message (only if no valid admin token)
      senderId = decoded.customerId;
      senderType = 'customer';
      senderName = undefined; // Customers don't need senderName
    } else {
      return NextResponse.json(
        { error: 'Unable to determine sender identity. Please ensure you are properly authenticated.' },
        { status: 400 }
      );
    }

    const newMessage = await addChatMessage(chatId, {
      senderId,
      senderType,
      senderName,
      message,
      attachments,
    });

    return NextResponse.json({
      success: true,
      message: newMessage,
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Chat API] Error sending message:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}

// GET - Get chat messages
export async function GET(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request);
    const decoded = admin ? null : getChatCustomerFromRequest(request);

    if (!admin && !decoded) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before') ? new Date(searchParams.get('before')!) : undefined;

    if (!chatId) {
      return NextResponse.json(
        { error: 'Chat ID is required' },
        { status: 400 }
      );
    }

    const messages = await getChatMessages(chatId, limit, before);

    // Mark messages as read
    const userId = admin ? admin.id : decoded!.customerId;
    await markChatMessagesAsRead(chatId, userId);

    return NextResponse.json({
      success: true,
      messages,
    });
  } catch (error: any) {
    console.error('[Chat API] Error fetching messages:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// PUT - Mark chat messages as read
export async function PUT(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request);
    const decoded = admin ? null : getChatCustomerFromRequest(request);

    if (!admin && !decoded) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json(
        { error: 'Chat ID is required' },
        { status: 400 }
      );
    }

    const userId = admin ? admin.id : decoded!.customerId;
    await markChatMessagesAsRead(chatId, userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Chat API] Error marking messages as read:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to mark messages as read' },
      { status: 500 }
    );
  }
}

