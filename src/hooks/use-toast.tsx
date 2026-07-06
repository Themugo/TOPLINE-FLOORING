import { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  message?: string;
  variant?: 'default' | 'destructive' | 'success' | 'error';
  type?: 'success' | 'error' | 'default';
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(
    (props: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).slice(2);
      const normalized: Toast = {
        id,
        title: props.title,
        description: props.description || props.message,
        variant: props.variant || (props.type === 'error' ? 'destructive' : props.type === 'success' ? 'success' : 'default'),
      };
      setToasts((prev) => [...prev, normalized]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    []
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toast, toasts, dismiss };
}
