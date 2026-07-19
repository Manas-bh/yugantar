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

export async function GET(request: NextRequest) {
  const log = logger.child({ handler: "cart:get" });
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true, data: { items: [], totalItems: 0 } });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    const token = request.cookies.get("auth_token")?.value;
    let userId: string | null = null;

    if (token) {
      try {
        const user = await getUserFromToken(token);
        userId = user?._id.toString() || null;
      } catch {
        // Token invalid, continue as guest
      }
    }

    let cart = null;

    if (userId) {
      cart = await findCartByUserId(userId);

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
      cart = await findCartBySessionId(sessionId);
    }

    log.info({ userId, sessionId, itemCount: cart?.items?.length ?? 0 }, "Cart fetched");

    return NextResponse.json({
      success: true,
      data: {
        items: cart?.items || [],
        totalItems:
          cart?.items.reduce(
            (sum: number, item: CartItemRecord) => sum + item.quantity,
            0
          ) || 0,
      },
    });
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return NextResponse.json({ success: true, data: { items: [], totalItems: 0 } });
    }
    log.error({ err: error }, "Error fetching cart");
    return NextResponse.json(
      { success: false, error: "Failed to fetch cart" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const log = logger.child({ handler: "cart:update" });
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Supabase is not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { items, sessionId }: { items: CartItemRecord[]; sessionId: string } =
      body;

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { success: false, error: "Invalid cart items payload" },
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
        { success: false, error: "Invalid cart item values" },
        { status: 400 }
      );
    }

    const token = request.cookies.get("auth_token")?.value;
    let userId: string | null = null;

    if (token) {
      try {
        const user = await getUserFromToken(token);
        userId = user?._id.toString() || null;
      } catch {
        // Token invalid, continue as guest
      }
    }

    let cart = null;

    if (userId) {
      cart = await findCartByUserId(userId);
      if (!cart) {
        cart = await createCart({ userId, items: [] });
      }

      if (sessionId) {
        const sessionCart = await findCartBySessionId(sessionId);
        if (sessionCart && !cart.items.length) {
          cart =
            (await updateCartById(cart.id, { items: sessionCart.items })) || cart;
          await updateCartById(sessionCart.id, { items: [], sessionId: null });
        }
      }
    } else if (sessionId) {
      cart = await findCartBySessionId(sessionId);
      if (!cart) {
        cart = await createCart({ sessionId, items: [] });
      }
    } else {
      return NextResponse.json(
        { success: false, error: "No session ID provided" },
        { status: 400 }
      );
    }

    cart = (await updateCartById(cart.id, { items })) || cart;

    log.info({ userId, sessionId, itemCount: cart.items.length }, "Cart updated");

    return NextResponse.json({
      success: true,
      data: {
        items: cart.items,
        totalItems: cart.items.reduce(
          (sum: number, item: CartItemRecord) => sum + item.quantity,
          0
        ),
      },
    });
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return NextResponse.json(
        { success: false, error: "Supabase is not configured" },
        { status: 503 }
      );
    }
    log.error({ err: error }, "Error updating cart");
    return NextResponse.json(
      { success: false, error: "Failed to update cart" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const log = logger.child({ handler: "cart:clear" });
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    const token = request.cookies.get("auth_token")?.value;
    let userId: string | null = null;

    if (token) {
      try {
        const user = await getUserFromToken(token);
        userId = user?._id.toString() || null;
      } catch {
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

    log.info({ userId, sessionId }, "Cart cleared");

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      return NextResponse.json({ success: true });
    }
    log.error({ err: error }, "Error clearing cart");
    return NextResponse.json(
      { success: false, error: "Failed to clear cart" },
      { status: 500 }
    );
  }
}