# StyleSage (Yugantar) — T-Shirt E-Commerce Platform

A production-grade, full-stack e-commerce platform for custom t-shirts built with **Next.js 14, TypeScript, Supabase (PostgreSQL), and Razorpay**.

> ⚠️ **Active Development**: This project is undergoing a production-readiness overhaul. See [Technical Roadmap](#technical-roadview) for in-progress differentiators.

## What Makes This Different

This is not a generic e-commerce template. It is being built with:

- **Event-driven order processing** with Razorpay webhooks and idempotent payment handling
- **Atomic inventory reservation** with TTL to prevent overselling
- **AI-powered visual search** — upload a photo, find similar t-shirts
- **3D product configurator** with real-time WebGL preview
- **Real-time collaborative admin dashboard** via Supabase Realtime
- **Full-text fuzzy search** with typo tolerance

---

## Tech Stack

### Frontend
- **Next.js 14** — App Router, React Server Components
- **TypeScript** — Strict type safety
- **Tailwind CSS** — Utility-first styling
- **Radix UI** — Accessible primitives
- **React Three Fiber** — 3D product configurator
- **Vercel AI SDK** — Conversational AI assistant

### Backend
- **Next.js API Routes** — Server-side endpoints
- **Supabase (PostgreSQL)** — Primary database with real-time subscriptions
- **pgvector** — Vector embeddings for AI search
- **Redis (Upstash)** — Rate limiting, caching, session TTLs
- **Razorpay** — Payment gateway with webhook verification
- **Cloudinary** — Image CDN with transformation pipeline
- **Resend** — Transactional email delivery

### DevOps & Observability
- **Vitest** — Unit testing
- **Playwright** — E2E critical path testing
- **Sentry** — Error tracking
- **Pino** — Structured logging
- **Supabase CLI** — Database migrations

---

## Architecture Highlights

```
Client (Next.js 14)
  ├── SSR Product Pages (ISR)
  ├── 3D Configurator (React Three Fiber)
  ├── AI Chat Assistant (RAG + Tool Calling)
  └── PWA (Service Worker + Offline Cart)

API Layer (Next.js App Router)
  ├── /api/checkout — Atomic stock reservation + Razorpay order
  ├── /api/checkout/verify — Signature verification + event emission
  ├── /api/webhooks/razorpay — Idempotent webhook handling
  ├── /api/search/visual — CLIP embedding similarity search
  └── /api/chat — Streaming AI responses with inventory access

Data Layer
  ├── Supabase PostgreSQL — Products, orders, users, events
  ├── pgvector — Product image embeddings
  ├── Redis — Rate limits, cart sessions, stock reservations
  └── Event Log — Append-only order state transitions
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase project (or local Supabase CLI)
- Redis instance (Upstash free tier works)
- Razorpay account (test mode)
- Cloudinary account
- OpenAI or Anthropic API key (for AI features)

### Environment Variables

Create a `.env.local` file:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Authentication
JWT_SECRET=your_jwt_secret_min_32_chars
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=your_secure_password

# Razorpay
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_key_id

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Redis (Upstash)
REDIS_URL=rediss://default:your_token@your_host:6379

# Email
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev
ORDER_ADMIN_EMAIL=admin@example.com

# AI Services
OPENAI_API_KEY=sk-xxxxxxxx
# or ANTHROPIC_API_KEY=sk-ant-xxxxxxxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Installation

```bash
# Clone repository
git clone https://github.com/Manas-bh/yugantar.git
cd yugantar

# Install dependencies
npm install

# Set up Supabase (if using local CLI)
supabase start

# Run database migrations
supabase db push

# Start development server
npm run dev
```

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Lint
npm run lint

# Type check
npm run typecheck
```

---

## Project Structure

```
├── app/                       # Next.js App Router
│   ├── api/                   # API routes
│   │   ├── auth/              # Authentication (JWT + Google OAuth)
│   │   ├── checkout/          # Checkout + payment verification
│   │   ├── webhooks/          # Razorpay webhook handler
│   │   ├── search/            # Visual + text search
│   │   └── ...
│   ├── (categories)/          # Dynamic category pages
│   ├── admin/                 # Admin dashboard
│   ├── products/              # Product detail pages
│   └── layout.tsx             # Root layout + providers
├── components/
│   ├── ui/                    # Base UI primitives (shadcn)
│   ├── auth/                  # Auth forms
│   ├── admin/                 # Admin components
│   └── three/                 # 3D configurator components
├── lib/
│   ├── data/                  # Data access layer (Supabase)
│   ├── domain/                # Domain types
│   ├── services/              # Business logic (pricing, embeddings)
│   ├── security/              # Auth guards, rate limiting
│   ├── supabase/              # Supabase client configuration
│   └── logger.ts              # Structured logging (Pino)
├── supabase/
│   └── migrations/            # Database migrations
├── tests/
│   ├── unit/                  # Vitest tests
│   └── e2e/                   # Playwright tests
└── public/                    # Static assets
```

---

## Key Features Implementation

### Inventory Reservation System
Prevents overselling by atomically reserving stock during checkout with a 15-minute TTL. Expired reservations auto-release via cron job.

```typescript
// Atomic reservation via Supabase RPC
const { data } = await supabase.rpc('reserve_stock', {
  p_order_id: orderId,
  p_product_id: productId,
  p_size: 'XL',
  p_quantity: 2,
  p_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
});
```

### Razorpay Webhook Handling
Idempotent webhook processing with signature verification and event replay protection.

```typescript
// /api/webhooks/razorpay
const isAuthentic = verifyWebhookSignature(body, signature, secret);
if (isAuthentic) {
  await processEventWithIdempotency(event, idempotencyKey);
}
```

### AI Visual Search
Upload a photo → generate CLIP embedding → find similar products via pgvector cosine similarity.

---

## Technical Roadview

| Phase | Focus | Key Deliverables |
|-------|-------|-----------------|
| **Phase 0** (Week 1-2) | Stop the bleeding | Fix race condition, add webhooks, rewrite README, fix rate limiting |
| **Phase 1** (Week 3-6) | Engineering foundation | Tests (Vitest + Playwright), Sentry, caching, Zod validation, migrations |
| **Phase 2** (Week 7-12) | Core differentiators | Inventory reservations, event pipeline, full-text search, real-time admin |
| **Phase 3** (Week 13-18) | AI features | AI SEO engine, visual search, image pipeline, PWA |
| **Phase 4** (Week 19-24) | Outstanding polish | AI chatbot, 3D configurator, size ML, dynamic pricing |

---

## Security

- JWT tokens with HTTP-only cookies
- bcryptjs password hashing (cost factor 12)
- Rate limiting via Redis (per-IP, per-user, per-endpoint)
- Razorpay webhook signature verification (HMAC-SHA256)
- Input validation via Zod on all API routes
- Row Level Security (RLS) planned for Supabase tables
- CSP headers and security headers via next.config

---

## License

MIT License — see [LICENSE](LICENSE) for details.

## Contact

Manas Bhaintwal — [GitHub](https://github.com/ManasBhaintwal)
