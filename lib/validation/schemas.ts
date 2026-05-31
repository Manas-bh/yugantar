import { z } from "zod";

/**
 * Shared Zod schemas for API request validation.
 */

export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Invalid email format")
  .transform((v) => v.trim().toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters");

export const nameSchema = z
  .string()
  .min(1, "Name is required")
  .max(100, "Name must be at most 100 characters")
  .transform((v) => v.trim());

export const addressSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  addressLine1: z.string().min(1, "Address is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  pinCode: z.string().regex(/^\d{6}$/, "Pin code must be 6 digits"),
  phone: z.string().regex(/^\d{10}$/, "Phone must be 10 digits"),
});

export const cartItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  size: z.string().min(1, "Size is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(10, "Quantity must be at most 10"),
  color: z.string().optional(),
});

export const checkoutBodySchema = z.object({
  items: z.array(cartItemSchema).min(1, "At least one item is required"),
  address: addressSchema,
});

export const checkoutVerifyBodySchema = z.object({
  razorpay_order_id: z.string().min(1, "Razorpay order ID is required"),
  razorpay_payment_id: z.string().min(1, "Razorpay payment ID is required"),
  razorpay_signature: z.string().min(1, "Razorpay signature is required"),
  orderId: z.string().min(1, "Order ID is required"),
});

export const loginBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const registerBodySchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const otpVerifyBodySchema = z.object({
  email: emailSchema,
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

export const otpResendBodySchema = z.object({
  email: emailSchema,
});

export const orderStatusSchema = z.enum([
  "placed",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
]);

export const updateOrderBodySchema = z.object({
  orderStatus: orderStatusSchema.optional(),
  trackingNumber: z.string().optional(),
  notes: z.string().optional(),
});

export const productBodySchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  slug: z.string().min(1, "Slug is required").max(200),
  description: z.string().max(5000).optional(),
  price: z.number().positive("Price must be positive"),
  originalPrice: z.number().positive().optional(),
  category: z.string().min(1, "Category is required"),
  sizes: z.array(z.string()).min(1, "At least one size is required"),
  stock: z.record(z.number().int().min(0)),
  images: z.array(z.string().url()).min(1, "At least one image is required"),
  tags: z.array(z.string()).optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  designType: z.string().optional(),
});
