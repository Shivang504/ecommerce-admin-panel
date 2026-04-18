'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, User, MessageSquare, Loader2, Lock, Unlock, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { AdminLayout } from '@/components/layout/admin-layout';

interface ChatMessage {
  _id: string;
  chatId: string;
  senderId: string;
  senderType: 'customer' | 'admin';
  senderName?: string;
  message: string;
  createdAt: string;
  read: boolean;
}

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
}

export default function AdminChatDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchChat();
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [params.chatId]);

  useEffect(() => {
    // Only scroll if we're already near the bottom (to avoid jumping when user scrolls up)
    if (messagesEndRef.current) {
      const messagesContainer = messagesEndRef.current.closest('.overflow-y-auto');
      if (messagesContainer) {
        const isNearBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 200;
        if (isNearBottom) {
          // Use requestAnimationFrame to ensure DOM is updated
          requestAnimationFrame(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          });
        }
      } else {
        // Fallback: always scroll if we can't detect position
        requestAnimationFrame(() => {
          scrollToBottom();
        });
      }
    }
  }, [messages]);

  useEffect(() => {
    if (!session || session.status === 'closed' || session.status === 'pending') return;

    // Poll for new messages every 3 seconds (only for active chats)
    pollingIntervalRef.current = setInterval(() => {
      fetchMessages();
    }, 3000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [session]);

  const fetchChat = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/chat/sessions?chatId=${params.chatId}`);

      if (response.ok) {
        const data = await response.json();
        setSession(data.session);
        // Only update messages if they're different (to avoid scroll jumps)
        setMessages(prev => {
          const newMessages = data.messages || [];
          // If messages are the same, don't update to avoid scroll jump
          if (prev.length === newMessages.length && 
              prev.every((msg, idx) => msg._id === newMessages[idx]?._id)) {
            return prev;
          }
          return newMessages;
        });
      } else {
        toast({
          title: 'Error',
          description: 'Chat not found',
          variant: 'destructive',
        });
        router.push('/admin/chat');
      }
    } catch (error) {
      console.error('Error fetching chat:', error);
      toast({
        title: 'Error',
        description: 'Failed to load chat',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/chat/messages?chatId=${params.chatId}&limit=100`);

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        markAsRead();
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const markAsRead = async () => {
    try {
      await fetch(`/api/chat/messages?chatId=${params.chatId}`, {
        method: 'PUT',
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !session || sending) return;

    setSending(true);
    try {
      // Get admin token from localStorage or cookie
      const adminToken = localStorage.getItem('adminToken');

      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Note: adminToken cookie should be set automatically, but we can also check it
        },
        credentials: 'include', // Important: include cookies (adminToken cookie)
        body: JSON.stringify({
          chatId: session.chatId,
          message: message.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Add message optimistically
        setMessages(prev => {
          // Check if message already exists to avoid duplicates
          const exists = prev.some(m => m._id === data.message._id);
          return exists ? prev : [...prev, data.message];
        });
        setMessage('');
        // Scroll to bottom immediately after state update
        requestAnimationFrame(() => {
          setTimeout(() => {
            scrollToBottom();
          }, 50);
        });
        // Don't call fetchChat - let the polling handle updates to avoid scroll jump
      } else {
        toast({
          title: 'Error',
          description: 'Failed to send message',
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

  const handleAssignToMe = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/chat/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify({ chatId: session?.chatId, action: 'assign' }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Chat assigned to you',
          variant: 'success',
        });
        fetchChat();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to assign chat',
        variant: 'destructive',
      });
    }
  };

  const handleCloseChat = async () => {
    if (!confirm("Are you sure you want to close this chat? The customer will be notified and won't be able to send more messages.")) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/chat/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify({ chatId: session?.chatId, action: 'close' }),
      });

      if (response.ok) {
        toast({
          title: 'Chat Closed',
          description: 'Chat has been closed. Customer has been notified.',
          variant: 'success',
        });
        fetchChat();

        // Send a closing message to the customer
        try {
          await fetch('/api/chat/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chatId: session?.chatId,
              message:
                'Thank you for contacting us. This chat session has been closed. If you need further assistance, please start a new chat.',
            }),
          });
        } catch (e) {
          // Ignore error if message can't be sent
        }
      } else {
        const errorData = await response.json();
        toast({
          title: 'Error',
          description: errorData.error || 'Failed to close chat',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to close chat',
        variant: 'destructive',
      });
    }
  };

  const handleApproveChat = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/chat/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify({ chatId: session?.chatId, action: 'approve' }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Chat approved and assigned to you',
          variant: 'success',
        });
        fetchChat();
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

  const handleReopenChat = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/chat/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify({ chatId: session?.chatId, action: 'reopen' }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Chat reopened',
          variant: 'success',
        });
        fetchChat();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reopen chat',
        variant: 'destructive',
      });
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      // Find the scrollable container (the messages div)
      const messagesContainer = messagesEndRef.current.closest('.overflow-y-auto');
      if (messagesContainer) {
        // Use instant scroll to avoid jump, then smooth scroll if needed
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      } else {
        // Fallback to scrollIntoView
        messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
      }
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className='flex items-center justify-center h-[calc(100vh-120px)]'>
          <div className='text-center'>
            <div className='w-12 h-12 rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-green-600 animate-spin mx-auto mb-4'></div>
            <p className='text-slate-600 dark:text-slate-400 font-medium'>Loading chat...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <AdminLayout>
      <div className='flex flex-col h-[calc(100vh-120px)] overflow-hidden'>
        {/* Header */}
        <div className='bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between shadow-sm'>
          <div className='flex items-center gap-4 flex-1 min-w-0'>
            <Link href='/admin/chat'>
              <Button variant='outline'>
                <ArrowLeft className='w-4 h-4' />
              </Button>
            </Link>
            <div className='flex items-center gap-3 flex-1 min-w-0'>
              <div className='w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 shadow-sm'>
                <User className='w-5 h-5' />
              </div>
              <div className='flex-1 min-w-0'>
                <h2 className='font-semibold text-lg text-slate-900 dark:text-slate-100 truncate'>{session.customerName || 'Customer'}</h2>
                <div className='flex items-center gap-2 mt-0.5'>
                  {session.customerEmail && <p className='text-sm text-slate-600 dark:text-slate-400 truncate'>{session.customerEmail}</p>}
                  <span className='text-xs text-slate-500 dark:text-slate-500'>
                    {session.status === 'pending' && '• Pending approval'}
                    {session.status === 'waiting' && '• Waiting for assignment'}
                    {session.status === 'active' && session.adminName && `• Assigned to ${session.adminName}`}
                    {session.status === 'closed' && '• Closed'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className='flex items-center gap-2 flex-shrink-0'>
            {session.status === 'pending' && (
              <Button onClick={handleApproveChat} size='sm' className='bg-green-600 hover:bg-green-700 text-white shadow-sm'>
                <Unlock className='w-4 h-4 mr-2' />
                Approve & Start
              </Button>
            )}
            {session.status === 'waiting' && !session.adminId && (
              <Button onClick={handleAssignToMe} size='sm' variant='outline'>
                Assign to Me
              </Button>
            )}
            {session.status === 'active' && (
              <Button
                onClick={handleCloseChat}
                size='sm'
                variant='outline'
                className='text-red-600 hover:text-red-700 border-red-200 hover:border-red-300'>
                <Lock className='w-4 h-4 mr-2' />
                Close Chat
              </Button>
            )}
            {session.status === 'closed' && (
              <Button onClick={handleReopenChat} size='sm' className='bg-green-600 hover:bg-green-700 text-white shadow-sm'>
                <Unlock className='w-4 h-4 mr-2' />
                Reopen
              </Button>
            )}
          </div>
        </div>

        {/* Pre-chat Form Info (for pending chats) */}
        {session.status === 'pending' && session.preChatForm && (
          <div className='px-6 py-5 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-200 dark:border-amber-800'>
            <div className='flex items-center gap-3 mb-5'>
              <div className='w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center'>
                <MessageSquare className='w-5 h-5 text-amber-600 dark:text-amber-400' />
              </div>
              <div>
                <h3 className='text-lg font-semibold text-slate-900 dark:text-slate-100'>Pre-Chat Form Information</h3>
                <p className='text-sm text-slate-600 dark:text-slate-400'>Review customer details before approving</p>
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'>
              {session.preChatForm.name && (
                <div>
                  <p className='text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide'>Name</p>
                  <p className='text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700'>
                    {session.preChatForm.name}
                  </p>
                </div>
              )}
              <div>
                <p className='text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide'>Email</p>
                <p className='text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700'>
                  {session.preChatForm.email}
                </p>
              </div>
              {session.preChatForm.phone && (
                <div>
                  <p className='text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide'>Phone</p>
                  <p className='text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700'>
                    {session.preChatForm.phone}
                  </p>
                </div>
              )}
              {session.preChatForm.question1 && (
                <div>
                  <p className='text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide'>Category</p>
                  <p className='text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 capitalize'>
                    {session.preChatForm.question1 === 'order' && '📦 Order Issue'}
                    {session.preChatForm.question1 === 'product' && '🛍️ Product Question'}
                    {session.preChatForm.question1 === 'payment' && '💳 Payment Issue'}
                    {session.preChatForm.question1 === 'return' && '↩️ Return/Refund'}
                    {session.preChatForm.question1 === 'technical' && '⚙️ Technical Support'}
                    {session.preChatForm.question1 === 'other' && '❓ Other'}
                    {!['order', 'product', 'payment', 'return', 'technical', 'other'].includes(session.preChatForm.question1) &&
                      session.preChatForm.question1}
                  </p>
                </div>
              )}
            </div>

            {session.preChatForm.question2 && (
              <div className='mb-4'>
                <p className='text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide'>
                  Order ID / Product Reference
                </p>
                <p className='text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700'>
                  {session.preChatForm.question2}
                </p>
              </div>
            )}

            {session.preChatForm.question3 && (
              <div className='mb-4'>
                <p className='text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide'>
                  Message / Description
                </p>
                <p className='text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 whitespace-pre-wrap'>
                  {session.preChatForm.question3}
                </p>
              </div>
            )}

            <div className='mt-5 p-4 bg-white dark:bg-slate-800 rounded-lg border border-amber-300 dark:border-amber-700'>
              <p className='text-sm text-amber-800 dark:text-amber-300 font-medium flex items-center gap-2'>
                <span className='text-lg'>⚠️</span>
                This chat is pending approval. Click "Approve & Start Chat" button above to begin the conversation.
              </p>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className='flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-slate-50 dark:bg-slate-900/50'>
          {session.status === 'pending' ? (
            <div className='text-center py-16'>
              <div className='w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4'>
                <MessageSquare className='w-8 h-8 text-amber-600 dark:text-amber-400' />
              </div>
              <p className='text-slate-600 dark:text-slate-400 font-medium'>Please approve this chat to start messaging</p>
            </div>
          ) : session.status === 'closed' ? (
            <div className='text-center py-16'>
              <div className='bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700 shadow-sm inline-block'>
                <div className='w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-3'>
                  <CheckCircle className='w-6 h-6 text-slate-400 dark:text-slate-500' />
                </div>
                <p className='text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1'>Chat Closed</p>
                <p className='text-xs text-slate-500 dark:text-slate-400'>This chat session has been closed</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className='text-center py-16'>
              <div className='w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4'>
                <MessageSquare className='w-8 h-8 text-green-600 dark:text-green-400' />
              </div>
              <p className='text-slate-600 dark:text-slate-400 font-medium'>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map(msg => {
              // Admin panel: Admin messages on LEFT, Customer messages on RIGHT (WhatsApp style)
              const senderType = msg.senderType || 'unknown';
              const isAdminMessage = senderType === 'admin';

              if (isAdminMessage) {
                // Admin's own message - LEFT side (green bubble, avatar on left)
                return (
                  <div key={msg._id} className='w-full flex justify-start mb-4'>
                    <div className='flex items-start gap-3 max-w-[75%]'>
                      <div className='w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold flex-shrink-0 shadow-sm'>
                        <span>{msg.senderName ? msg.senderName.charAt(0).toUpperCase() : 'A'}</span>
                      </div>
                      <div className='max-w-full rounded-2xl rounded-bl-sm px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm'>
                        {msg.senderName && (
                          <div className='flex items-center gap-1 mb-1'>
                            <span className='text-xs font-semibold text-slate-700 dark:text-slate-300'>{msg.senderName}</span>
                          </div>
                        )}
                        <p className='text-sm whitespace-pre-wrap leading-relaxed text-slate-900 dark:text-slate-100 mb-1'>{msg.message}</p>
                        <p className='text-xs text-slate-500 dark:text-slate-400'>
                          {new Date(msg.createdAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              } else {
                // Customer's message - RIGHT side (blue bubble, avatar on right)
                return (
                  <div key={msg._id} className='w-full flex justify-end mb-4'>
                    <div className='flex items-end gap-3 max-w-[75%]'>
                      <div className='max-w-full rounded-2xl rounded-br-sm px-4 py-2.5 bg-white text-black shadow-sm'>
                        <div className='flex items-center gap-1 mb-1'>
                          <span className='text-xs font-semibold text-black'>{session.customerName || 'Customer'}</span>
                        </div>
                        <p className='text-sm whitespace-pre-wrap leading-relaxed text-black mb-1'>{msg.message}</p>
                        <p className='text-xs text-black'>
                          {new Date(msg.createdAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </p>
                      </div>
                      <div className='w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold flex-shrink-0 shadow-sm'>
                        <span>{session.customerName ? session.customerName.charAt(0).toUpperCase() : 'C'}</span>
                      </div>
                    </div>
                  </div>
                );
              }
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {session.status !== 'pending' && (
          <form
            onSubmit={handleSendMessage}
            className='border-t border-slate-200 dark:border-slate-700 px-6 py-4 bg-white dark:bg-slate-900'>
            <div className='flex gap-3 items-center'>
              <input
                type='text'
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder='Type your message...'
                className='flex-1 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed'
                disabled={sending || session.status === 'closed'}
              />
              <button
                type='submit'
                disabled={sending || !message.trim() || session.status === 'closed'}
                className='bg-green-600 hover:bg-green-700 text-white rounded-lg px-5 py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm'>
                {sending ? <Loader2 className='w-5 h-5 animate-spin' /> : <Send className='w-5 h-5' />}
              </button>
            </div>
            {session.status === 'closed' && (
              <p className='text-xs text-slate-500 dark:text-slate-400 mt-2 text-center'>
                This chat is closed. Reopen it to send messages.
              </p>
            )}
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
