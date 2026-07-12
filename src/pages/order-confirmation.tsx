import { useLocation } from 'wouter';
import { useEffect, useState } from 'react';
import { CheckCircle, Package, Phone } from 'lucide-react';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { Link } from 'wouter';
import { formatKES } from '@/lib/utils';

interface OrderSummary {
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  deliveryCharge: number;
  discountAmount: number;
  total: number;
  deliveryZoneName: string | null;
  deliveryAddress: string | null;
}

export default function OrderConfirmation() {
  const [location] = useLocation();
  const orderId = location.split('/order-confirmation/')[1] || '';
  const [summary, setSummary] = useState<OrderSummary | null>(null);

  useEffect(() => {
    if (!orderId) return;
    try {
      const raw = sessionStorage.getItem(`order_summary_${orderId}`);
      if (raw) {
        setSummary(JSON.parse(raw));
        sessionStorage.removeItem(`order_summary_${orderId}`);
      }
    } catch {
      // ignore - falls back to the generic confirmation
    }
  }, [orderId]);

  return (
    <CustomerLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          <h1 className="font-display text-3xl font-bold text-gray-900 mb-4">
            Order Received!
          </h1>

          <p className="text-gray-600 mb-2">
            Thank you for your order. We've received your request and will contact you
            shortly to confirm the details.
          </p>

          <p className="text-sm text-gray-500 mb-8">
            Order Reference: <span className="font-mono font-medium">{orderId.slice(0, 8).toUpperCase()}</span>
          </p>

          {summary && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8 text-left">
              <h2 className="font-semibold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-2 pb-3 border-b border-gray-100">
                {summary.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.name} x {item.quantity}</span>
                    <span className="font-medium">{formatKES(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="pt-3 space-y-1.5">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatKES(summary.subtotal)}</span>
                </div>
                {summary.deliveryCharge > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Delivery{summary.deliveryZoneName ? ` (${summary.deliveryZoneName})` : ''}</span>
                    <span>{formatKES(summary.deliveryCharge)}</span>
                  </div>
                )}
                {summary.discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-{formatKES(summary.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-1.5 border-t border-gray-100 mt-1.5">
                  <span>Total</span>
                  <span>{formatKES(summary.total)}</span>
                </div>
              </div>
              {summary.deliveryAddress && (
                <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
                  Delivering to: {summary.deliveryAddress}
                </p>
              )}
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-6 mb-8">
            <h2 className="font-semibold text-gray-900 mb-4">What happens next?</h2>
            <div className="space-y-4">
              {[
                {
                  icon: Phone,
                  title: 'We\'ll Call You',
                  description: 'Our team will contact you within 24 hours to confirm your order.',
                },
                {
                  icon: Package,
                  title: 'Prepare for Delivery',
                  description: 'Once confirmed, we\'ll arrange delivery to your location.',
                },
              ].map((step, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <step.icon className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium text-gray-900">{step.title}</h3>
                    <p className="text-sm text-gray-500">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/shop" className="btn-secondary">
              Continue Shopping
            </Link>
            <Link href="/" className="btn-primary">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
