/**
 * Early Error Handler for Appifex Generated Apps
 *
 * CRITICAL: DO NOT MODIFY OR REMOVE THIS FILE
 * This handler captures errors that occur BEFORE Sentry initializes,
 * including navigation errors during app mount.
 *
 * Must be imported FIRST in app/_layout.tsx to ensure it runs before any other code.
 *
 * Design: Everything is wrapped in try/catch to ensure this handler NEVER
 * crashes the app, even if there are issues with config or network.
 */

// ============================================================================
// TYPES
// ============================================================================

interface AppifexConfig {
  projectId: string;
  sentryDsn: string;
  backendUrl: string;
}

interface ErrorUtilsType {
  setGlobalHandler?: (callback: (error: unknown, isFatal: boolean) => void) => void;
  getGlobalHandler?: () => ((error: unknown, isFatal: boolean) => void) | undefined;
}

// ============================================================================
// SEND TELEMETRY TO APPIFEX BACKEND (for debugging)
// ============================================================================

function sendTelemetry(
  eventType: string,
  message: string,
  config: AppifexConfig,
  data?: Record<string, unknown>
): void {
  try {
    const { backendUrl, projectId } = config;

    // Skip if no backend URL configured
    if (!backendUrl || backendUrl.includes('{{')) {
      return;
    }

    const endpoint = `${backendUrl}/api/v1/mobile-telemetry`;

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        event_type: eventType,
        message,
        data: data || null,
      }),
    }).catch(() => {
      // Silent fail - telemetry should never break the app
    });
  } catch {
    // Silent fail
  }
}

// ============================================================================
// SEND TO SENTRY VIA ENVELOPE API
// ============================================================================

