"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Minus,
  Plus,
  X,
  ShoppingBag,
  ArrowLeft,
  Truck,
  Shield,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";

export default function CartPage() {
  const {
    items,
    updateQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    totalItems,
    isLoading,
  } = useCart();

  const shipping = subtotal > 1199 ? 0 : 99; // Free shipping over ₹1199, else ₹99
  const total = subtotal + shipping;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading cart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background transition-colors">

      <div className="app-shell pt-4">
        <div className="section-shell flex h-14 items-center justify-between px-4 sm:px-6">
          <Badge variant="secondary" className="rounded-full bg-accent/70 text-foreground">
            Shopping Cart
          </Badge>
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Continue Shopping</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="app-shell py-8">
        {items.length === 0 ? (
          <div className="section-shell py-16 text-center">
            <ShoppingBag className="mx-auto mb-6 h-24 w-24 text-muted-foreground/40" />
            <h2 className="mb-4 text-2xl font-extrabold lowercase text-foreground">
              Your cart is empty
            </h2>
            <p className="mb-8 text-muted-foreground">
              Looks like you haven't added any items to your cart yet.
            </p>
            <Link href="/">
              <Button size="lg" className="cta-pill-primary px-8">
                Start Shopping
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-extrabold lowercase text-foreground">
                  Shopping Cart ({items.length}{" "}
                  {items.length === 1 ? "item" : "items"})
                </h1>
                <Button
                  onClick={clearCart}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  Clear Cart
                </Button>
              </div>

              {items.map((item) => (
                <Card
                  key={item.id}
                  className="surface-card"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-muted">
                        <Image
                          src={item.image || "/placeholder.svg"}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">
                              {item.name}
                            </h3>
                            {item.category && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                {item.category}
                              </Badge>
                            )}
                            <div className="mt-2 text-sm text-muted-foreground">
                              <span>Color: {item.color}</span>
                              <span className="mx-2">•</span>
                              <span>Size: {item.size}</span>
                            </div>
                          </div>
                          <Button
                            onClick={() => removeFromCart(item.id)}
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center space-x-3">
                            <Button
                              onClick={() =>
                                updateQuantity(item.id, item.quantity - 1)
                              }
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 p-0"
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center font-medium text-foreground">
                              {item.quantity}
                            </span>
                            <Button
                              onClick={() =>
                                updateQuantity(item.id, item.quantity + 1)
                              }
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 p-0"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-foreground">
                              ₹{(item.price * item.quantity).toFixed(2)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              ₹{item.price.toFixed(2)} each
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="surface-card sticky top-8">
                <CardContent className="p-6">
                  <h2 className="mb-6 text-xl font-extrabold lowercase text-foreground">
                    Order Summary
                  </h2>

                  <div className="space-y-4">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>₹{subtotal.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-muted-foreground">
                      <span>Shipping</span>
                      <span>
                        {shipping === 0 ? "Free" : `₹${shipping.toFixed(2)}`}
                      </span>
                    </div>

                    <div className="border-t border-border pt-4">
                      <div className="flex justify-between text-lg font-bold text-foreground">
                        <span>Total</span>
                        <span>₹{total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {shipping > 0 && (
                    <div className="mt-4 rounded-2xl bg-accent/35 p-3">
                      <p className="text-sm text-foreground/90">
                        Add ₹{(1199 - subtotal).toFixed(2)} more for free
                        shipping!
                      </p>
                    </div>
                  )}

                  <Link href="/checkout">
                    <Button size="lg" className="cta-pill-primary mt-6 w-full justify-center">
                      Proceed to Checkout
                    </Button>
                  </Link>

                  <div className="mt-6 space-y-3">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Truck className="w-4 h-4" />
                      <span>Free shipping on orders over ₹1199</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Shield className="w-4 h-4" />
                      <span>Money back if order cancelled before 7 days</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
