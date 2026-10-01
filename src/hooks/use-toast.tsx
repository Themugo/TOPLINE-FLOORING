/* eslint-disable react-refresh/only-export-components -- hook module with a module-level store; no components here */
import { useCallback, useSyncExternalStore } from 'react';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  message?: string;
  variant?: 'default' | 'destructive' | 'success' | 'error';
  type?: 'success' | 'error' | 'default';
}

/**
 * Toasts live in ONE module-level store shared by every caller.
 *
 * Previously each `useToast()` call kept its own local state, while only <ToastContainer />
 * (a separate instance) rendered toasts. Calls from pages therefore never reached the
 * screen: no "saved" message and no error message anywhere in the app.
 */
const TOAST_DURATION_MS = 5000;
const MAX_TOASTS = 5;
const EMPTY: Toast[] = [];

let toasts: Toast[] = EMPTY;
const listeners = new Set<() => void>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function emit(next: Toast[]) {
  toasts = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return toasts;
}

function dismissToast(id: string) {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
  emit(toasts.filter((t) => t.id !== id));
}

function pushToast(props: Omit<Toast, 'id'>) {
  const id = crypto.randomUUID();
  const normalized: Toast = {
    id,
    title: props.title,
    description: props.description || props.message,
    variant:
      props.variant || (props.type === 'error' ? 'destructive' : props.type === 'success' ? 'success' : 'default'),
  };
  emit([...toasts, normalized].slice(-MAX_TOASTS));
  timers.set(id, setTimeout(() => dismissToast(id), TOAST_DURATION_MS));
}

export function useToast() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const toast = useCallback((props: Omit<Toast, 'id'>) => pushToast(props), []);
  const dismiss = useCallback((id: string) => dismissToast(id), []);
  return { toast, toasts: current, dismiss };
}
