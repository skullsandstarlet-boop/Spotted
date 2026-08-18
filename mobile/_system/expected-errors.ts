/**
 * Optional expected error filters for early-error-handler.
 *
 * Base template default: no errors are ignored.
 * Auth scaffolds may override this file with provider-specific filters.
 */

export function isExpectedError(_err: Error | string): boolean {
  return false
}

export const shouldIgnoreConsoleError = isExpectedError
