import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  createCart,
  findCartBySessionId,
  findCartByUserId,
  type CartItemRecord,
  updateCartById,
} from "@/lib/data/carts";
import {
  isSupabaseConfigured,
  SupabaseConfigError,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/cart - Get cart items
export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ items: [], totalItems: 0 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    // Get user from token if available
    const token = request.cookies.get("auth_token")?.value;
    let userId: string | null = null;

    if (token) {
      try {
        const user = await getUserFromToken(token);
        userId = user?._id.toString() || null;
      } catch (error) {
        // Token invalid, continue as guest
      }
    }

    let cart = null;

    if (userId) {
      // Look for user cart first
      cart = await findCartByUserId(userId);

      // If user has no cart but has session cart, migrate it
      if (!cart && sessionId) {
        const sessionCart = await findCartBySessionId(sessionId);
        if (sessionCart) {
          cart = await updateCartById(sessionCart.id, {
            userId,
            sessionId: null,
          });
        }
      }
    } else if (sessionId) {
      // Guest user
      cart = await findCartBySessionId(sessionId);
    }

    return NextResponse.json({
      items: cart?.items || [],
      totalItems:
        cart?.items.reduce(
          (sum: number, item: CartItemRecord) => sum + item.quantity,
          0
        ) || 0,
    });
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return NextResponse.json({ items: [], totalItems: 0 });
    }
    logger.error("Error fetching cart:", error);
    return NextResponse.json(
      { error: "Failed to fetch cart" },
      { status: 500 }
    );
  }
}

// POST /api/cart - Update cart items
export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase is not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { items, sessionId }: { items: CartItemRecord[]; sessionId: string } =
      body;

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: "Invalid cart items payload" },
        { status: 400 }
      );
    }

    if (
      items.some(
        (item) =>
          !item ||
          typeof item.productId !== "string" ||
          !item.productId.trim() ||
          typeof item.name !== "string" ||
          !item.name.trim() ||
          typeof item.size !== "string" ||
          !item.size.trim() ||
          typeof item.color !== "string" ||
          !item.color.trim() ||
          !Number.isFinite(Number(item.price)) ||
          Number(item.price) < 0 ||
          !Number.isInteger(Number(item.quantity)) ||
          Number(item.quantity) <= 0 ||
          Number(item.quantity) > 20
      )
    ) {
      return NextResponse.json(
        { error: "Invalid cart item values" },
        { status: 400 }
      );
    }

    // Get user from token if available
    const token = request.cookies.get("auth_token")?.value;
    let userId: string | null = null;

    if (token) {
      try {
        const user = await getUserFromToken(token);
        userId = user?._id.toString() || null;
      } catch (error) {
        // Token invalid, continue as guest
      }
    }

    let cart = null;

    if (userId) {
      // Find or create user cart
      cart = await findCartByUserId(userId);
      if (!cart) {
        cart = await createCart({ userId, items: [] });
      }

      // Migrate session cart if exists
      if (sessionId) {
        const sessionCart = await findCartBySessionId(sessionId);
        if (sessionCart && !cart.items.length) {
          cart =
            (await updateCartById(cart.id, { items: sessionCart.items })) || cart;
          await updateCartById(sessionCart.id, { items: [], sessionId: null });
        }
      }
    } else if (sessionId) {
      // Guest user
      cart = await findCartBySessionId(sessionId);
      if (!cart) {
        cart = await createCart({ sessionId, items: [] });
      }
    } else {
      return NextResponse.json(
        { error: "No session ID provided" },
        { status: 400 }
      );
    }

    // Update cart items
    cart = (await updateCartById(cart.id, { items })) || cart;

    return NextResponse.json({
      success: true,
      items: cart.items,
      totalItems: cart.items.reduce(
        (sum: number, item: CartItemRecord) => sum + item.quantity,
        0
      ),
    });
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return NextResponse.json(
        { error: "Supabase is not configured" },
        { status: 503 }
      );
    }
    logger.error("Error updating cart:", error);
    return NextResponse.json(
      { error: "Failed to update cart" },
      { status: 500 }
    );
  }
}

// DELETE /api/cart - Clear cart
export async function DELETE(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    // Get user from token if available
    const token = request.cookies.get("auth_token")?.value;
    let userId: string | null = null;

    if (token) {
      try {
        const user = await getUserFromToken(token);
        userId = user?._id.toString() || null;
      } catch (error) {
        // Token invalid, continue as guest
      }
    }

    if (userId) {
      const cart = await findCartByUserId(userId);
      if (cart) {
        await updateCartById(cart.id, { items: [] });
      }
    } else if (sessionId) {
      const cart = await findCartBySessionId(sessionId);
      if (cart) {
        await updateCartById(cart.id, { items: [] });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return NextResponse.json({ success: true });
    }
    logger.error("Error clearing cart:", error);
    return NextResponse.json(
      { error: "Failed to clear cart" },
      { status: 500 }
    );
  }
}
