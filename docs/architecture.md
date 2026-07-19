# StyleSage -- Production Architecture Document

> Interview-ready system design for a full-stack Indian e-commerce platform built on Next.js 14, Supabase, Redis, Cloudinary, Razorpay, and Resend.

---

## Table of Contents

1. [High Level Design (HLD)](#1-high-level-design-hld)
   - [System Overview](#11-system-overview)
   - [Architecture Diagram](#12-architecture-diagram)
   - [Data Flow](#13-data-flow)
   - [Deployment Infrastructure](#14-deployment-infrastructure)
   - [Security Layer](#15-security-layer)
2. [Low Level Design (LLD)](#2-low-level-design-lld)
   - [Component Tree](#21-component-tree)
   - [API Specification](#22-api-specification)
   - [Database Schema](#23-database-schema)
3. [Interview Talking Points](#3-interview-talking-points)
   - [SOLID Principles](#31-solid-principles)
   - [Scalability](#32-scalability)
   - [Trade-offs](#33-trade-offs)

---

## 1. High Level Design (HLD)

### 1.1 System Overview

StyleSage is a **serverless-first e-commerce PWA** for premium t-shirts in India. It migrated from a legacy MongoDB/Mongoose stack to a Supabase (PostgreSQL) backend while preserving the Next.js 14 App Router frontend. The system serves ~20 public routes, an admin dashboard, JWT-based authentication, a payment-backed checkout flow with inventory reservations, and real-time cart synchronization across devices.

**Key characteristics:**
- **Architecture style**: Serverless / Edge-ready monolith (Next.js)
- **Auth model**: Stateless JWT (custom implementation via `jose`)
- **Data layer**: PostgreSQL via Supabase service-role client (server-side only)
- **Caching & rate limiting**: Upstash Redis (REST API, serverless-compatible)
- **File storage**: Cloudinary CDN (auto-optimization, WebP/AVIF)
- **Payments**: Razorpay (Indian market) with webhook verification
- **Email**: Resend for transactional order emails
- **Observability**: Pino structured logging + Vercel Analytics/Speed Insights

### 1.2 Architecture Diagram

```
                                .--------------------.
                                |      Client        |
                                | (Browser / Mobile) |
                                '---------+----------'
                                          |
                          +---------------+---------------+
                          | Edge Network (Vercel CDN)   |
                          +---------------+---------------+
                                          |
                    +---------------------+---------------------+
                    |                                               |
         +----------v-----------+                      +------------v----------+
         |  Next.js App Router  |                      |  Middleware ( Edge )  |
         |  - SSR / ISR Pages   |                      |  - JWT verification   |
         |  - React Server      |                      |  - Route guards       |
         |    Components        |                      |  - Redirect to /auth  |
         +----------+-----------+                      +------------+----------+
                    |                                               |
         +----------v-----------+                      +------------v----------+
         |  Route Handlers      |                      |  Auth Middleware      |
         |  (/api/*)            |                      |  - Protected routes   |
         |  - Zod validation    |                      |  - Role-based access  |
         |  - Auth guards       |                      |    (admin/user)       |
         |  - Rate limiting     |                      +---------------------+
         +----------+-----------+
                    |
     +--------------+--------------+--------------+--------------+
     |              |              |              |              |
+----v----+   +----v----+   +----v----+   +----v----+   +-----v-----+
|Supabase |   |  Redis  |   |Razorpay |   |Cloudinar|   |  Resend   |
|Postgres |   |(Upstash)|   |Payments |   |   CDN   |   |  Email    |
+---------+   +---------+   +---------+   +---------+   +-----------+
```

### 1.3 Data Flow

#### A. Anonymous Product Browse (SSR)
1. **User** requests `/collections` (anonymous visitor).
2. **Edge CDN** returns cached page if available; otherwise forwards to Vercel.
3. **Next.js Server Component** calls `listProducts({ isActive: true })`.
4. **Repository Layer** (`lib/data/products.ts`) queries Supabase via service-role client.
5. **Mapper** (`lib/data/mappers.ts`) transforms DB records (`snake_case`) into domain models (`camelCase`).
6. **React Server Component** renders HTML, streamed to the browser.
7. **Vercel Analytics** and **Speed Insights** beacon performance data.

#### B. Authenticated Checkout Flow
1. **User** clicks checkout; `middleware.ts` intercepts the request.
2. **Middleware** reads `auth_token` cookie → `jwtVerify` via `jose`.
   - Missing token → redirect to `/auth?callbackUrl=/checkout`.
   - Invalid token → redirect with sanitized callback URL.
3. **Next.js App Router** renders checkout page; client-side `useAuth()` bootstraps user context.
4. **Cart** syncs to server via `/api/cart` (guest session ID cookie, debounced 500ms).
5. **POST /api/checkout**:
   - `requireAuthenticatedUser` guard validates JWT.
   - Zod schema validates `{ items, address }`.
   - `buildPricedCheckoutItems` fetches current DB prices (prevents price tampering).
   - `validateStock` checks real-time inventory per size.
   - `reserveStockForOrder` creates a timed reservation (prevents overselling).
   - Razorpay order created (`amount` in paise, `INR`).
   - `createOrderRecord` persists order in `orders` table (status: `placed`, payment: `pending`).
6. **Payment callback** (client-side or webhook):
   - Razorpay signature verified with HMAC-SHA256.
   - Order status updated to `confirmed`.
   - Stock deducted via `reduceStock`.
   - `sendNewOrderEmails` dispatches user + admin confirmation emails via Resend.
7. **Order page** polls `/api/orders` with `no-store` cache headers.

#### C. Admin Order Management
1. **Admin** navigates `/admin`.
2. **Middleware** enforces `role === "admin"` in JWT payload.
3. **GET /api/orders?admin=true** returns all orders via `requireAdminUser` guard.
4. **PUT /api/orders** (admin only) updates status:
   - Status transitions validated (e.g., cannot uncancel).
   - Cancelling a confirmed order triggers `restoreStock`.
   - `sendOrderStatusUpdateEmail` notifies customer.

### 1.4 Deployment Infrastructure

| Layer | Service | Purpose |
|---|---|---|
| **Edge / CDN** | Vercel | Hosting, SSR, ISR, edge functions, image optimization |
| **Compute** | Vercel Serverless Functions | Next.js API routes + cron jobs |
| **Primary DB** | Supabase PostgreSQL | User, product, order, cart, stock-reservation tables |
| **Cache / Rate Limit** | Upstash Redis | Distributed rate limiting, session-like counters |
| **Image CDN** | Cloudinary | Product image upload, auto-resize, WebP delivery via `f_auto,q_auto` |
| **Payments** | Razorpay | Indian payment processing, order creation, signature verification |
| **Email** | Resend | Transactional emails (order confirmations, status updates) |
| **Observability** | Vercel Analytics + Speed Insights | Real User Monitoring (RUM), Core Web Vitals |
| **Logging** | Pino (stdout JSON) | Structured logs; ingestible into Datadog / Axiom / Logflare |
| **Cron** | Vercel Cron | `*/1 * * * *` -- releases expired stock reservations |

**Vercel-specific configuration:**
- `vercel.json`: cron job at `/api/cron/release-expired-reservations` every minute.
- `next.config.mjs`: avif/webp formats, Cloudinary + Unsplash remotePatterns, device sizes tuned for India (360px → 1536px).
- Build-time env vars: `NODE_ENV=production`.

### 1.5 Security Layer

| Threat | Mitigation | Implementation |
|---|---|---|
| **JWT Theft** | `httpOnly`, `Secure`, `SameSite=Lax` cookies; 7-day expiry | `lib/security/cookies.ts` |
| **Token Replay** | In-memory denylist with TTL cleanup | `lib/security/token-denylist.ts` |
| **Timing Attacks** | Constant-time bcrypt comparison on invalid credentials | `lib/auth.ts` -- fake hash compare |
| **User Enumeration** | Same error path + timing for missing vs wrong password | `authenticateUser()` |
| **Rate Limiting** | Redis-backed per-IP + per-user counters | `lib/security/rate-limit.ts` (Upstash) |
| **CSRF** | `SameSite=Lax` cookies; origin validation on stateful mutations | Cookie config + middleware checks |
| **XSS / Injection** | Zod input validation; HTML escaping in emails | `lib/validation/` + `escapeHtml()` |
| ** Privilege Esc** | Route guards + middleware double-enforce admin role | `requireAdminUser` + middleware.ts |
| **Callback Hijacking** | Strict allow-list + length limit for `callbackUrl` | `sanitizeCallbackUrl()` |
| **SQL Injection** | Parameterized queries via Supabase client | No raw SQL concatenation |
| **Password Storage** | bcrypt with 12 rounds | `hashPassword()` |
| **Secrets** | Runtime validation (fail-fast for missing keys) | Module-level throws in `auth.ts`, `cloudinary.ts` |
| **PII** | Logger redaction for passwords, tokens, PIN codes, phones | Pino `redact.paths` |

---

## 2. Low Level Design (LLD)

### 2.1 Component Tree

```
app/
├── layout.tsx                    # Root layout: fonts, SEO schema, providers, analytics
├── page.tsx                      # Homepage: hero carousel, featured products
├── globals.css                   # Tailwind + custom CSS variables
│
├── (categories)/[category]/      # Dynamic category pages (ISR-friendly)
│   └── page.tsx
│
├── products/[slug]/              # Product detail (SSR)
│   └── page.tsx
│
├── cart/                         # Shopping cart (client-heavy)
├── checkout/                     # Checkout flow
├── payment/                      # Razorpay integration client
├── success/                      # Post-payment confirmation
├── orders/                       # Order history
├── address/                      # Saved addresses
├── profile/                      # User profile
│
├── auth/                         # Login / Register / OAuth callback
│   └── page.tsx
│
├── admin/                        # Admin dashboard
│   ├── page.tsx                  # Dashboard metrics
│   ├── products/                 # Product CRUD
│   └── catalog/                  # Catalog management
│
├── api/                          # Route Handlers (REST-ish)
│   ├── auth/                     # login, register, logout, me, google, otp
│   ├── products/                 # CRUD
│   ├── categories/               # List categories
│   ├── cart/                     # Guest + authenticated cart
│   ├── checkout/                 # Create Razorpay order + DB order
│   ├── orders/                   # GET (user/admin), PUT (admin)
│   ├── banners/                  # Hero banner data
│   ├── contact/                  # Contact form submission
│   ├── pincode/                  # Pincode serviceability
│   └── cron/                     # Stock reservation cleanup
│
├── about, contact, faq, shipping, ... # Static / semi-static pages
│
lib/
├── domain/
│   └── types.ts                  # Pure TS interfaces (IUser, IProduct, IOrder, IOrderItem)
│
├── data/                         # Repository + data access layer
│   ├── base-repository.ts        # Generic CRUD over Supabase
│   ├── mappers.ts                # DB record ↔ domain model mapping
│   ├── types.ts                  # Row-level DB types
│   ├── users.ts                  # User CRUD
│   ├── products.ts               # Product queries + mutations
│   ├── orders.ts                 # Order persistence
│   ├── carts.ts                  # Cart persistence
│   ├── stock.ts                  # Stock reads/writes
│   ├── stock-reservations.ts     # Timed inventory holds
│   ├── categories.ts             # Category queries
│   └── banners.ts                # Banner queries
│
├── security/
│   ├── auth-guards.ts            # requireAuthenticatedUser, requireAdminUser
│   ├── cookies.ts                # Auth cookie helpers
│   ├── rate-limit.ts             # Upstash Redis rate limiter
│   ├── token-denylist.ts         # Logout token invalidation
│   ├── upload.ts                 # File upload guards
│   └── validation.ts             # Input sanitizers (email, URL, name)
│
├── validation/
│   ├── schemas.ts                # Zod schemas (auth, cart, checkout, product, order)
│   └── api.ts                    # validateBody / validateQuery / validateParams helpers
│
├── services/
│   └── pricing.ts                # buildPricedCheckoutItems, computeOrderTotals
│
├── email/
│   ├── order-notifications.ts    # sendNewOrderEmails, sendOrderStatusUpdateEmail
│   └── auth-otp.ts               # OTP email dispatch
│
├── supabase/
│   └── server.ts                 # Singleton admin client, config guards
│
├── auth.ts                       # JWT create/verify, bcrypt, user lookup
├── auth-context.tsx              # React Context for auth state
├── cart-context.tsx              # useReducer + useCallback cart; server sync
├── cloudinary.ts                 # Cloudinary SDK config + upload/delete
├── google-oauth.ts               # OAuth 2.0 flow helpers
├── logger.ts                     # Pino structured logger
├── stock-utils.ts                # validateStock, reduceStock, restoreStock
├── seo.ts                        # Metadata generators, structured data
└── catalog.ts                    # Public catalog helpers

components/
├── ui/                           # shadcn/ui primitives (Button, Card, Dialog, etc.)
├── site-header.tsx               # Navigation + auth state
├── site-footer.tsx               # Footer
├── dynamic-navbar.tsx            # Mobile-responsive nav with sheets
├── product-card.tsx              # Product grid item
├── add-to-cart.tsx               # Add-to-cart interaction
├── error-boundary.tsx            # React Error Boundary
├── providers.tsx                 # CombinedProviders (Cart + Auth)
├── theme-provider.tsx            # next-themes wrapper
└── admin/                        # Admin-specific components
```

### 2.2 API Specification

| Method | Route | Auth | Rate Limit | Description |
|---|---|---|---|---|
| `POST` | `/api/auth/login` | No | 5/min/IP | Email + password → sets `auth_token` cookie |
| `POST` | `/api/auth/register` | No | 5/min/IP | Creates user, returns JWT |
| `POST` | `/api/auth/logout` | Yes | -- | Clears cookie + denylist token |
| `GET`  | `/api/auth/me` | Cookie | -- | Returns current user JSON |
| `GET`  | `/api/auth/google` | No | -- | Initiates Google OAuth flow |
| `GET`  | `/api/auth/callback/google` | No | -- | Exchanges code → JWT |
| `POST` | `/api/auth/otp/send` | No | 2/min/email | Sends 6-digit OTP via Resend |
| `POST` | `/api/auth/otp/verify` | No | 5/min/email | Verifies OTP → JWT |
| `GET`  | `/api/products` | No | 60/min | List active products (paginated) |
| `POST` | `/api/products` | Admin | 30/min | Create product |
| `PUT`  | `/api/products/:id` | Admin | 30/min | Update product |
| `DELETE`| `/api/products/:id` | Admin | 30/min | Delete product |
| `GET`  | `/api/cart` | Session | -- | Get cart by sessionId |
| `POST` | `/api/cart` | Session | 60/min | Sync cart items |
| `POST` | `/api/cart/migrate` | Cookie | -- | Guest → authenticated merge |
| `POST` | `/api/checkout` | Cookie | 10/min/user | Validate → reserve stock → Razorpay order |
| `POST` | `/api/checkout/verify` | Cookie | -- | Verify Razorpay signature, confirm order |
| `GET`  | `/api/orders` | Cookie | -- | User orders; `?admin=true` for all |
| `PUT`  | `/api/orders` | Admin | 60/min | Update order status, restore stock on cancel |
| `GET`  | `/api/categories` | No | -- | List categories |
| `GET`  | `/api/banners` | No | -- | Active hero banners |
| `POST` | `/api/contact` | No | 5/min/IP | Contact form submission |
| `GET`  | `/api/pincode` | No | 60/min | Delivery availability check |
| `GET`  | `/api/cron/release-expired-reservations` | Cron | N/A | Removes expired stock holds |

**Status codes used consistently:**
- `200` OK, `201` Created
- `400` Bad Request (Zod validation failure)
- `401` Unauthorized (missing/invalid JWT)
- `403` Forbidden (non-admin accessing admin route)
- `404` Not Found
- `500` Internal Server Error (logged with traceId)
- `503` Service Unavailable (Supabase not configured)

### 2.3 Database Schema

**PostgreSQL (Supabase) -- snake_case columns**

#### `users`
| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK, default gen_random_uuid() |
| `email` | TEXT | UNIQUE, NOT NULL |
| `name` | TEXT | NOT NULL |
| `password` | TEXT | nullable (Google users) |
| `picture` | TEXT | nullable |
| `role` | TEXT | CHECK (role IN ('user', 'admin')) |
| `provider` | TEXT | CHECK (provider IN ('email', 'google')) |
| `google_id` | TEXT | nullable, UNIQUE |
| `is_email_verified` | BOOLEAN | DEFAULT false |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() |
| `last_login_at` | TIMESTAMPTZ | nullable |

#### `products`
| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `name` | TEXT | NOT NULL |
| `slug` | TEXT | UNIQUE, NOT NULL |
| `description` | TEXT | |
| `price` | NUMERIC | NOT NULL |
| `original_price` | NUMERIC | nullable |
| `images` | JSONB | array of Cloudinary URLs |
| `category` | JSONB | array of category strings |
| `tags` | JSONB | array of tag strings |
| `sizes` | JSONB | array of size strings |
| `colors` | JSONB | array of color strings |
| `stock` | JSONB | `{ "M": 12, "L": 5, ... }` |
| `is_active` | BOOLEAN | DEFAULT true |
| `is_featured` | BOOLEAN | DEFAULT false |
| `rating` | NUMERIC | DEFAULT 0 |
| `reviews` | INTEGER | DEFAULT 0 |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() |

#### `orders`
| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → users.id |
| `order_id` | TEXT | UNIQUE, display ID (e.g., `ORD-1717152000000-AB12CD34`) |
| `items` | JSONB | `IOrderItem[]` |
| `address` | JSONB | `{ full_name, address_line1, city, state, pin_code, phone }` |
| `payment` | JSONB | `{ razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, currency, status }` |
| `order_status` | TEXT | CHECK (order_status IN ('placed','confirmed','shipped','delivered','cancelled')) |
| `subtotal` | NUMERIC | NOT NULL |
| `shipping` | NUMERIC | NOT NULL |
| `tax` | NUMERIC | nullable |
| `total` | NUMERIC | NOT NULL |
| `cancel_reason` | TEXT | nullable |
| `cancelled_at` | TIMESTAMPTZ | nullable |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() |

#### `carts`
| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | nullable (FK → users.id) |
| `session_id` | TEXT | nullable, indexed for guest carts |
| `items` | JSONB | `CartItem[]` |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() |

#### `stock_reservations`
| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `order_id` | TEXT | NOT NULL, indexed |
| `product_id` | UUID | FK → products.id |
| `size` | TEXT | NOT NULL |
| `quantity` | INTEGER | NOT NULL |
| `expires_at` | TIMESTAMPTZ | NOT NULL |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |

#### `categories` & `banners`
Standard lookup tables with `id`, `name`, `slug`, `image_url`, `is_active`, `sort_order`, timestamps.

---

## 3. Interview Talking Points

### 3.1 SOLID Principles

| Principle | Evidence in codebase |
|---|---|
| **Single Responsibility** | `lib/data/*.ts` -- each file handles one entity. `lib/services/pricing.ts` only computes prices; `lib/email/*.ts` only sends emails. |
| **Open/Closed** | `base-repository.ts` provides generic CRUD without modifying existing code for new tables. New entities just supply their mapper. |
| **Liskov Substitution** | Domain types (`IUser`, `IProduct`) are interface-driven; DB mappers safely convert `ProductRecord` → `IProduct` without callers caring about storage format. |
| **Interface Segregation** | `AuthGuardResult` discriminated union gives callers exactly `user` or `error`, never a bloated return type. `JWTPayload` is a strict, minimal contract. |
| **Dependency Inversion** | `lib/supabase/server.ts` abstracts the Supabase client; `lib/logger.ts` abstracts Pino. Business logic depends on abstractions, not concrete libraries directly. |

### 3.2 Scalability

**Horizontal scaling levers:**
1. **Stateless API routes**: No sticky sessions; JWT in cookies means any function instance can serve any request. Upstash Redis provides shared state for rate limiting.
2. **Image offloading**: All product images served from Cloudinary (not Vercel). Next.js `Image` component with `minimumCacheTTL: 86400` minimizes origin hits.
3. **Database**: Supabase provides connection pooling + read replicas if needed. JSONB fields for `stock`, `items`, `address` avoid schema migrations for evolving nested data.
4. **Cron-based cleanup**: Expired stock reservations released every minute instead of holding transactions open.
5. **ISR for catalog pages**: Category and product pages could be statically regenerated with `revalidate` (currently SSR for real-time stock).

**Bottlenecks & mitigation:**
- Stock reservation contention under flash sales → consider Redis-backed inventory counters (currently DB-level). Could introduce event sourcing for high-velocity inventory.
- Email dispatch is synchronous on order confirmation → should be background job queue (QStash / Inngest) at scale.
- Token denylist is in-memory → must migrate to Redis-backed denylist before multi-instance deployment.

### 3.3 Trade-offs

| Decision | Trade-off | Rationale |
|---|---|---|
| **Custom JWT** over NextAuth / Clerk | More engineering burden; but full control over claims, rotation policy, and no vendor lock-in | Small team, specific role-based needs, cost control |
| **Supabase service-role everywhere** | Bypasses RLS; requires server-side discipline | Simpler than Row-Level Security for a small schema; all DB access is in API routes only |
| **JSONB for stock/items/address** | Loses strict DB constraints; gains schema flexibility | Product attributes change frequently; avoids ALTER TABLE churn |
| **Serverless (Vercel) over containers** | Cold-start latency; limited execution time | Zero infrastructure ops; scales to zero; fits Indian indie-dev budget |
| **Razorpay** over Stripe | India-specific (UPI, net banking); less global reach | Target market is India; Razorpay has superior local payment coverage |
| **Client-side cart state** | Hydration complexity; requires mounted-guards | Instant UX feedback; debounced sync to server balances UX and consistency |
| **Zod** over Joi/Yup | Smaller ecosystem but TS-native inference | Type safety across validation → API → frontend with single source of truth |

---

## Appendix: Environment Variables Summary

| Variable | Required For | Scope |
|---|---|---|
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | DB operations | Server |
| `JWT_SECRET` (≥32 chars) | Token signing | Server |
| `RAZORPAY_KEY_ID` / `KEY_SECRET` | Payments | Server |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay SDK init | Client |
| `GOOGLE_CLIENT_SECRET` | OAuth callback | Server |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | OAuth init | Client |
| `CLOUDINARY_URL` or individual keys | Image upload | Server |
| `RESEND_API_KEY` | Emails | Server |
| `UPSTASH_REDIS_REST_URL` / `TOKEN` | Rate limiting | Server |
| `DEFAULT_ADMIN_EMAIL` / `PASSWORD` | Bootstrap admin | Server (one-time) |

---

*Document version: 1.0.0*
*Last updated: 2026-06-01*
*Maintainer: Engineering Team*
