/**
 * Supabase never throws on a failed query: it resolves with `{ error }`. Admin screens that
 * ignore that value report success (closing the form, showing "saved") when nothing was
 * written. These helpers turn a result into an explicit failure message.
 */
interface DbErrorLike {
  message?: string;
  code?: string;
}
interface DbResultLike {
  error: DbErrorLike | null;
  data?: unknown;
}

export function describeDbError(error: DbErrorLike | null | undefined): string {
  if (!error) return 'Unexpected error';
  const message = (error.message ?? '').toLowerCase();
  if (error.code === '23505') return 'A record with the same unique value (name, slug or code) already exists.';
  if (error.code === '23503') return 'This record is linked to other data. Remove or change the linked records first.';
  if (error.code === '23502') return 'A required field is missing.';
  if (error.code === '23514') return 'A value is outside the allowed range or format.';
  if (error.code === '42501' || message.includes('row-level security') || message.includes('permission denied'))
    return 'You do not have permission to do this.';
  if (message.includes('jwt') || message.includes('expired')) return 'Your session has expired. Sign in again.';
  if (message.includes('failed to fetch') || message.includes('network')) return 'Network error. Check your connection and retry.';
  return error.message || 'Unexpected error';
}

/**
 * Await a Supabase write and return a failure message, or null on success.
 * With `{ requireRows: true }` (use with `.select('id')` on update/delete) a write that
 * affected zero rows is also a failure: row-level security silently filters such writes.
 */
export async function dbFailure(
  query: PromiseLike<DbResultLike>,
  options: { requireRows?: boolean } = {}
): Promise<string | null> {
  try {
    const { error, data } = await query;
    if (error) return describeDbError(error);
    if (options.requireRows && Array.isArray(data) && data.length === 0) {
      return 'Nothing was changed. You may not have permission, or the record no longer exists.';
    }
    return null;
  } catch (err) {
    return describeDbError({ message: err instanceof Error ? err.message : String(err) });
  }
}
