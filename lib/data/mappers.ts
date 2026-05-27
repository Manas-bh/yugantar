import type { IUser, IOrder, IOrderItem, IProduct } from "@/lib/domain/types";
import type {
  UserRecord,
  OrderRecord,
  ProductRecord,
  UserRole,
  AuthProvider,
  OrderStatus,
  PaymentStatus,
  OrderAddressRecord,
  OrderPaymentRecord,
} from "@/lib/data/types";

function toDate(value: string | null | undefined): Date | undefined {
  if (value === null || value === undefined) return undefined;
  const parsed = new Date(value);
  // Guard against Invalid Date
  return isNaN(parsed.getTime()) ? undefined : parsed;
}

export function mapUserRecordToIUser(record: UserRecord): IUser {
  return {
    _id: record.id,
    email: record.email,
    name: record.name,
    password: record.password || undefined,
    picture: record.picture || undefined,
    role: record.role,
    provider: record.provider,
    googleId: record.google_id || undefined,
    isEmailVerified: record.is_email_verified,
    createdAt: toDate(record.created_at) ?? new Date(),
    updatedAt: toDate(record.updated_at) ?? new Date(),
    lastLoginAt: toDate(record.last_login_at),
  } as IUser;
}

export function mapIUserCreateToUserInsert(input: {
  email: string;
  name: string;
  password?: string;
  picture?: string;
  role?: UserRole;
  provider: AuthProvider;
  googleId?: string;
  isEmailVerified?: boolean;
}): Omit<UserRecord, "id" | "created_at" | "updated_at"> {
  return {
    email: input.email,
    name: input.name,
    password: input.password || null,
    picture: input.picture || null,
    role: input.role || "user",
    provider: input.provider,
    google_id: input.googleId || null,
    is_email_verified: input.isEmailVerified ?? false,
    last_login_at: new Date().toISOString(),
  };
}

export function mapOrderRecordToIOrder(record: OrderRecord): IOrder {
  // Safely validate items array before casting
  const items: IOrderItem[] = Array.isArray(record.items)
    ? (record.items as IOrderItem[])
    : [];

  return {
    _id: record.id,
    userId: record.user_id,
    orderId: record.order_id,
    items,
    address: record.address,
    payment: record.payment,
    orderStatus: record.order_status,
    subtotal: record.subtotal,
    shipping: record.shipping,
    tax: record.tax,
    total: record.total,
    cancelReason: record.cancel_reason || undefined,
    cancelledAt: record.cancelled_at ? new Date(record.cancelled_at) : undefined,
    createdAt: toDate(record.created_at) ?? new Date(),
    updatedAt: toDate(record.updated_at) ?? new Date(),
  } as IOrder;
}

export function mapOrderCreateToInsert(input: {
  userId: string;
  orderId: string;
  items: IOrderItem[];
  address: OrderAddressRecord;
  payment: OrderPaymentRecord;
  orderStatus: OrderStatus;
  subtotal: number;
  shipping: number;
  tax?: number;
  total: number;
}): Omit<
  OrderRecord,
  "id" | "created_at" | "updated_at" | "cancel_reason" | "cancelled_at"
> {
  return {
    user_id: input.userId,
    order_id: input.orderId,
    items: input.items,
    address: input.address,
    payment: input.payment,
    order_status: input.orderStatus,
    subtotal: input.subtotal,
    shipping: input.shipping,
    tax: input.tax || 0,
    total: input.total,
  };
}

export function mapProductRecordToIProduct(record: ProductRecord): IProduct {
  return {
    _id: record.id,
    name: record.name,
    slug: record.slug,
    description: record.description,
    price: record.price,
    originalPrice: record.original_price || undefined,
    images: record.images,
    category: record.category,
    tags: record.tags,
    sizes: record.sizes,
    colors: record.colors,
    stock: record.stock,
    isActive: record.is_active,
    isFeatured: record.is_featured,
    rating: record.rating,
    reviews: record.reviews,
    createdAt: toDate(record.created_at) ?? new Date(),
    updatedAt: toDate(record.updated_at) ?? new Date(),
  } as IProduct;
}

export function toRecordPaymentStatus(status: string): PaymentStatus {
  if (status === "completed" || status === "failed") {
    return status;
  }
  return "pending";
}
