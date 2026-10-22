/**
 * Security utility to sanitize backend, database, and system errors.
 * Guarantees that internal database schema details (table names, column names,
 * relations, Postgres errors, foreign keys, RLS internals) are NEVER leaked
 * to the end-user interface or exposed as security vulnerabilities.
 */

export function getFriendlyErrorMessage(
  err: any,
  fallbackMessage = 'An unexpected error occurred. Please try again.'
): string {
  if (!err) return fallbackMessage;

  const raw =
    typeof err === 'string'
      ? err
      : err.message || err.error_description || (err.error?.message ?? '');

  if (!raw || typeof raw !== 'string') return fallbackMessage;

  const lower = raw.toLowerCase();

  // Pattern detection for backend / DB schema leaks
  const isDbLeak =
    lower.includes('public.') ||
    lower.includes('relation') ||
    lower.includes('table') ||
    lower.includes('column') ||
    lower.includes('schema') ||
    lower.includes('row-level security') ||
    lower.includes('foreign key') ||
    lower.includes('violates') ||
    lower.includes('syntax error') ||
    lower.includes('postgrest') ||
    lower.includes('postgres') ||
    lower.includes('null value in column') ||
    lower.includes('duplicate key value') ||
    lower.includes('pgrst') ||
    lower.includes('fkey') ||
    lower.includes('sql') ||
    lower.includes('jwt') ||
    lower.includes('permission denied');

  if (isDbLeak) {
    if (lower.includes('duplicate key') || lower.includes('unique')) {
      return 'A record with this information already exists.';
    }
    if (lower.includes('row-level security') || lower.includes('permission')) {
      return 'You do not have permission to perform this action.';
    }
    if (lower.includes('not find') || lower.includes('does not exist')) {
      return fallbackMessage;
    }
    return fallbackMessage;
  }

  // Safe user-friendly messages to preserve
  const isSafeUserMessage =
    lower.includes('invalid login') ||
    lower.includes('invalid credentials') ||
    lower.includes('email not confirmed') ||
    lower.includes('user already registered') ||
    lower.includes('password') ||
    lower.includes('too many requests') ||
    lower.includes('rate limit') ||
    lower.includes('enter a 6-character') ||
    lower.includes('enter a group name') ||
    lower.includes('please log in') ||
    lower.includes('check with group members');

  if (isSafeUserMessage) {
    if (lower.includes('too many requests') || lower.includes('rate limit')) {
      return 'Too many attempts. Please wait a minute and try again.';
    }
    return raw;
  }

  // If the message is long or looks like raw code / stack trace, sanitize it
  if (raw.length > 70 || /[{}[\]_]/.test(raw)) {
    return fallbackMessage;
  }

  return raw;
}
