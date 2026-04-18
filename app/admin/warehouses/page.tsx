'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Loader2, Warehouse as WarehouseIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface Warehouse {
  _id: string;
  name: string;
  code?: string;
  pincode: string;
  address: string;
  city: string;
  state: string;
  district?: string;
  country: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  isDefault: boolean;
  isActive: boolean;
}

export default function WarehousesPage() {
  const { toast } = useToast();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showDialog, setShowDialog] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    pincode: '',
    address: '',
    city: '',
    state: '',
    district: '',
    country: 'India',
    contactPerson: '',
    phone: '',
    email: '',
    isDefault: false,
    isActive: true,
  });

  useEffect(() => {
    fetchWarehouses();
  }, [page, searchQuery]);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/warehouses?page=${page}&limit=50&search=${encodeURIComponent(searchQuery)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setWarehouses(data.warehouses || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.pincode || !formData.address || !formData.city || !formData.state) {
        toast({
          title: 'Error',
          description: 'Please fill all required fields',
          variant: 'destructive',
        });
        return;
      }

      const token = localStorage.getItem('adminToken');
      const url = editingWarehouse ? `/api/admin/warehouses/${editingWarehouse._id}` : '/api/admin/warehouses';
      const method = editingWarehouse ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: editingWarehouse ? 'Warehouse updated successfully' : 'Warehouse added successfully',
          variant: 'success',
        });
        setShowDialog(false);
        setEditingWarehouse(null);
        resetForm();
        fetchWarehouses();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to save warehouse',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving warehouse:', error);
      toast({
        title: 'Error',
        description: 'Failed to save warehouse',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this warehouse?')) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/warehouses/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Warehouse deleted successfully',
          variant: 'success',
        });
        fetchWarehouses();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to delete warehouse',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting warehouse:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete warehouse',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      code: warehouse.code || '',
      pincode: warehouse.pincode,
      address: warehouse.address,
      city: warehouse.city,
      state: warehouse.state,
      district: warehouse.district || '',
      country: warehouse.country || 'India',
      contactPerson: warehouse.contactPerson || '',
      phone: warehouse.phone || '',
      email: warehouse.email || '',
      isDefault: warehouse.isDefault || false,
      isActive: warehouse.isActive !== undefined ? warehouse.isActive : true,
    });
    setShowDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      pincode: '',
      address: '',
      city: '',
      state: '',
      district: '',
      country: 'India',
      contactPerson: '',
      phone: '',
      email: '',
      isDefault: false,
      isActive: true,
    });
  };

  const handleAddNew = () => {
    setEditingWarehouse(null);
    resetForm();
    setShowDialog(true);
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Warehouses</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Manage your warehouse locations</p>
          </div>
          <Button onClick={handleAddNew} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Warehouse
          </Button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search warehouses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : warehouses.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <WarehouseIcon className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <p>No warehouses found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left p-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Name</th>
                    <th className="text-left p-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Code</th>
                    <th className="text-left p-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Pincode</th>
                    <th className="text-left p-3 text-sm font-semibold text-slate-700 dark:text-slate-300">City, State</th>
                    <th className="text-left p-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Status</th>
                    <th className="text-right p-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {warehouses.map((warehouse) => (
                    <tr key={warehouse._id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="p-3">
                        <div className="font-medium">{warehouse.name}</div>
                        {warehouse.isDefault && (
                          <Badge variant="default" className="mt-1 text-xs">Default</Badge>
                        )}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">{warehouse.code || '-'}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">{warehouse.pincode}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        {warehouse.city}, {warehouse.state}
                      </td>
                      <td className="p-3">
                        <Badge variant={warehouse.isActive ? 'default' : 'secondary'}>
                          {warehouse.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(warehouse)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(warehouse._id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-slate-600 dark:text-slate-400">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingWarehouse ? 'Edit Warehouse' : 'Add Warehouse'}</DialogTitle>
              <DialogDescription>
                {editingWarehouse ? 'Update warehouse details' : 'Add a new warehouse location'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Warehouse Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Main Warehouse"
                  />
                </div>
                <div>
                  <Label>Warehouse Code</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="WH-001"
                  />
                </div>
              </div>

              <div>
                <Label>Pincode *</Label>
                <Input
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  placeholder="110001"
                  maxLength={6}
                />
              </div>

              <div>
                <Label>Address *</Label>
                <Textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Complete address"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>City *</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Delhi"
                  />
                </div>
                <div>
                  <Label>State *</Label>
                  <Input
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="Delhi"
                  />
                </div>
                <div>
                  <Label>District</Label>
                  <Input
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    placeholder="Central Delhi"
                  />
                </div>
              </div>

              <div>
                <Label>Country</Label>
                <Input
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="India"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Contact Person</Label>
                  <Input
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="warehouse@example.com"
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Set as Default Warehouse</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Active</span>
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingWarehouse ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

