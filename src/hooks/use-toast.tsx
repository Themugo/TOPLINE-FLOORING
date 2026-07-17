import { useState, useCallback, useRef, useEffect } from 'react';

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
  const timeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const currentTimeouts = timeouts.current;
    return () => {
      currentTimeouts.forEach((t) => clearTimeout(t));
      currentTimeouts.clear();
    };
  }, []);

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
      const timeout = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        timeouts.current.delete(id);
      }, 5000);
      timeouts.current.set(id, timeout);
    },
    []
  );

  const dismiss = useCallback((id: string) => {
    const timeout = timeouts.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeouts.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toast, toasts, dismiss };
}
