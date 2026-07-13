import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Tag, Percent, DollarSign, Calendar, X, Check } from 'lucide-react';
import { AdminLayout } from '@/pages/admin/dashboard';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { Coupon } from '@/lib/types';

export default function AdminCoupons() {
  return (
    <AdminLayout title="Coupon Management">
      <CouponsContent />
    </AdminLayout>
  );
}

function CouponsContent() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const { toast } = useToast();

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCoupons(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;

    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ type: 'error', message: 'Failed to delete coupon' });
    } else {
      toast({ type: 'success', message: 'Coupon deleted' });
      fetchCoupons();
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    const { error } = await supabase
      .from('coupons')
      .update({ is_active: !coupon.is_active })
      .eq('id', coupon.id);

    if (error) {
      toast({ type: 'error', message: 'Failed to update coupon' });
    } else {
      toast({ type: 'success', message: `Coupon ${!coupon.is_active ? 'activated' : 'deactivated'}` });
      fetchCoupons();
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'No limit';
    return new Date(date).toLocaleDateString();
  };

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.coupon_type === 'percentage') {
      return `${coupon.discount_value}% off`;
    }
    return `KES ${coupon.discount_value.toLocaleString()} off`;
  };

  const isExpired = (coupon: Coupon) => {
    if (!coupon.end_date) return false;
    return new Date(coupon.end_date) < new Date();
  };

  const isExhausted = (coupon: Coupon) => {
    if (!coupon.max_uses) return false;
    return coupon.current_uses >= coupon.max_uses;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-gray-600">Manage discount coupons for your customers</p>
        <button
          onClick={() => {
            setEditingCoupon(null);
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Coupon
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading coupons...</div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">No coupons created yet</p>
          <button
            onClick={() => setShowModal(true)}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Create your first coupon
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Validity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-gray-400" />
                      <span className="font-mono font-medium text-gray-900">{coupon.code}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{formatDiscount(coupon)}</span>
                    {coupon.min_order_value && (
                      <p className="text-xs text-gray-500">Min: KES {coupon.min_order_value.toLocaleString()}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {coupon.current_uses}
                      {coupon.max_uses && ` / ${coupon.max_uses}`}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Until {formatDate(coupon.end_date)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {isExpired(coupon) ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">Expired</span>
                      ) : isExhausted(coupon) ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">Exhausted</span>
                      ) : coupon.is_active ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Active</span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">Inactive</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggleActive(coupon)}
                        className={`p-2 rounded-lg ${
                          coupon.is_active
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-gray-400 hover:bg-gray-50'
                        }`}
                        title={coupon.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {coupon.is_active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => {
                          setEditingCoupon(coupon);
                          setShowModal(true);
                        }}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(coupon.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {showModal && (
        <CouponModal
          coupon={editingCoupon}
          onClose={() => {
            setShowModal(false);
            setEditingCoupon(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setEditingCoupon(null);
            fetchCoupons();
          }}
        />
      )}
    </div>
  );
}

function CouponModal({
  coupon,
  onClose,
  onSuccess
}: {
  coupon: Coupon | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [code, setCode] = useState(coupon?.code || '');
  const [couponType, setCouponType] = useState<'percentage' | 'fixed'>(coupon?.coupon_type || 'percentage');
  const [discountValue, setDiscountValue] = useState(coupon?.discount_value?.toString() || '');
  const [minOrderValue, setMinOrderValue] = useState(coupon?.min_order_value?.toString() || '');
  const [maxUses, setMaxUses] = useState(coupon?.max_uses?.toString() || '');
  const [startDate, setStartDate] = useState(
    coupon?.start_date ? new Date(coupon.start_date).toISOString().split('T')[0] : ''
  );
  const [endDate, setEndDate] = useState(
    coupon?.end_date ? new Date(coupon.end_date).toISOString().split('T')[0] : ''
  );
  const [appliesTo, setAppliesTo] = useState<string>(coupon?.applies_to || 'all');
  const [isActive, setIsActive] = useState(coupon?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim()) {
      toast({ type: 'error', message: 'Coupon code is required' });
      return;
    }

    const discount = parseFloat(discountValue);
    if (isNaN(discount) || discount <= 0) {
      toast({ type: 'error', message: 'Valid discount value is required' });
      return;
    }

    if (couponType === 'percentage' && discount > 100) {
      toast({ type: 'error', message: 'Percentage discount cannot exceed 100%' });
      return;
    }

    setSaving(true);

    const couponData = {
      code: code.toUpperCase().trim(),
      coupon_type: couponType,
      discount_value: discount,
      min_order_value: minOrderValue ? parseFloat(minOrderValue) : null,
      max_uses: maxUses ? parseInt(maxUses) : null,
      start_date: startDate || null,
      end_date: endDate || null,
      applies_to: appliesTo,
      is_active: isActive
    };

    let error;
    if (coupon) {
      const result = await supabase
        .from('coupons')
        .update(couponData)
        .eq('id', coupon.id);
      error = result.error;
    } else {
      const result = await supabase
        .from('coupons')
        .insert({ ...couponData, current_uses: 0 });
      error = result.error;
    }

    setSaving(false);

    if (error) {
      if (error.code === '23505') {
        toast({ type: 'error', message: 'Coupon code already exists' });
      } else {
        toast({ type: 'error', message: 'Failed to save coupon' });
      }
    } else {
      toast({ type: 'success', message: `Coupon ${coupon ? 'updated' : 'created'}` });
      onSuccess();
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let generated = '';
    for (let i = 0; i < 8; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(generated);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">{coupon ? 'Edit Coupon' : 'Create Coupon'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 font-mono"
                placeholder="SUMMER2024"
                maxLength={20}
              />
              <button
                type="button"
                onClick={generateCode}
                className="btn-secondary text-sm"
              >
                Generate
              </button>
            </div>
          </div>

          {/* Discount Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCouponType('percentage')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border ${
                  couponType === 'percentage'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <Percent className="w-4 h-4" />
                Percentage
              </button>
              <button
                type="button"
                onClick={() => setCouponType('fixed')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border ${
                  couponType === 'fixed'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                Fixed Amount
              </button>
            </div>
          </div>

          {/* Discount Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Discount Value {couponType === 'percentage' ? '(%)' : '(KES)'}
            </label>
            <input
              type="number"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder={couponType === 'percentage' ? '10' : '500'}
              min="0"
              max={couponType === 'percentage' ? '100' : undefined}
              step={couponType === 'percentage' ? '1' : '100'}
            />
          </div>

          {/* Min Order Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Order Value (KES)
            </label>
            <input
              type="number"
              value={minOrderValue}
              onChange={(e) => setMinOrderValue(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="No minimum"
              min="0"
              step="100"
            />
          </div>

          {/* Max Uses */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Uses</label>
            <input
              type="number"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Unlimited"
              min="0"
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Applies To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Applies To</label>
            <select
              value={appliesTo}
              onChange={(e) => setAppliesTo(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Products</option>
              <option value="products">Specific Products</option>
              <option value="categories">Specific Categories</option>
            </select>
          </div>

          {/* Active Status */}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Active (available for use)</span>
          </label>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : coupon ? 'Update Coupon' : 'Create Coupon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
