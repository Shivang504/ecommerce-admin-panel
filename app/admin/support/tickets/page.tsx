'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, Clock, CheckCircle, XCircle, AlertCircle, Filter, Search, User, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdminLayout } from '@/components/layout/admin-layout';
import Dropdown from '@/components/customDropdown/customDropdown';

interface Ticket {
  _id: string;
  ticketNumber: string;
  customerId: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  messages?: Array<{ message: string; senderType: string }>;
}

export default function AdminTicketsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: '',
    search: '',
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchTickets();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, filters.status, filters.priority, filters.category, filters.search]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.category) params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`/api/admin/support/tickets?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch tickets' }));
        toast({
          title: 'Error',
          description: errorData.error || 'Failed to fetch tickets',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error fetching tickets:', error);
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setFilters({ ...filters, search: value });
    setPage(1); // Reset to first page on search
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/support/tickets?stats=true', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      } else {
        // Don't show error toast for stats, just log it
        console.error('Error fetching stats:', await response.json().catch(() => ({})));
      }
    } catch (error) {
      // Don't show error toast for stats, just log it
      console.error('Error fetching stats:', error);
    }
  };

  const handleUpdateStatus = async (ticketId: string, status: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/support/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Ticket status updated',
          variant: 'success',
        });
        fetchTickets();
        fetchStats();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update ticket',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className='w-4 h-4 text-blue-600' />;
      case 'in-progress':
        return <Clock className='w-4 h-4 text-yellow-600' />;
      case 'resolved':
        return <CheckCircle className='w-4 h-4 text-green-600' />;
      case 'closed':
        return <XCircle className='w-4 h-4 text-gray-600' />;
      default:
        return <MessageSquare className='w-4 h-4' />;
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (page <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = page - 1; i <= page + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <AdminLayout>
      <div className='p-3'>
        <div className='flex items-center justify-between mb-6'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>Support Tickets</h1>
            <p className='text-gray-600 mt-1'>Manage customer support tickets</p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className='grid grid-cols-1 md:grid-cols-5 gap-4 mb-6'>
            <div className='bg-white rounded-lg border border-gray-200 p-4'>
              <p className='text-sm text-gray-600 mb-1'>Total</p>
              <p className='text-2xl font-bold text-gray-900'>{stats.total}</p>
            </div>
            <div className='bg-blue-50 rounded-lg border border-blue-200 p-4'>
              <p className='text-sm text-blue-600 mb-1'>Open</p>
              <p className='text-2xl font-bold text-blue-700'>{stats.open}</p>
            </div>
            <div className='bg-yellow-50 rounded-lg border border-yellow-200 p-4'>
              <p className='text-sm text-yellow-600 mb-1'>In Progress</p>
              <p className='text-2xl font-bold text-yellow-700'>{stats.inProgress}</p>
            </div>
            <div className='bg-green-50 rounded-lg border border-green-200 p-4'>
              <p className='text-sm text-green-600 mb-1'>Resolved</p>
              <p className='text-2xl font-bold text-green-700'>{stats.resolved}</p>
            </div>
            <div className='bg-gray-50 rounded-lg border border-gray-200 p-4'>
              <p className='text-sm text-gray-600 mb-1'>Closed</p>
              <p className='text-2xl font-bold text-gray-700'>{stats.closed}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className='bg-white rounded-lg border border-gray-200 p-4 mb-6'>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
              <Input
                type='text'
                placeholder='Search by ticket number, subject...'
                value={filters.search}
                onChange={e => handleSearchChange(e.target.value)}
                className='h-[46px] pl-10'
              />
            </div>
            <Dropdown
              options={[
                { value: '', label: 'All Status' },
                { value: 'open', label: 'Open' },
                { value: 'in-progress', label: 'In Progress' },
                { value: 'resolved', label: 'Resolved' },
                { value: 'closed', label: 'Closed' },
              ]}
              placeholder='All Status'
              value={filters.status}
              onChange={option => setFilters({ ...filters, status: option.value })}
            />
            <Dropdown
              options={[
                { value: '', label: 'All Priority' },
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' },
              ]}
              placeholder='All Priority'
              value={filters.priority}
              onChange={option => setFilters({ ...filters, priority: option.value })}
            />
            <Dropdown
              options={[
                { value: '', label: 'All Categories' },
                { value: 'order', label: 'Order' },
                { value: 'product', label: 'Product' },
                { value: 'payment', label: 'Payment' },
                { value: 'shipping', label: 'Shipping' },
                { value: 'return', label: 'Return' },
                { value: 'other', label: 'Other' },
              ]}
              placeholder='All Categories'
              value={filters.category}
              onChange={option => setFilters({ ...filters, category: option.value })}
            />
          </div>
        </div>

        {/* Tickets Table */}
        <div className='bg-white rounded-lg border border-gray-200 overflow-hidden'>
          {loading ? (
            <div className='p-12 text-center'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-web mx-auto'></div>
            </div>
          ) : tickets.length === 0 ? (
            <div className='p-12 text-center'>
              <MessageSquare className='w-16 h-16 text-gray-400 mx-auto mb-4' />
              <p className='text-gray-600'>No tickets found</p>
            </div>
          ) : (
            <>
              <div className='px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50'>
                <div className='text-sm text-gray-600'>
                  Showing <span className='font-medium'>{(page - 1) * limit + 1}</span> to{' '}
                  <span className='font-medium'>{Math.min(page * limit, total)}</span> of{' '}
                  <span className='font-medium'>{total}</span> tickets
                </div>
                <div className='flex items-center gap-2'>
                  <span className='text-sm text-gray-600'>Items per page:</span>
                  <select
                    value={limit}
                    onChange={e => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className='border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-web'>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
              <div className='overflow-x-auto'>
                <table className='w-full'>
                  <thead className='bg-gray-50 border-b border-gray-200'>
                    <tr>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Ticket</th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Subject</th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Category</th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Priority</th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Status</th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Created</th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Actions</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-200'>
                    {tickets.map(ticket => (
                    <tr key={ticket._id} className='hover:bg-gray-50'>
                      <td className='px-6 py-4'>
                        <span className='font-mono text-sm text-gray-600'>{ticket.ticketNumber}</span>
                      </td>
                      <td className='px-6 py-4'>
                        <Link href={`/admin/support/tickets/${ticket._id}`} className='text-web hover:underline font-medium'>
                          {ticket.subject}
                        </Link>
                      </td>
                      <td className='px-6 py-4 text-sm text-gray-600 capitalize'>{ticket.category}</td>
                      <td className='px-6 py-4'>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            ticket.priority === 'urgent'
                              ? 'bg-red-100 text-red-700'
                              : ticket.priority === 'high'
                              ? 'bg-orange-100 text-orange-700'
                              : ticket.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className='px-6 py-4'>
                        <select
                          value={ticket.status}
                          onChange={e => handleUpdateStatus(ticket._id, e.target.value)}
                          className='text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-web'>
                          <option value='open'>Open</option>
                          <option value='in-progress'>In Progress</option>
                          <option value='resolved'>Resolved</option>
                          <option value='closed'>Closed</option>
                        </select>
                      </td>
                      <td className='px-6 py-4 text-sm text-gray-600'>{new Date(ticket.createdAt).toLocaleDateString()}</td>
                      <td className='px-6 py-4'>
                        <Link href={`/admin/support/tickets/${ticket._id}`}>
                          <Button variant='outline' size='sm'>
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className='px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50'>
              <div className='flex items-center gap-2'>
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className='px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 text-sm font-medium'>
                  First
                </button>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className='px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 text-sm font-medium'>
                  Previous
                </button>
              </div>
              
              <div className='flex items-center gap-1'>
                {getPageNumbers().map((pageNum, index) => (
                  <button
                    key={index}
                    onClick={() => typeof pageNum === 'number' && setPage(pageNum)}
                    disabled={typeof pageNum === 'string' || pageNum === page}
                    className={`px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium min-w-[40px] ${
                      pageNum === page
                        ? 'bg-web text-white border-web'
                        : typeof pageNum === 'string'
                        ? 'cursor-default border-transparent'
                        : 'hover:bg-gray-100 disabled:opacity-50'
                    }`}>
                    {pageNum}
                  </button>
                ))}
              </div>
              
              <div className='flex items-center gap-2'>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className='px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 text-sm font-medium'>
                  Next
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className='px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 text-sm font-medium'>
                  Last
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
