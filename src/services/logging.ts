import { supabase } from '@/lib/supabase';

export interface LogErrorPayload {
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  info?: unknown;
  userId: string;
  timestamp: string;
  path: string;
  url: string;
  userAgent: string;
  environment: string;
}

/**
 * Gets the current active user ID if available in local storage or session,
 * falling back to 'anonymous'.
 */
export function getCurrentUserId(): string {
  if (typeof window === 'undefined') return 'server';

  try {
    // Check localStorage for admin or standard user data
    const adminSession = localStorage.getItem('admin_session');
    if (adminSession) {
      const parsed = JSON.parse(adminSession);
      if (parsed?.user?.id) return parsed.user.id;
      if (parsed?.email) return parsed.email;
    }

    const userData = localStorage.getItem('user');
    if (userData) {
      const parsed = JSON.parse(userData);
      if (parsed?.id) return parsed.id;
      if (parsed?.email) return parsed.email;
    }

    const supabaseAuth = localStorage.getItem('sb-auth-token') || localStorage.getItem('supabase.auth.token');
    if (supabaseAuth) {
      const parsed = JSON.parse(supabaseAuth);
      if (parsed?.user?.id) return parsed.user.id;
    }
  } catch {
    // Fallback if parsing fails
  }

  return 'anonymous';
}

/**
 * Formats runtime error data and sends a POST request to /api/logs for central analysis.
 *
 * @param error - The captured runtime Error object
 * @param info - Supplementary info or component stack trace
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function logError(error: Error, info?: any): Promise<boolean> {
  const isErrorObject = error instanceof Error;
  const errorObj = {
    name: isErrorObject ? error.name : 'Error',
    message: isErrorObject ? error.message : String(error || 'Unknown error'),
    stack: isErrorObject ? error.stack : undefined,
  };

  const userId = (info && typeof info === 'object' && info !== null && 'userId' in info && typeof (info as Record<string, unknown>).userId === 'string')
    ? (info as Record<string, unknown>).userId as string
    : getCurrentUserId();

  const payload: LogErrorPayload = {
    error: errorObj,
    info: info ?? null,
    userId,
    timestamp: new Date().toISOString(),
    path: typeof window !== 'undefined' ? window.location.pathname : '',
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    environment: (import.meta.env.MODE as string) || 'production',
  };

  // Console output for developer feedback
  console.error('[Centralized Logging Service]', payload);

  let success = false;

  // Primary delivery: POST request to /api/logs
  try {
    const response = await fetch('/api/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      success = true;
    }
  } catch (fetchErr) {
    console.warn('[Logging Service] POST /api/logs failed, attempting fallback storage:', fetchErr);
  }

  // Fallback storage in Supabase activity_logs table
  if (!success) {
    try {
      const { error: dbError } = await supabase.from('activity_logs').insert({
        action: 'uncaught_exception',
        entity_type: 'logging_service',
        details: payload,
        user_agent: payload.userAgent,
      });

      if (!dbError) {
        success = true;
      }
    } catch (dbErr) {
      console.warn('[Logging Service] Fallback storage failed:', dbErr);
    }
  }

  return success;
}

export default {
  logError,
  getCurrentUserId,
};
