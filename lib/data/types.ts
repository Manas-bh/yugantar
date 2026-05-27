export type UserRole = "user" | "admin";
export type AuthProvider = "email" | "google";

export type OrderStatus =
  | "placed"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PaymentStatus = "pending" | "completed" | "failed";

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  password: string | null;
  picture: string | null;
  role: UserRole;
  provider: AuthProvider;
  google_id: string | null;
  is_email_verified: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductRecord {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  original_price: number | null;
  images: string[];
  category: string[];
  tags: string[];
  sizes: string[];
  colors: string[];
  stock: Record<string, number>;
  is_active: boolean;
  is_featured: boolean;
  rating: number;
  reviews: number;
  created_at: string;
  updated_at: string;
}

export interface OrderRecord {
  id: string;
  user_id: string;
  order_id: string;
  items: OrderItemRecord[];
  address: OrderAddressRecord;
  payment: OrderPaymentRecord;
  order_status: OrderStatus;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  cancel_reason: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItemRecord {
  productId: string;
  title: string;
  price: number;
  quantity: number;
  size: string;
  image: string;
}

export interface OrderAddressRecord {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pinCode: string;
  phone: string;
}

export interface OrderPaymentRecord {
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
}

export interface AuthEmailOtpRecord {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  otp_hash: string;
  expires_at: string;
  attempt_count: number;
  resend_count: number;
  last_sent_at: string;
  created_at: string;
  updated_at: string;
}
