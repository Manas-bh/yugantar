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

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,
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
