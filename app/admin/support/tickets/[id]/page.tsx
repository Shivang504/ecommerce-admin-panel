'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, User, MessageSquare, Calendar, Tag } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { AdminLayout } from '@/components/layout/admin-layout';

interface Ticket {
  _id: string;
  ticketNumber: string;
  customerId: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  assignedTo?: string;
  messages: Array<{
    _id: string;
    senderId: string;
    senderType: 'customer' | 'admin';
    senderName?: string;
    message: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export default function AdminTicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchTicket();
  }, [params.id]);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/support/tickets/${params.id}`);

      if (response.ok) {
        const data = await response.json();
        setTicket(data.ticket);
      } else {
        toast({
          title: 'Error',
          description: 'Ticket not found',
          variant: 'destructive',
        });
        router.push('/admin/support/tickets');
      }
    } catch (error) {
      console.error('Error fetching ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to load ticket',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/support/tickets/${ticket?._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        const data = await response.json();
        setTicket(data.ticket);
        toast({
          title: 'Success',
          description: 'Ticket status updated',
          variant: 'success',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update ticket',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !ticket) return;

    setSending(true);
    try {
      const response = await fetch(`/api/support/tickets/${ticket._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (response.ok) {
        const data = await response.json();
        setTicket(data.ticket);
        setMessage('');
        toast({
          title: 'Success',
          description: 'Message sent',
          variant: 'success',
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to send message',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className='p-6'>
          <div className='flex items-center justify-center py-20'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-web'></div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!ticket) {
    return null;
  }

  return (
    <AdminLayout>
      <div className='p-6'>
        <Link
          href='/admin/support/tickets'
          className='inline-flex items-center gap-2 text-web hover:text-web/80 mb-6 transition'>
          <ArrowLeft className='w-4 h-4' />
          <span className='font-medium'>Back to Tickets</span>
        </Link>

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Main Content */}
          <div className='lg:col-span-2 space-y-6'>
            {/* Ticket Header */}
            <div className='bg-white rounded-lg border border-gray-200 p-6'>
              <div className='flex items-start justify-between mb-4'>
                <div>
                  <div className='flex items-center gap-3 mb-2'>
                    <h1 className='text-2xl font-bold text-gray-900'>{ticket.subject}</h1>
                    <select
                      value={ticket.status}
                      onChange={e => handleUpdateStatus(e.target.value)}
                      disabled={updating}
                      className='border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-web'>
                      <option value='open'>Open</option>
                      <option value='in-progress'>In Progress</option>
                      <option value='resolved'>Resolved</option>
                      <option value='closed'>Closed</option>
                    </select>
                  </div>
                  <p className='text-sm text-gray-600'>
                    Ticket #{ticket.ticketNumber} • {ticket.category} • Priority: {ticket.priority}
                  </p>
                </div>
              </div>

              <div className='border-t border-gray-200 pt-4'>
                <p className='text-gray-700 whitespace-pre-wrap'>{ticket.description}</p>
              </div>
            </div>

            {/* Messages */}
            <div className='bg-white rounded-lg border border-gray-200 p-6'>
              <h2 className='text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2'>
                <MessageSquare className='w-5 h-5' />
                Messages ({ticket.messages?.length || 0})
              </h2>

              <div className='space-y-4 max-h-96 overflow-y-auto'>
                {ticket.messages?.map(msg => (
                  <div
                    key={msg._id}
                    className={`flex gap-3 ${
                      msg.senderType === 'admin' ? 'justify-end' : 'justify-start'
                    }`}>
                    <div
                      className={`max-w-[70%] rounded-lg p-4 ${
                        msg.senderType === 'admin'
                          ? 'bg-web text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                      <div className='flex items-center gap-2 mb-2'>
                        <User className='w-4 h-4' />
                        <span className='text-xs font-medium'>
                          {msg.senderName || (msg.senderType === 'admin' ? 'You' : 'Customer')}
                        </span>
                        <span className='text-xs opacity-75'>
                          {new Date(msg.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className='whitespace-pre-wrap'>{msg.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reply Form */}
            {ticket.status !== 'closed' && (
              <form onSubmit={handleSendMessage} className='bg-white rounded-lg border border-gray-200 p-6'>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Reply to Customer
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={4}
                  className='w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-web'
                  placeholder='Type your message...'
                  required
                />
                <Button type='submit' disabled={sending || !message.trim()} className='bg-web text-white hover:bg-web/90'>
                  {sending ? (
                    'Sending...'
                  ) : (
                    <>
                      <Send className='w-4 h-4 mr-2' />
                      Send Reply
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>

          {/* Sidebar */}
          <div className='space-y-6'>
            <div className='bg-white rounded-lg border border-gray-200 p-6'>
              <h3 className='text-lg font-semibold text-gray-900 mb-4'>Ticket Details</h3>
              <div className='space-y-3 text-sm'>
                <div className='flex items-center gap-2'>
                  <Tag className='w-4 h-4 text-gray-400' />
                  <span className='text-gray-600'>Category:</span>
                  <span className='font-medium capitalize'>{ticket.category}</span>
                </div>
                <div className='flex items-center gap-2'>
                  <Tag className='w-4 h-4 text-gray-400' />
                  <span className='text-gray-600'>Priority:</span>
                  <span className='font-medium capitalize'>{ticket.priority}</span>
                </div>
                <div className='flex items-center gap-2'>
                  <Calendar className='w-4 h-4 text-gray-400' />
                  <span className='text-gray-600'>Created:</span>
                  <span className='font-medium'>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                </div>
                <div className='flex items-center gap-2'>
                  <Calendar className='w-4 h-4 text-gray-400' />
                  <span className='text-gray-600'>Updated:</span>
                  <span className='font-medium'>{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

