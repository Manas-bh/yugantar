import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * Shared Zod validation middleware for Next.js API routes.
 *
 * Usage:
 *   import { validateBody } from "@/lib/validation/api";
 *   import { checkoutSchema } from "@/lib/validation/schemas";
 *
 *   const { data, error } = await validateBody(request, checkoutSchema);
 *   if (error) return error;
 *   // data is fully typed and validated
 */

export async function validateBody<T extends z.ZodTypeAny>(
  request: NextRequest,
  schema: T
): Promise<{ data: z.infer<T>; error: null } | { data: null; error: Response }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const issues = result.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      }));

      logger.warn({ issues }, "Request body validation failed");

      return {
        data: null,
        error: NextResponse.json(
          {
            success: false,
            error: "Validation failed",
            details: issues,
          },
          { status: 400 }
        ),
      };
    }

    return { data: result.data, error: null };
  } catch (e) {
    logger.warn("Invalid JSON in request body");
    return {
      data: null,
      error: NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      ),
    };
  }
}

export function validateQuery<T extends z.ZodTypeAny>(
  searchParams: URLSearchParams,
  schema: T
): { data: z.infer<T>; error: null } | { data: null; error: Response } {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of searchParams.entries()) {
    obj[key] = value;
  }

  const result = schema.safeParse(obj);

  if (!result.success) {
    const issues = result.error.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    }));

    logger.warn({ issues }, "Query validation failed");

    return {
      data: null,
      error: NextResponse.json(
        {
          success: false,
          error: "Query validation failed",
          details: issues,
        },
        { status: 400 }
      ),
    };
  }

  return { data: result.data, error: null };
}

export async function validateParams<T extends z.ZodTypeAny>(
  params: Promise<Record<string, string>>,
  schema: T
): Promise<{ data: z.infer<T>; error: null } | { data: null; error: Response }> {
  const resolved = await params;
  const result = schema.safeParse(resolved);

  if (!result.success) {
    const issues = result.error.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    }));

    logger.warn({ issues }, "Route params validation failed");

    return {
      data: null,
      error: NextResponse.json(
        {
          success: false,
          error: "Route params validation failed",
          details: issues,
        },
        { status: 400 }
      ),
    };
  }

  return { data: result.data, error: null };
}
