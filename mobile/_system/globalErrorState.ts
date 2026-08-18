/**
 * Global Error State Manager
 *
 * Simple pub/sub state manager for global errors that allows the
 * GlobalErrorOverlay to display errors caught by early-error-handler.
 *
 * CRITICAL: DO NOT MODIFY - Part of Appifex error handling system
 */

type ErrorListener = (error: Error | null) => void;

interface GlobalErrorState {
  error: Error | null;
  listeners: Set<ErrorListener>;
}

const state: GlobalErrorState = {
  error: null,
  listeners: new Set(),
};

export function setGlobalError(error: Error | null): void {
  state.error = error;
  state.listeners.forEach(listener => {
    try {
      listener(error);
    } catch {
      // Prevent listener errors from breaking error handling
    }
  });
}

export function getGlobalError(): Error | null {
  return state.error;
}

export function subscribeToGlobalError(listener: ErrorListener): () => void {
  state.listeners.add(listener);
  return () => state.listeners.delete(listener);
}

export function clearGlobalError(): void {
  setGlobalError(null);
}
