import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  createCart,
  deleteCartBySessionId,
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

// POST /api/cart/migrate - Migrate guest cart to user cart when user logs in
export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase is not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { sessionId }: { sessionId: string } = body;

    // Get user from token
    const token = request.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "No authentication token" },
        { status: 401 }
      );
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );
    }

    const userId = user._id.toString();

    // Find user's existing cart
    let userCart = await findCartByUserId(userId);

    // Find session cart
    const sessionCart = await findCartBySessionId(sessionId);

    if (sessionCart && sessionCart.items.length > 0) {
      if (userCart) {
        // Merge carts - add session cart items to user cart, avoiding duplicates
        const existingProductIds = new Set(
          userCart.items.map(
            (item: CartItemRecord) =>
              `${item.productId}-${item.color}-${item.size}`
          )
        );

        sessionCart.items.forEach((sessionItem: CartItemRecord) => {
          const itemKey = `${sessionItem.productId}-${sessionItem.color}-${sessionItem.size}`;
          const existingItem = userCart!.items.find(
            (item: CartItemRecord) =>
              `${item.productId}-${item.color}-${item.size}` === itemKey
          );

          if (existingItem) {
            // Update quantity
            existingItem.quantity += sessionItem.quantity;
          } else {
            // Add new item
            userCart!.items.push(sessionItem);
          }
        });

        userCart =
          (await updateCartById(userCart.id, { items: userCart.items })) ||
          userCart;
      } else {
        // Convert session cart to user cart
        userCart =
          (await updateCartById(sessionCart.id, {
            userId,
            sessionId: null,
          })) || sessionCart;
      }

      // Delete the session cart
      await deleteCartBySessionId(sessionId);
    } else if (!userCart) {
      // Create empty user cart
      userCart = await createCart({ userId, items: [] });
    }

    return NextResponse.json({
      success: true,
      items: userCart.items,
      totalItems: userCart.items.reduce(
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
    logger.error("Error migrating cart:", error);
    return NextResponse.json(
      { error: "Failed to migrate cart" },
      { status: 500 }
    );
  }
}
