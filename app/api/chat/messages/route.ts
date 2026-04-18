import { NextRequest, NextResponse } from 'next/server';
import { verifyCustomerToken, verifyToken, getUserFromRequest } from '@/lib/auth';
import { addChatMessage, getChatMessages, markChatMessagesAsRead } from '@/lib/models/chat';

// POST - Send a chat message
export async function POST(request: NextRequest) {
  try {
    // IMPORTANT: Check Authorization header FIRST (customer widget sends this)
    // Customer widget sends: Authorization: Bearer <customerToken>
    // Admin panel sends: No Authorization header, only adminToken cookie
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
    const tokenFromCookie = request.cookies.get('customerToken')?.value;
    const customerToken = tokenFromHeader || tokenFromCookie;
    
    let decoded = null;
    let isAdmin = false;
    let admin = null;
    
    // If Authorization header exists, this is likely a customer request from customer widget
    if (customerToken) {
      decoded = verifyCustomerToken(customerToken);
      if (decoded && decoded.customerId) {
        // Valid customer token found - this is a customer request
        // Explicitly set isAdmin to false when we have a valid customer token
        isAdmin = false;
      }
    }
    
    // Only check for admin token if there's NO Authorization header at all
    // Admin panel sends requests without Authorization header, only with adminToken cookie
    // Customer widget ALWAYS sends Authorization header, so if header exists, it's a customer request
    if (!tokenFromHeader) {
      // No Authorization header - this could be an admin request from admin panel
      const adminTokenCookie = request.cookies.get('adminToken')?.value;
      if (adminTokenCookie) {
        const adminDecoded = verifyToken(adminTokenCookie);
        if (adminDecoded && (adminDecoded.role === 'admin' || adminDecoded.role === 'superadmin')) {
          admin = adminDecoded;
          isAdmin = true;
        }
      }
    } else {
      // Authorization header exists - this is a customer request from customer widget
      // Even if adminToken cookie exists, ignore it because customer widget sent the request
    }

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
      // Invalid state - neither admin nor customer properly authenticated
      console.error('[Chat API] Invalid authentication state:', { 
        isAdmin, 
        hasAdmin: !!admin, 
        hasDecoded: !!decoded,
        decodedCustomerId: decoded?.customerId,
        adminId: admin?.id,
        tokenPresent: !!token,
        adminTokenCookiePresent: !!adminTokenCookie
      });
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
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                  request.cookies.get('customerToken')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyCustomerToken(token);
    const admin = getUserFromRequest(request);

    if (!decoded && !admin) {
      return NextResponse.json(
        { error: 'Invalid token' },
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
    const userId = admin ? admin.id : decoded.customerId;
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

