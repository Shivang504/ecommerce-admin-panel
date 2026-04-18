import { NextRequest, NextResponse } from 'next/server';
import { verifyCustomerToken } from '@/lib/auth';
import { getOrCreateChatSession, getChatMessages, createChatSessionWithPreChat, getChatSession } from '@/lib/models/chat';

// GET - Get chat session (does not create new one automatically)
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
    if (!decoded || !decoded.customerId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const session = await getOrCreateChatSession(decoded.customerId);

    if (!session) {
      return NextResponse.json({
        success: true,
        session: null,
        messages: [],
      });
    }

    // Get recent messages (only if session is active)
    const messages = session.status === 'active' ? await getChatMessages(session.chatId, 50) : [];

    return NextResponse.json({
      success: true,
      session,
      messages,
    });
  } catch (error: any) {
    console.error('[Chat API] Error getting session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get chat session' },
      { status: 500 }
    );
  }
}

// POST - Create chat session with pre-chat form
export async function POST(request: NextRequest) {
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
    if (!decoded || !decoded.customerId) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    let { preChatForm } = body;

    // If preChatForm is not provided or email is missing, fetch customer data from database
    if (!preChatForm || !preChatForm.email) {
      const { connectToDatabase } = await import('@/lib/mongodb');
      const { ObjectId } = await import('mongodb');
      const { db } = await connectToDatabase();
      
      const customer = await db.collection('customers').findOne({ 
        _id: new ObjectId(decoded.customerId) 
      });

      if (!customer) {
        return NextResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        );
      }

      // Create preChatForm from customer data and provided data
      preChatForm = {
        name: customer.name || preChatForm?.name,
        email: customer.email || preChatForm?.email,
        phone: customer.phone || preChatForm?.phone,
        question1: preChatForm?.question1,
        question2: preChatForm?.question2,
        question3: preChatForm?.question3,
        question4: preChatForm?.question4,
      };

      // Ensure email is present
      if (!preChatForm.email) {
        return NextResponse.json(
          { error: 'Customer email is required' },
          { status: 400 }
        );
      }
    }

    // Check if there's already an active session
    const existingSession = await getOrCreateChatSession(decoded.customerId);
    if (existingSession && (existingSession.status === 'active' || existingSession.status === 'pending')) {
      return NextResponse.json({
        success: true,
        session: existingSession,
        messages: existingSession.status === 'active' ? await getChatMessages(existingSession.chatId, 50) : [],
      });
    }

    const session = await createChatSessionWithPreChat(decoded.customerId, preChatForm);

    // If session is active, return empty messages array (customer can start chatting immediately)
    const messages = session.status === 'active' ? [] : [];

    return NextResponse.json({
      success: true,
      session,
      messages,
    });
  } catch (error: any) {
    console.error('[Chat API] Error creating session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create chat session' },
      { status: 500 }
    );
  }
}

