import { CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function ToastContainer() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg animate-slide-up max-w-sm ${
            toast.variant === 'destructive'
              ? 'bg-red-50 border border-red-200 text-red-900'
              : 'bg-white border border-gray-200 text-gray-900'
          }`}
        >
          {toast.variant === 'destructive' ? (
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          ) : (
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          )}
          <div className="flex-1">
            {toast.title && (
              <p className="font-medium text-sm">{toast.title}</p>
            )}
            {toast.description && (
              <p className="text-sm text-gray-600 mt-1">{toast.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
