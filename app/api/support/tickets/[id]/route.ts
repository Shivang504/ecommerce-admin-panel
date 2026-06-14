import { NextRequest, NextResponse } from 'next/server';
import { verifyCustomerToken, getUserFromRequest, getAdminFromRequest } from '@/lib/auth';
import {
  getTicketById,
  updateTicket,
  addTicketMessage,
} from '@/lib/models/support-ticket';
import { getCustomerById } from '@/lib/models/customer';
import { sendEmail } from '@/lib/email';
import {
  generateTicketStatusUpdateEmailHTML,
  generateTicketReplyEmailHTML,
} from '@/lib/email-templates';

function getCustomerAuthToken(request: NextRequest): string | undefined {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return request.cookies.get('customerToken')?.value;
}

// GET - Get ticket details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const admin = getAdminFromRequest(request);
    if (admin) {
      const ticket = await getTicketById(id);
      if (!ticket) {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, ticket });
    }

    const token = getCustomerAuthToken(request);

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

    const ticket = await getTicketById(id);

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    if (ticket.customerId !== decoded.customerId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      ticket,
    });
  } catch (error: any) {
    console.error('[Support Ticket API] Error fetching ticket:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch ticket' },
      { status: 500 }
    );
  }
}

// PUT - Update ticket
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = getAdminFromRequest(request);

    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { status, priority, assignedTo } = body;

    const updates: any = {};
    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (assignedTo !== undefined) updates.assignedTo = assignedTo;

    const ticket = await updateTicket(id, updates);

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Send email notification if status changed
    if (status) {
      try {
        const customer = await getCustomerById(ticket.customerId);
        if (customer && customer.email) {
          const emailHTML = generateTicketStatusUpdateEmailHTML({
            customerName: customer.name || 'Customer',
            ticketNumber: ticket.ticketNumber,
            subject: ticket.subject,
            status: ticket.status,
            ticketId: ticket._id!.toString(),
          });

          await sendEmail({
            to: customer.email,
            subject: `Ticket Status Updated - ${ticket.ticketNumber}`,
            html: emailHTML,
          });

          console.log('[Support Ticket API] Status update email sent to:', customer.email);
        }
      } catch (emailError) {
        console.error('[Support Ticket API] Error sending status update email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      ticket,
    });
  } catch (error: any) {
    console.error('[Support Ticket API] Error updating ticket:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update ticket' },
      { status: 500 }
    );
  }
}

// POST - Add message to ticket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = getAdminFromRequest(request);
    const token = getCustomerAuthToken(request);
    const decoded = token ? verifyCustomerToken(token) : null;

    if (!admin && !decoded) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const ticket = await getTicketById(id);
    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    const isAdmin = !!admin;
    const isCustomer = !!decoded && ticket.customerId === decoded.customerId;

    if (!isAdmin && !isCustomer) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { message, attachments } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const senderId = isAdmin ? admin!.id : decoded!.customerId;
    const senderType = isAdmin ? 'admin' : 'customer';

    const updatedTicket = await addTicketMessage(id, {
      senderId,
      senderType,
      message,
      attachments,
    });

    // Update ticket status if customer replies
    if (senderType === 'customer' && ticket.status === 'resolved') {
      await updateTicket(id, { status: 'open' });
    }

    // Send email notification if admin replied
    if (senderType === 'admin') {
      try {
        const customer = await getCustomerById(ticket.customerId);
        if (customer && customer.email) {
          const emailHTML = generateTicketReplyEmailHTML({
            customerName: customer.name || 'Customer',
            ticketNumber: ticket.ticketNumber,
            subject: ticket.subject,
            message: message,
            adminName: admin?.name,
            ticketId: ticket._id!.toString(),
          });

          await sendEmail({
            to: customer.email,
            subject: `New Reply on Ticket ${ticket.ticketNumber}`,
            html: emailHTML,
          });

          console.log('[Support Ticket API] Reply email sent to:', customer.email);
        }
      } catch (emailError) {
        console.error('[Support Ticket API] Error sending reply email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
    });
  } catch (error: any) {
    console.error('[Support Ticket API] Error adding message:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add message' },
      { status: 500 }
    );
  }
}

