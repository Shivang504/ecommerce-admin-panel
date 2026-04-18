'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Clock, CheckCircle, XCircle, User, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminLayout } from '@/components/layout/admin-layout';
import Link from 'next/link';

interface ChatSession {
  _id: string;
  chatId: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  preChatForm?: {
    name?: string;
    email: string;
    phone?: string;
    question1?: string;
    question2?: string;
    question3?: string;
    question4?: string;
  };
  adminId?: string;
  adminName?: string;
  status: 'pending' | 'active' | 'waiting' | 'closed';
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function AdminChatPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSessions();
    // Poll for new chats every 5 seconds
    const interval = setInterval(fetchSessions, 5000);
    return () => clearInterval(interval);
  }, [selectedStatus]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedStatus && selectedStatus !== 'all') params.append('status', selectedStatus);
      params.append('limit', '100');

      const response = await fetch(`/api/admin/chat/sessions?${params.toString()}`);

      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveChat = async (chatId: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/chat/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify({ chatId, action: 'approve' }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Chat approved and assigned to you',
          variant: 'success',
        });
        fetchSessions();
      } else {
        const errorData = await response.json();
        toast({
          title: 'Error',
          description: errorData.error || 'Failed to approve chat',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve chat',
        variant: 'destructive',
      });
    }
  };

  const handleAssignChat = async (chatId: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/chat/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify({ chatId, action: 'assign' }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Chat assigned to you',
          variant: 'success',
        });
        fetchSessions();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to assign chat',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className='w-4 h-4 text-green-600' />;
      case 'pending':
        return <Clock className='w-4 h-4 text-orange-600' />;
      case 'waiting':
        return <Clock className='w-4 h-4 text-yellow-600' />;
      case 'closed':
        return <XCircle className='w-4 h-4 text-gray-600' />;
      default:
        return <MessageSquare className='w-4 h-4' />;
    }
  };

  const filteredSessions = sessions.filter(session => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        session.customerName?.toLowerCase().includes(query) ||
        session.customerEmail?.toLowerCase().includes(query) ||
        session.chatId.toLowerCase().includes(query) ||
        session.lastMessage?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const stats = {
    total: sessions.length,
    pending: sessions.filter(s => s.status === 'pending').length,
    waiting: sessions.filter(s => s.status === 'waiting').length,
    active: sessions.filter(s => s.status === 'active').length,
    closed: sessions.filter(s => s.status === 'closed').length,
  };

  return (
    <AdminLayout>
      <div className='p-6'>
        <div className='flex items-center justify-between mb-6'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>Live Chat Support</h1>
            <p className='text-gray-600 mt-1'>Manage customer chat sessions</p>
          </div>
        </div>

        {/* Stats */}
        <div className='grid grid-cols-1 md:grid-cols-5 gap-4 mb-6'>
          <div className='bg-white rounded-lg border border-gray-200 p-4'>
            <p className='text-sm text-gray-600 mb-1'>Total Chats</p>
            <p className='text-2xl font-bold text-gray-900'>{stats.total}</p>
          </div>
          <div className='bg-orange-50 rounded-lg border border-orange-200 p-4'>
            <p className='text-sm text-orange-600 mb-1'>Pending Approval</p>
            <p className='text-2xl font-bold text-orange-700'>{stats.pending}</p>
          </div>
          <div className='bg-yellow-50 rounded-lg border border-yellow-200 p-4'>
            <p className='text-sm text-yellow-600 mb-1'>Waiting</p>
            <p className='text-2xl font-bold text-yellow-700'>{stats.waiting}</p>
          </div>
          <div className='bg-green-50 rounded-lg border border-green-200 p-4'>
            <p className='text-sm text-green-600 mb-1'>Active</p>
            <p className='text-2xl font-bold text-green-700'>{stats.active}</p>
          </div>
          <div className='bg-gray-50 rounded-lg border border-gray-200 p-4'>
            <p className='text-sm text-gray-600 mb-1'>Closed</p>
            <p className='text-2xl font-bold text-gray-700'>{stats.closed}</p>
          </div>
        </div>

        {/* Filters */}
        <div className='bg-white rounded-lg border border-gray-200 p-4 mb-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
              <input
                type='text'
                placeholder='Search by customer name, email, or chat ID...'
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className='w-full pl-10 pr-4 py-[6px] border rounded-lg focus:outline-none focus:ring-2 focus:ring-web'
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='All Status' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Status</SelectItem>
                <SelectItem value='pending'>Pending Approval</SelectItem>
                <SelectItem value='waiting'>Waiting</SelectItem>
                <SelectItem value='active'>Active</SelectItem>
                <SelectItem value='closed'>Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Chat Sessions List */}
        <div className='bg-white rounded-lg border border-gray-200 overflow-hidden'>
          {loading ? (
            <div className='p-12 text-center'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-web mx-auto'></div>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className='p-12 text-center'>
              <MessageSquare className='w-16 h-16 text-gray-400 mx-auto mb-4' />
              <p className='text-gray-600'>No chat sessions found</p>
            </div>
          ) : (
            <div className='divide-y divide-gray-200'>
              {filteredSessions.map(session => (
                <div
                  key={session._id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${session.status !== 'pending' ? 'cursor-pointer' : ''}`}
                  onClick={() => session.status !== 'pending' && router.push(`/admin/chat/${session.chatId}`)}>
                  <div className='flex items-start justify-between'>
                    <div className='flex-1'>
                      <div className='flex items-center gap-2 mb-2'>
                        <div className='w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold flex-shrink-0'>
                          {session.customerName ? session.customerName.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-center gap-2'>
                            {getStatusIcon(session.status)}
                            <h3 className='font-semibold text-gray-900 truncate'>{session.customerName || 'Customer'}</h3>
                            {session.unreadCount > 0 && (
                              <span className='bg-red-500 text-white text-xs px-2 py-1 rounded-full flex-shrink-0'>
                                {session.unreadCount}
                              </span>
                            )}
                          </div>
                          <p className='text-sm text-gray-600 truncate'>{session.customerEmail || session.preChatForm?.email}</p>
                          {session.customerPhone || session.preChatForm?.phone ? (
                            <p className='text-sm text-gray-500 truncate'>{session.customerPhone || session.preChatForm?.phone}</p>
                          ) : null}
                        </div>
                      </div>

                      {/* Pre-chat form details for pending chats */}
                      {session.status === 'pending' && session.preChatForm && (
                        <div className='mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg'>
                          <p className='text-xs font-semibold text-orange-800 mb-2'>Pre-Chat Information:</p>
                          {session.preChatForm.question1 && (
                            <p className='text-xs text-gray-700 mb-1'>
                              <strong>Category:</strong>{' '}
                              <span className='capitalize'>
                                {session.preChatForm.question1 === 'order' && '📦 Order Issue'}
                                {session.preChatForm.question1 === 'product' && '🛍️ Product Question'}
                                {session.preChatForm.question1 === 'payment' && '💳 Payment Issue'}
                                {session.preChatForm.question1 === 'return' && '↩️ Return/Refund'}
                                {session.preChatForm.question1 === 'technical' && '⚙️ Technical Support'}
                                {session.preChatForm.question1 === 'other' && '❓ Other'}
                                {!['order', 'product', 'payment', 'return', 'technical', 'other'].includes(session.preChatForm.question1) &&
                                  session.preChatForm.question1}
                              </span>
                            </p>
                          )}
                          {session.preChatForm.question2 && (
                            <p className='text-xs text-gray-700 mb-1'>
                              <strong>Order/Product:</strong> {session.preChatForm.question2}
                            </p>
                          )}
                          {session.preChatForm.question3 && (
                            <p className='text-xs text-gray-700 mb-1 line-clamp-2'>
                              <strong>Message:</strong> {session.preChatForm.question3}
                            </p>
                          )}
                        </div>
                      )}

                      {session.lastMessage && <p className='text-sm text-gray-500 truncate mt-2'>{session.lastMessage}</p>}
                      <p className='text-xs text-gray-400 mt-1'>
                        {session.lastMessageAt
                          ? new Date(session.lastMessageAt).toLocaleString()
                          : new Date(session.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className='flex items-center gap-2 flex-shrink-0'>
                      {session.status === 'pending' && (
                        <Button
                          onClick={e => {
                            e.stopPropagation();
                            handleApproveChat(session.chatId);
                          }}
                          size='sm'
                          className='bg-green-600 text-white hover:bg-green-700'>
                          Approve Chat
                        </Button>
                      )}
                      {session.status === 'waiting' && !session.adminId && (
                        <Button
                          onClick={e => {
                            e.stopPropagation();
                            handleAssignChat(session.chatId);
                          }}
                          size='sm'
                          className='bg-web text-white'>
                          Assign to Me
                        </Button>
                      )}
                      {session.adminName && <span className='text-xs text-gray-500'>Assigned to: {session.adminName}</span>}
                      {session.status !== 'pending' && (
                        <Link href={`/admin/chat/${session.chatId}`} onClick={e => e.stopPropagation()}>
                          <Button variant='outline' size='sm'>
                            Open Chat
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
