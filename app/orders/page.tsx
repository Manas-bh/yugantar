"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Clock,
  CheckCircle,
  Truck,
  X,
  ShoppingBag,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface OrderItem {
  productId: string;
  title: string;
  price: number;
  quantity: number;
  size: string;
  image: string;
}

interface Order {
  _id: string;
  orderId: string;
  items: OrderItem[];
  address: {
    fullName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pinCode: string;
    phone: string;
  };
  payment: {
    amount: number;
    currency: string;
    status: string;
  };
  orderStatus: string;
  total: number;
  createdAt: string;
}

interface AuthUser {
  id: string;
  role: "user" | "admin";
  name: string;
  email: string;
}

const statusConfig = {
  placed: {
    icon: Clock,
    color:
      "bg-yellow-100 text-yellow-800",
    label: "Placed",
  },
  confirmed: {
    icon: CheckCircle,
    color: "bg-blue-100 text-blue-800",
    label: "Confirmed",
  },
  shipped: {
    icon: Truck,
    color:
      "bg-purple-100 text-purple-800",
    label: "Shipped",
  },
  delivered: {
    icon: Package,
    color:
      "bg-green-100 text-green-800",
    label: "Delivered",
  },
  cancelled: {
    icon: X,
    color: "bg-red-100 text-red-800",
    label: "Cancelled",
  },
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initializeOrders = async () => {
      try {
        const authResponse = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "include",
        });

        if (!authResponse.ok) {
          router.push("/auth?callbackUrl=/orders");
          return;
        }

        const authData = await authResponse.json();
        if (!isMounted || !authData?.user) {
          return;
        }

        setUser(authData.user);
        await fetchOrders();
      } catch (error) {
        router.push("/auth?callbackUrl=/orders");
      }
    };

    initializeOrders();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/orders", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setOrders(data.orders);
      } else {
        console.error("Failed to fetch orders:", data.error);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        fetchOrders();
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">
            Loading your orders...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background transition-colors">
      <div className="app-shell mx-auto max-w-4xl py-8">
        {orders.length === 0 ? (
          <Card className="surface-card text-center">
            <CardContent className="p-12">
              <ShoppingBag className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <h2 className="mb-2 text-2xl font-extrabold lowercase text-foreground">
                No Orders Yet
              </h2>
              <p className="mb-6 text-muted-foreground">
                You haven't placed any orders yet. Start shopping to see your
                orders here.
              </p>
              <Link href="/">
                <Button className="cta-pill-primary">
                  Start Shopping
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const StatusIcon =
                statusConfig[order.orderStatus as keyof typeof statusConfig]
                  ?.icon || Clock;
              const statusColor =
                statusConfig[order.orderStatus as keyof typeof statusConfig]
                  ?.color || statusConfig.placed.color;
              const statusLabel =
                statusConfig[order.orderStatus as keyof typeof statusConfig]
                  ?.label || "Unknown";

              return (
                <Card
                  key={order._id}
                  className="surface-card"
                >
                  <CardHeader className="border-b border-border">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                      <div className="space-y-1">
                        <CardTitle className="text-lg font-extrabold lowercase">
                          Order {order.orderId}
                        </CardTitle>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(order.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge
                          className={`${statusColor} flex items-center space-x-1`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          <span>{statusLabel}</span>
                        </Badge>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            Total
                          </p>
                          <p className="font-semibold text-foreground">
                            ₹{order.total.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6">
                    {/* Order Items */}
                    <div className="space-y-4 mb-6">
                      <h3 className="font-medium text-foreground">
                        Items Ordered
                      </h3>
                      <div className="space-y-3">
                        {order.items.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-4 rounded-2xl bg-muted/50 p-3"
                          >
                            <div className="h-16 w-16 flex-shrink-0 rounded-xl bg-muted">
                              {item.image && (
                                <Image
                                  src={item.image}
                                  alt={item.title}
                                  width={64}
                                  height={64}
                                  className="w-16 h-16 object-cover rounded-md"
                                />
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-foreground">
                                {item.title}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                Size: {item.size} • Quantity: {item.quantity}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-foreground">
                                ₹{(item.price * item.quantity).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Delivery Address */}
                    <div className="border-t border-border pt-4">
                      <h3 className="mb-2 font-medium text-foreground">
                        Delivery Address
                      </h3>
                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">
                          {order.address.fullName}
                        </p>
                        <p>{order.address.addressLine1}</p>
                        {order.address.addressLine2 && (
                          <p>{order.address.addressLine2}</p>
                        )}
                        <p>
                          {order.address.city}, {order.address.state} -{" "}
                          {order.address.pinCode}
                        </p>
                        <p>Phone: {order.address.phone}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
