import pino from "pino";

/**
 * Production-grade structured logger using Pino.
 *
 * In development: pretty-printed logs for readability.
 * In production: JSON logs for ingestion into Axiom / Logflare / Sentry.
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.info({ orderId: "ORD-123" }, "Order placed successfully");
 *   logger.error({ err }, "Payment verification failed");
 */

const isDev = process.env.NODE_ENV === "development";

function createDevLogger(bindings: Record<string, unknown> = {}): pino.Logger {
  const ts = () => new Date().toISOString().replace("T", " ").replace("Z", "");
  const redactedKeys = ["password", "token", "secret", "authorization", "cookie", "phone", "pinCode"];
  const isRedacted = (k: string) => redactedKeys.some((r) => k.toLowerCase().includes(r));

  const formatValue = (v: unknown) => {
    if (v instanceof Error) return `[${v.name}: ${v.message}]`;
    return JSON.stringify(v);
  };

  const log =
    (level: string, method: "debug" | "info" | "warn" | "error") =>
    (objOrMsg: unknown, msg?: string) => {
      const parts = [`${ts()} [${level}]`];

      if (Object.keys(bindings).length) {
        parts.push(JSON.stringify(bindings));
      }

      if (msg !== undefined) {
        if (objOrMsg && typeof objOrMsg === "object") {
          const filtered: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(objOrMsg as Record<string, unknown>)) {
            filtered[k] = isRedacted(k) ? "[Redacted]" : v instanceof Error ? v.message : v;
          }
          const str = JSON.stringify(filtered);
          if (str !== "{}") parts.push(str);
        }
        parts.push(msg);
      } else if (objOrMsg) {
        parts.push(String(objOrMsg));
      }

      console[method](parts.join(" "));
    };

  return {
    level: "debug",
    debug: log("DEBUG", "debug"),
    info: log("INFO", "info"),
    warn: log("WARN", "warn"),
    error: log("ERROR", "error"),
    silent: log("SILENT", "debug"),
    trace: log("TRACE", "debug"),
    fatal: log("FATAL", "error"),
    child: (b: Record<string, unknown>) => createDevLogger({ ...bindings, ...b }),
  } as unknown as pino.Logger;
}

export const logger: pino.Logger = isDev
  ? createDevLogger()
  : pino({
      level: process.env.LOG_LEVEL || "info",
      base: {
        env: process.env.NODE_ENV,
        version: process.env.npm_package_version,
      },
      redact: {
        paths: [
          "*.password",
          "*.token",
          "*.secret",
          "req.headers.authorization",
          "req.headers.cookie",
          "*.address.phone",
          "*.address.pinCode",
        ],
        remove: true,
      },
    });

/**
 * Wraps an API handler to provide request-scoped logging with trace IDs.
 */
export function withLogging(
  handler: (req: Request, log: typeof logger) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const traceId =
      req.headers.get("x-trace-id") || crypto.randomUUID().slice(0, 8);
    const childLogger = logger.child({
      traceId,
      method: req.method,
      url: req.url,
    });

    const start = Date.now();
    try {
      const response = await handler(req, childLogger);
      childLogger.info(
        { statusCode: response.status, durationMs: Date.now() - start },
        "Request completed"
      );
      return response;
    } catch (error) {
      childLogger.error(
        { err: error, durationMs: Date.now() - start },
        "Request failed"
      );
      throw error;
    }
  };
}
