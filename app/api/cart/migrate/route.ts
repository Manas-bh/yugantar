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

export async function POST(request: NextRequest) {
  const log = logger.child({ handler: "cart:migrate" });
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Supabase is not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { sessionId }: { sessionId: string } = body;

    const token = request.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: "No authentication token" },
        { status: 401 }
      );
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid authentication token" },
        { status: 401 }
      );
    }

    const userId = user._id.toString();

    let userCart = await findCartByUserId(userId);
    const sessionCart = await findCartBySessionId(sessionId);

    if (sessionCart && sessionCart.items.length > 0) {
      if (userCart) {
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
            existingItem.quantity += sessionItem.quantity;
          } else {
            userCart!.items.push(sessionItem);
          }
        });

        userCart =
          (await updateCartById(userCart.id, { items: userCart.items })) ||
          userCart;
      } else {
        userCart =
          (await updateCartById(sessionCart.id, {
            userId,
            sessionId: null,
          })) || sessionCart;
      }

      await deleteCartBySessionId(sessionId);
    } else if (!userCart) {
      userCart = await createCart({ userId, items: [] });
    }

    log.info({ userId, sessionId }, "Cart migrated");

    return NextResponse.json({
      success: true,
      data: {
        items: userCart.items,
        totalItems: userCart.items.reduce(
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
    log.error({ err: error }, "Error migrating cart");
    return NextResponse.json(
      { success: false, error: "Failed to migrate cart" },
      { status: 500 }
    );
  }
}