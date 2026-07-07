import { useEffect } from 'react';
import { Link } from 'wouter';
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import { CheckCircle2, MessageCircle, Phone } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';

export default function CheckoutSuccess() {
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return (
    <CustomerLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>

          <h1 className="font-display text-3xl font-bold text-gray-900 mb-4">
            Order Received!
          </h1>

          <p className="text-gray-600 mb-8">
            Thank you for your order. We've received your request and will contact you
            shortly to confirm the details.
          </p>

          <div className="bg-gray-50 rounded-xl p-6 mb-8">
            <h2 className="font-semibold text-gray-900 mb-4">What happens next?</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-primary-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-gray-900">We'll Call You</h3>
                  <p className="text-sm text-gray-500">
                    Our team will contact you within 24 hours to confirm your order.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-primary-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-gray-900">Prepare for Delivery</h3>
                  <p className="text-sm text-gray-500">
                    Once confirmed, we'll arrange delivery to your location.
                  </p>
                </div>
              </div>
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
