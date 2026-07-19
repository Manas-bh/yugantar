"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Package,
  Star,
  Eye,
  Edit,
  Trash2,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { BannerManagement } from "@/components/admin/banner-management";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface OrderItem {
  productId: string;
  title: string;
  price: number;
  quantity: number;
  size: string;
}

interface Order {
  _id: string;
  orderId: string;
  userId: string;
  items: OrderItem[];
  address: {
    fullName: string;
    city: string;
    state: string;
  };
  payment: {
    amount: number;
    status: string;
  };
  orderStatus: string;
  total: number;
  createdAt: string;
}

interface Banner {
  _id: string;
  name: string;
  position:
    | "home_hero"
    | "home_feature"
    | "collections_hero"
    | "anime_hero"
    | "meme_hero";
  image: string;
  alt: string;
  title?: string;
  subtitle?: string;
  ctaText?: string;
  linkUrl: string;
  order: number;
  isActive: boolean;
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [productsCount, setProductsCount] = useState(0);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannersLoading, setBannersLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "include",
        });

        if (!response.ok) {
          window.location.href =
            "/auth?callbackUrl=" + encodeURIComponent(window.location.pathname);
          return;
        }

        const data = await response.json();
        const authUser = data?.user;

        if (!isMounted || !authUser) {
          return;
        }

        setUser(authUser);

        if (authUser.role === "admin") {
          await Promise.all([
            fetchOrders(),
            fetchBanners(),
            fetchProductsCount(),
          ]);
        } else {
          window.location.href =
            "/auth?callbackUrl=" + encodeURIComponent(window.location.pathname);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        window.location.href =
          "/auth?callbackUrl=" + encodeURIComponent(window.location.pathname);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/orders?admin=true", {
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
      setOrdersLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orderId, orderStatus: newStatus }),
      });

      const data = await response.json();
      if (data.success) {
        if (
          newStatus === "cancelled" &&
          data.stockRestored === false &&
          Array.isArray(data.stockErrors) &&
          data.stockErrors.length > 0
        ) {
          console.warn("Order cancelled but stock restoration had issues:", data.stockErrors);
        }

        // Refresh orders
        fetchOrders();
      } else {
        alert(data.error || "Failed to update order status");
        console.error("Failed to update order:", data.error);
      }
    } catch (error) {
      alert("Failed to update order status. Please try again.");
      console.error("Error updating order:", error);
    }
  };

  const fetchBanners = async () => {
    try {
      setBannersLoading(true);
      const response = await fetch("/api/banners?admin=true", {
        cache: "no-store",
        credentials: "include",
      });

      const data = await response.json();
      if (response.ok) {
        setBanners(Array.isArray(data.banners) ? data.banners : []);
      } else {
        console.error("Failed to fetch banners:", data.error);
      }
    } catch (error) {
      console.error("Error fetching banners:", error);
    } finally {
      setBannersLoading(false);
    }
  };

  const fetchProductsCount = async () => {
    try {
      const response = await fetch("/api/products?admin=true&limit=1", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await response.json();
      if (response.ok && typeof data.total === "number") {
        setProductsCount(data.total);
      }
    } catch (error) {
      console.error("Error fetching products count:", error);
    }
  };

  const topProducts = useMemo(() => {
    const map = new Map<
      string,
      { name: string; sales: number; revenue: number }
    >();
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const existing = map.get(item.productId);
        if (existing) {
          existing.sales += item.quantity;
          existing.revenue += item.price * item.quantity;
        } else {
          map.set(item.productId, {
            name: item.title,
            sales: item.quantity,
            revenue: item.price * item.quantity,
          });
        }
      });
    });
    return Array.from(map.values())
      .map((p) => ({
        name: p.name,
        sales: p.sales,
        revenue: `₹${p.revenue.toLocaleString("en-IN")}`,
        rating: 4.0,
      }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 4);
  }, [orders]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50  flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 ">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50  flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900  mb-4">
              Access Denied
            </h2>
            <p className="text-gray-600  mb-6">
              You need admin privileges to access this page.
            </p>
            <div className="space-y-3">
              <Link href="/auth">
                <Button className="w-full">Sign In as Admin</Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full bg-transparent">
                  Go Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate real stats from orders
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const completedOrders = orders.filter(
    (order) => order.payment.status === "completed"
  ).length;
  const uniqueCustomers = new Set(orders.map((order) => order.userId)).size;

  const stats = [
    {
      title: "Total Revenue",
      value: `₹${totalRevenue.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
      })}`,
      change: "+20.1%",
      icon: <DollarSign className="h-4 w-4" />,
      color: "text-green-600",
    },
    {
      title: "Orders",
      value: orders.length.toString(),
      change: "+15.3%",
      icon: <ShoppingBag className="h-4 w-4" />,
      color: "text-blue-600",
    },
    {
      title: "Customers",
      value: uniqueCustomers.toString(),
      change: "+8.2%",
      icon: <Users className="h-4 w-4" />,
      color: "text-purple-600",
    },
    {
      title: "Products",
      value: productsCount.toString(),
      change: "+2.4%",
      icon: <Package className="h-4 w-4" />,
      color: "text-orange-600",
    },
  ];

  const recentOrders = orders.slice(0, 5);
  return (
    <div className="min-h-screen bg-gray-50 ">

      <div className="border-b border-gray-200 bg-white">
        <div className="px-6 py-3">
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            Admin Panel
          </Badge>
        </div>
      </div>

      <div className="p-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900  mb-2">
            Welcome back, Admin! 👋
          </h1>
          <p className="text-gray-600 ">
            Here&apos;s what&apos;s happening with Yugantar today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 ">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 ">
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className={`p-2 rounded-full bg-gray-100  ${stat.color}`}
                  >
                    {stat.icon}
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600 font-medium">
                    {stat.change}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">
                    from last month
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Orders</CardTitle>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="text-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600 ">
                    Loading orders...
                  </p>
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 ">
                    No orders found
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentOrders.map((order, index) => {
                    const getStatusBadgeVariant = (status: string) => {
                      switch (status) {
                        case "delivered":
                          return "default";
                        case "confirmed":
                          return "secondary";
                        case "shipped":
                          return "outline";
                        case "placed":
                          return "destructive";
                        default:
                          return "secondary";
                      }
                    };

                    return (
                      <div
                        key={order._id}
                        className="flex items-center justify-between p-4 border border-gray-200  rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-900 ">
                              {order.orderId}
                            </span>
                            <div className="flex items-center space-x-2">
                              <Badge
                                variant={getStatusBadgeVariant(
                                  order.orderStatus
                                )}
                              >
                                {order.orderStatus.charAt(0).toUpperCase() +
                                  order.orderStatus.slice(1)}
                              </Badge>
                              <select
                                value={order.orderStatus}
                                onChange={(e) =>
                                  updateOrderStatus(
                                    order.orderId,
                                    e.target.value
                                  )
                                }
                                className="text-xs bg-transparent border rounded px-2 py-1"
                              >
                                <option value="placed">Placed</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="shipped">Shipped</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 ">
                            {order.address.fullName} - {order.address.city},{" "}
                            {order.address.state}
                          </p>
                          <p className="text-sm text-gray-500 ">
                            {order.items.length} item
                            {order.items.length > 1 ? "s" : ""} •{" "}
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900 ">
                            ₹{order.total.toFixed(2)}
                          </p>
                          <div className="flex space-x-1 mt-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // NOTE: Full order details modal planned for admin dashboard v2
                                alert(
                                  `Order Details: ${
                                    order.orderId
                                  }\nItems: ${order.items
                                    .map((item) => item.title)
                                    .join(", ")}\nTotal: ₹${order.total}`
                                );
                              }}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Top Products</CardTitle>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border border-gray-200  rounded-lg"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 ">
                        {product.name}
                      </h4>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-sm text-gray-600 ">
                          {product.sales} sales
                        </span>
                        <div className="flex items-center">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                          <span className="text-sm text-gray-600 ">
                            {product.rating}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 ">
                        {product.revenue}
                      </p>
                      <div className="flex space-x-1 mt-1">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/admin/products">
                <Button
                  variant="outline"
                  className="h-20 flex-col bg-transparent w-full"
                >
                  <Package className="h-6 w-6 mb-2" />
                  Manage Products
                </Button>
              </Link>
              <Link href="/admin/catalog">
                <Button
                  variant="outline"
                  className="h-20 flex-col bg-transparent w-full"
                >
                  <Plus className="h-6 w-6 mb-2" />
                  Manage Catalog
                </Button>
              </Link>
              <Button
                variant="outline"
                className="h-20 flex-col bg-transparent w-full"
                disabled
                title="Coming soon"
              >
                <Users className="h-6 w-6 mb-2" />
                Manage Users
              </Button>
              <Link href="/orders" className="contents">
                <Button
                  variant="outline"
                  className="h-20 flex-col bg-transparent w-full"
                >
                  <ShoppingBag className="h-6 w-6 mb-2" />
                  View Orders
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6">
          {bannersLoading ? (
            <Card>
              <CardHeader>
                <CardTitle>Homepage Banners</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  Loading banners...
                </div>
              </CardContent>
            </Card>
          ) : (
            <BannerManagement banners={banners} onRefresh={fetchBanners} />
          )}
        </div>
      </div>
    </div>
  );
}