function sendToSentry(
  error: Error,
  isFatal: boolean,
  config: AppifexConfig
): void {
  try {
    const { sentryDsn, projectId } = config;

    // Parse DSN to get endpoint
    const dsnMatch = sentryDsn.match(/https:\/\/([^@]+)@([^\/]+)\/(\d+)/);
    if (!dsnMatch) {
      console.warn('[Appifex] DSN parsing failed');
      return;
    }

    const [, publicKey, host, sentryProjectId] = dsnMatch;
    const endpoint = `https://${host}/api/${sentryProjectId}/envelope/`;

    console.log('[Appifex] Sending error to Sentry:', { host, sentryProjectId });

    // Create Sentry envelope
    // Generate valid 32-char hex event_id (UUID v4 format without hyphens)
    // Sentry requires event_id to be exactly 32 hexadecimal characters
    const eventId = 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    const timestamp = new Date().toISOString();

    // Parse stack trace
    const frames = error.stack
      ? error.stack.split('\n').slice(1).map(line => {
          const match = line.match(/at\s+(.+?)\s+\((.+):(\d+):(\d+)\)/);
          if (match) {
            return { function: match[1], filename: match[2], lineno: parseInt(match[3]), colno: parseInt(match[4]) };
          }
          return { function: line.trim() };
        }).filter(f => f.function)
      : [];

    const eventPayload = {
      event_id: eventId,
      timestamp,
      platform: 'javascript',
      level: isFatal ? 'fatal' : 'error',
      sdk: { name: 'appifex.early-handler', version: '1.0.0' },
      exception: {
        values: [{
          type: error.name || 'Error',
          value: error.message,
          stacktrace: frames.length > 0 ? { frames } : undefined,
        }],
      },
      tags: {
        appifex_project_id: projectId,
        handler: 'early',
        is_fatal: String(isFatal),
      },
      contexts: {
        app: { app_start_time: timestamp },
      },
    };

    const envelope = [
      JSON.stringify({ event_id: eventId, sent_at: timestamp }),
      JSON.stringify({ type: 'event' }),
      JSON.stringify(eventPayload),
    ].join('\n');

    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${publicKey}, sentry_client=appifex.early-handler/1.0.0`,
      },
      body: envelope,
    })
      .then(r => {
        console.log('[Appifex] Sentry response:', r.status, r.statusText);
        sendTelemetry('sentry_sent', `Sentry responded: ${r.status}`, config, {
          status: r.status,
          error_type: error.name,
          error_message: error.message,
          is_fatal: isFatal,
        });
      })
      .catch(e => {
        console.error('[Appifex] Sentry request failed:', e?.message || e);
        sendTelemetry('sentry_failed', `Sentry request failed: ${e?.message || e}`, config, {
          fetch_error: String(e?.message || e),
          error_type: error.name,
          error_message: error.message,
        });
      });

  } catch (sendError) {
    console.error('[Appifex] Error in sendToSentry:', sendError);
  }
}

// ============================================================================
// GLOBAL ERROR STATE (for user-friendly overlay)
// ============================================================================

// Lazy reference to setGlobalError to avoid circular dependencies
let setGlobalErrorFn: ((error: Error | null) => void) | null = null;

function getSetGlobalError(): ((error: Error | null) => void) | null {
  if (!setGlobalErrorFn) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { setGlobalError } = require('./globalErrorState');
      setGlobalErrorFn = setGlobalError;
    } catch {
      // Module not available yet
    }
  }
  return setGlobalErrorFn;
}

// ============================================================================
// MAIN ERROR CAPTURE FUNCTION
// ============================================================================

function captureError(
  error: unknown,
  isFatal: boolean,
  config: AppifexConfig,
  source: string
): void {
  try {
    if (!(error instanceof Error)) {
      console.log(`[Appifex ${source}] Non-error value:`, typeof error);
      return;
    }

    console.log(
      `[Appifex ${source}]`,
      isFatal ? 'FATAL:' : 'Error:',
      error.message
    );

    // Display user-friendly error overlay.
    const setGlobalError = getSetGlobalError();
    if (setGlobalError) {
      setGlobalError(error);
    }

    // Send telemetry that we caught an error.
    // Include canonical keys (name/message/stack) expected by the backend.
    // _componentStack is attached by ErrorBoundary.componentDidCatch when
    // the error is a React render error caught by the boundary.
    const componentStack = (error as any)._componentStack || null;
    sendTelemetry('error_caught', `${source}: ${error.message}`, config, {
      source,
      name: error.name,
      message: error.message,
      stack: error.stack || null,
      componentStack,

      // Backwards-compatible keys (older analysis code may rely on these).
      error_type: error.name,
      error_message: error.message,
      is_fatal: isFatal,
      has_stack: !!error.stack,
    });

    // Validate config
    if (!config.sentryDsn || config.sentryDsn.includes('{{')) {
      console.warn('[Appifex] Sentry DSN not configured (template placeholder)');
      sendTelemetry('config_invalid', 'Sentry DSN is template placeholder', config, {
        field: 'sentryDsn',
      });
      return;
    }
    if (!config.projectId || config.projectId.includes('{{')) {
      console.warn('[Appifex] Project ID not configured');
      sendTelemetry('config_invalid', 'Project ID is template placeholder', config, {
        field: 'projectId',
      });
      return;
    }

    sendToSentry(error, isFatal, config);
  } catch (captureErr) {
    console.error('[Appifex] Error in captureError:', captureErr);
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Wrap entire initialization in try/catch to never crash the app
try {
  // Load config safely
  let config: AppifexConfig = { projectId: '', sentryDsn: '', backendUrl: '' };

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const imported = require('./appifex-config');
    config = imported.APPIFEX_CONFIG || config;
    console.log('[Appifex Config]', {
      projectId: config.projectId?.substring(0, 8) + '...',
      hasDsn: !!config.sentryDsn && !config.sentryDsn.includes('{{'),
      hasBackend: !!config.backendUrl && !config.backendUrl.includes('{{'),
      isTemplate: config.projectId?.includes('{{'),
    });

    // Send telemetry that config was loaded
    sendTelemetry('config_loaded', 'Appifex config loaded', config, {
      has_project_id: !!config.projectId && !config.projectId.includes('{{'),
      has_sentry_dsn: !!config.sentryDsn && !config.sentryDsn.includes('{{'),
      has_backend_url: !!config.backendUrl && !config.backendUrl.includes('{{'),
    });
  } catch (configErr) {
    console.error('[Appifex] Failed to load config:', configErr);
  }

  // 1. ErrorUtils handler (primary method for React Native)
  const g = global as { ErrorUtils?: ErrorUtilsType };
  if (g.ErrorUtils?.setGlobalHandler) {
    const previousHandler = g.ErrorUtils.getGlobalHandler?.();

    g.ErrorUtils.setGlobalHandler((error: unknown, isFatal: boolean) => {
      captureError(error, isFatal, config, 'ErrorUtils');

      // Forward to previous handler (Sentry SDK or RN default)
      if (previousHandler) {
        try {
          previousHandler(error, isFatal);
        } catch (e) {
          console.error('[Appifex] Previous handler error:', e);
        }
      }
    });

    console.log('[Appifex] ErrorUtils handler installed');
  } else {
    console.warn('[Appifex] ErrorUtils not available');
  }

  // 2. Console.error override (catches errors logged to console)
  const originalConsoleError = console.error.bind(console);

  // Optional (scaffold-provided) ignore predicate.
  // Auth scaffolds can provide extra filters without coupling the base template
  // to any specific auth provider.
  type IgnorePredicate = (err: Error | string) => boolean;

  let externalIgnore: IgnorePredicate | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('./expected-errors');
    externalIgnore =
      (mod?.shouldIgnoreConsoleError as IgnorePredicate | undefined) ||
      (mod?.isExpectedError as IgnorePredicate | undefined) ||
      null;
  } catch {
    // Module not present (most apps) - ignore.
  }

  // Some errors are expected in "guest" flows (e.g., hitting endpoints that
  // respond with 401). These should not trigger the full-screen error overlay.
  const shouldIgnoreConsoleError: IgnorePredicate = (err) => {
    if (externalIgnore && externalIgnore(err)) {
      return true;
    }

    const msg = (typeof err === 'string' ? err : err.message || '').toLowerCase();

    // Generic HTTP status format used by many generated apiFetch helpers
    if (msg.trim() === 'http 401' || msg.includes('http 401')) return true;

    return false;
  };

  console.error = (...args: unknown[]) => {
    originalConsoleError(...args);

    try {
      // Prefer capturing a real Error object even if it's not the first arg.
      // This fixes the common pattern: console.error('Failed to fetch X:', error)
      const errorArg = args.find((arg): arg is Error => arg instanceof Error);
      if (errorArg) {
        if (!shouldIgnoreConsoleError(errorArg)) {
          captureError(errorArg, false, config, 'console.error');
        }
        return;
      }

      const firstArg = args[0];
      if (typeof firstArg === 'string') {
        if (shouldIgnoreConsoleError(firstArg)) {
          return;
        }

        // Also capture string errors (common pattern: console.error("Something went wrong"))
        // Only capture if it looks like an error message
        const errorKeywords = [
          'error',
          'fail',
          'exception',
          'invalid',
          'unauthorized',
          'forbidden',
          'not found',
          'timeout',
          'crash',
        ];
        const lowerMsg = firstArg.toLowerCase();
        if (errorKeywords.some((keyword) => lowerMsg.includes(keyword))) {
          const syntheticError = new Error(firstArg);
          syntheticError.name = 'ConsoleError';
          captureError(syntheticError, false, config, 'console.error');
        }
      }
    } catch {
      // Silent fail
    }
  };

  // 3. Unhandled promise rejection handler
  const gAny = global as any;
  const prevRejectionHandler = gAny.onunhandledrejection;
  gAny.onunhandledrejection = (event: any) => {
    try {
      const error = event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));
      captureError(error, false, config, 'UnhandledRejection');
    } catch {
      // Silent fail
    }
    if (prevRejectionHandler) {
      try {
        prevRejectionHandler(event);
      } catch {
        // Silent fail
      }
    }
  };

  // 4. Web-specific handlers (for react-native-web)
  // Check for addEventListener to ensure we're in a browser environment, not React Native
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('unhandledrejection', (event) => {
      try {
        const error = event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason));
        captureError(error, false, config, 'UnhandledRejection-Web');
      } catch {
        // Silent fail
      }
    });

    window.addEventListener('error', (event) => {
      try {
        const error = event.error instanceof Error
          ? event.error
          : new Error(event.message || 'Unknown error');
        captureError(error, true, config, 'GlobalError-Web');
      } catch {
        // Silent fail
      }
    });

    console.log('[Appifex] Web error handlers installed');
  }

  console.log('[Appifex Early Error] Handler initialized');

  // Send telemetry that handler is ready
  sendTelemetry('handler_initialized', 'Early error handler ready', config, {
    has_error_utils: !!g.ErrorUtils?.setGlobalHandler,
  });

} catch (initError) {
  // Never crash the app due to handler initialization
  console.error('[Appifex] Handler init failed:', initError);
}
