import { useState, useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { Trash2, ShoppingCart, ArrowLeft, Minus, Plus, Tag, X, Truck } from 'lucide-react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { useCart } from '@/hooks/use-cart';
import { useDeliveryZones } from '@/hooks/use-data';
import { formatKES } from '@/lib/utils';
import { getProductPlaceholder, withFallback } from '@/lib/placeholders';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface FormData {
  name: string;
  email: string;
  phone: string;
  notes: string;
  deliveryAddress: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
}

interface AppliedCoupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  discountAmount: number;
}

export default function Cart() {
  const { items, removeFromCart, updateQuantity, clearCart, totalPrice } = useCart();
  const { zones } = useDeliveryZones();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [form, setForm] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    notes: '',
    deliveryAddress: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const selectedZone = zones.find((z) => z.id === selectedZoneId);
  const deliveryCharge = useMemo(() => {
    if (!selectedZone) return 0;
    if (selectedZone.free_delivery_minimum != null && totalPrice >= selectedZone.free_delivery_minimum) return 0;
    return selectedZone.base_charge || 0;
  }, [selectedZone, totalPrice]);

  const discountAmount = appliedCoupon?.discountAmount || 0;
  const finalTotal = Math.max(totalPrice + deliveryCharge - discountAmount, 0);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    setCouponError('');
    try {
      const { data, error } = await supabase.rpc('validate_coupon', {
        p_code: couponCode.trim(),
        p_order_total: totalPrice,
      });
      if (error) throw error;

      const result = data?.[0];
      if (!result || !result.valid) {
        setCouponError(result?.message || 'Invalid coupon code');
        setAppliedCoupon(null);
        return;
      }

      setAppliedCoupon({
        id: result.coupon_id,
        code: couponCode.trim().toUpperCase(),
        type: result.coupon_type,
        value: result.discount_value,
        discountAmount: result.discount_amount,
      });
      toast({ title: 'Coupon applied', description: `You saved ${formatKES(result.discount_amount)}` });
    } catch {
      setCouponError('Could not validate coupon right now. Please try again.');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    if (!form.phone.trim()) e.phone = 'Phone is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      // Places the customer + order + order_items atomically via a
      // SECURITY DEFINER RPC. This lets an anonymous shopper check out
      // without needing SELECT/UPDATE/DELETE rights on customer data,
      // which is enforced by RLS everywhere else in the database.
      // Delivery fee and coupon discount were computed from
      // server-validated data (active delivery zone rows, and the
      // validate_coupon RPC), so the final total sent here is trustworthy.
      const { data: orderId, error } = await supabase.rpc('create_customer_order', {
        p_name: form.name,
        p_email: form.email,
        p_phone: form.phone,
        p_notes: form.notes || null,
        p_total_amount: finalTotal,
        p_items: items.map((item) => ({
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.price,
        })),
        p_coupon_id: appliedCoupon?.id || null,
        p_delivery_zone_id: selectedZoneId || null,
        p_delivery_address: form.deliveryAddress || null,
        p_delivery_charge: deliveryCharge,
        p_discount_amount: discountAmount,
      });

      if (error) throw error;

      // Stash a summary for the confirmation page to display. We don't
      // grant anon a SELECT policy on `orders` (it would let anyone read
      // any order by guessing/enumerating IDs), so this is the safe way
      // to show a real receipt right after checkout without a server
      // round-trip that RLS would block anyway.
      try {
        sessionStorage.setItem(
          `order_summary_${orderId}`,
          JSON.stringify({
            items: items.map((item) => ({ name: item.product.name, quantity: item.quantity, price: item.product.price })),
            subtotal: totalPrice,
            deliveryCharge,
            discountAmount,
            total: finalTotal,
            deliveryZoneName: selectedZone?.zone_name || null,
            deliveryAddress: form.deliveryAddress || null,
          })
        );
      } catch {
        // sessionStorage can fail in private browsing on some browsers -
        // non-critical, the confirmation page just falls back to the
        // generic message if the summary isn't there.
      }

      clearCart();
      setLocation(`/order-confirmation/${orderId}`);
    } catch {
      toast({
        title: 'Order Failed',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <CustomerLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingCart className="w-8 h-8 text-gray-400" />
            </div>
            <h1 className="font-display text-2xl font-bold text-gray-900 mb-4">
              Your cart is empty
            </h1>
            <p className="text-gray-500 mb-8">
              Add some products to get started with your order.
            </p>
            <Link href="/shop" className="btn-primary">
              Browse Products
            </Link>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Continue Shopping
          </Link>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <h1 className="font-display text-2xl font-bold text-gray-900 mb-6">
                Your Cart ({items.length} {items.length === 1 ? 'item' : 'items'})
              </h1>

              <div className="space-y-4">
                {items.map(({ product, quantity }) => (
                  <div key={product.id} className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
                    <div className="flex gap-4">
                      <Link href={`/product/${product.slug}`} className="flex-shrink-0">
                        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden bg-gray-100">
                          <img
                            src={withFallback(product.image_url, getProductPlaceholder(product.category?.slug || product.category?.name))}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/product/${product.slug}`}
                          className="font-semibold text-gray-900 hover:text-primary-600 line-clamp-2"
                        >
                          {product.name}
                        </Link>
                        <p className="text-sm text-gray-500 mt-1">
                          {formatKES(product.price)} / {product.unit}
                        </p>
                        <div className="flex items-center gap-4 mt-4">
                          <div className="flex items-center border border-gray-300 rounded-lg">
                            <button
                              onClick={() => updateQuantity(product.id, quantity - 1)}
                              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-10 text-center text-sm font-medium">
                              {quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(product.id, quantity + 1)}
                              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="font-semibold text-gray-900">
                            {formatKES(product.price * quantity)}
                          </p>
                          <button
                            onClick={() => removeFromCart(product.id)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg ml-auto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Checkout Form */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl p-6 border border-gray-200 sticky top-24">
                <h2 className="font-display text-lg font-bold text-gray-900 mb-4">
                  Order Summary
                </h2>

                <div className="space-y-3 pb-4 border-b border-gray-200">
                  {items.map(({ product, quantity }) => (
                    <div key={product.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {product.name} x {quantity}
                      </span>
                      <span className="font-medium">{formatKES(product.price * quantity)}</span>
                    </div>
                  ))}
                </div>

                {/* Delivery Zone */}
                {zones.length > 0 && (
                  <div className="py-4 border-b border-gray-200">
                    <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Truck className="w-4 h-4" /> Delivery Area
                    </label>
                    <select
                      value={selectedZoneId}
                      onChange={(e) => setSelectedZoneId(e.target.value)}
                      className="input text-sm"
                    >
                      <option value="">Select your area (optional)</option>
                      {zones.map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.zone_name} - {zone.base_charge ? formatKES(zone.base_charge) : 'Free'}
                          {zone.estimated_days ? ` (${zone.estimated_days})` : ''}
                        </option>
                      ))}
                    </select>
                    {selectedZone && (
                      <input
                        type="text"
                        value={form.deliveryAddress}
                        onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })}
                        placeholder="Delivery address / landmark"
                        className="input text-sm mt-2"
                      />
                    )}
                  </div>
                )}

                {/* Coupon */}
                <div className="py-4 border-b border-gray-200">
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between bg-green-50 text-green-700 rounded-lg px-3 py-2 text-sm">
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-4 h-4" /> {appliedCoupon.code} applied
                      </span>
                      <button onClick={removeCoupon}><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Tag className="w-4 h-4" /> Coupon Code
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          placeholder="Enter code"
                          className="input text-sm flex-1"
                        />
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          disabled={validatingCoupon || !couponCode.trim()}
                          className="btn-secondary text-sm px-4"
                        >
                          {validatingCoupon ? '...' : 'Apply'}
                        </button>
                      </div>
                      {couponError && <p className="text-red-500 text-xs mt-1">{couponError}</p>}
                    </div>
                  )}
                </div>

                <div className="py-4 border-b border-gray-200 space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span>
                    <span>{formatKES(totalPrice)}</span>
                  </div>
                  {deliveryCharge > 0 && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Delivery</span>
                      <span>{formatKES(deliveryCharge)}</span>
                    </div>
                  )}
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-{formatKES(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-1">
                    <span>Total</span>
                    <span>{formatKES(finalTotal)}</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <h3 className="font-semibold text-gray-900">Your Details</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className={`input ${errors.name ? 'border-red-500' : ''}`}
                      placeholder="John Doe"
                    />
                    {errors.name && (
                      <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className={`input ${errors.email ? 'border-red-500' : ''}`}
                      placeholder="john@example.com"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className={`input ${errors.phone ? 'border-red-500' : ''}`}
                      placeholder="+254 700 123 456"
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes (optional)
                    </label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      className="input min-h-[80px] resize-none"
                      placeholder="Special instructions..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary w-full"
                  >
                    {submitting ? 'Processing...' : `Place Order - ${formatKES(finalTotal)}`}
                  </button>

                  <p className="text-xs text-gray-500 text-center">
                    We'll contact you to confirm your order and arrange delivery.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
