# StyleSage Bug Findings Summary

## Authentication & Security Issues

### App Directory
1. **Inappropriate HTTP Status Code** (`app/api/auth/register/verify-otp/route.ts:69-71`)
   - Returns 410 (Gone) for expired OTP; should use 400 or 408

2. **Missing Bcrypt Error Handling** (`lib/auth.ts:55-56, 60-61`)
   - `bcrypt.hash()` and `bcrypt.compare()` calls lack try/catch for promise rejections

3. **Potential User Enumeration via Timing** (`lib/auth.ts:148-150`)
   - `authenticateUser()` reveals user existence through timing differences

4. **No Server-Side Token Invalidation on Logout** (`app/api/auth/logout/route.ts:8`)
   - Only clears cookie; tokens remain valid until expiration

5. **Missing CSRF Protection** (All API routes in `/app/api/`)
   - No CSRF protection for state-changing operations

6. **No Rate Limiting on Auth Check Endpoint** (`app/api/auth/me/route.ts`)
   - Missing rate limiting allows unlimited token validation attempts

7. **Weak Password Policy** (`app/api/auth/register/start/route.ts:52-56`)
   - Only requires 8-character minimum length

8. **Inconsistent OTP Expiration Handling** (`app/api/auth/register/verify-otp/route.ts:66`)
   - Depends on correct `expires_at` storage format

9. **Redundant Admin Initialization Check** (`lib/auth.ts:143-146`)
   - `initializeDefaultAdmin()` called during auth unnecessarily

10. **Potential Structured Data Conflicts** (`app/layout.tsx:63-65` and `/app/page.tsx:30-48`)
    - Multiple structured data generators may produce conflicting JSON-LD

## Component Issues

### Components Directory
1. **dynamic-featured-products.tsx** (Line 45)
   - `selectedSizes` state initialization type could be more specific

2. **product-card-actions.tsx** (Lines 48, 46-47)
   - Hardcoded `defaultColor="Black"` may not match actual product colors
   - `colors` prop calculation could fail if `product.colors` is undefined

3. **auth/login-form.tsx** (Lines 33-35, 90-104)
   - Google OAuth callback URL construction doesn't validate final URL safety

4. **auth/signup-form.tsx** (Lines 48-60, 193-206)
   - Google signup lacks callbackUrl parameter unlike login form

5. **category-hero-banner.tsx** (Lines 60-112)
   - `useEffect` dependency array includes `fallback` object which may cause excessive re-renders

6. **dynamic-navbar.tsx** (Lines 88-112)
   - Manual addition of "collections" category could create duplicates

## Hooks Issues

### Hooks Directory
1. **use-stock-check.ts**
   - **Line 65**: Error handling assumes `err` is always an Error instance
   - **Line 54**: Setting `stock = 0` on API error may not be appropriate
   - **Line 30-32**: URL construction uses template literals; consider URLSearchParams

2. **use-toast.ts**
   - **Line 12**: `TOAST_REMOVE_DELAY = 1000000` (1000 seconds) is excessively long
   - **Line 11**: `TOAST_LIMIT = 1` restricts to only one toast at a time
   - **Lines 177-185**: `useEffect` dependency array `[state]` causes unnecessary re-subscriptions

3. **use-mobile.tsx**
   - **Line 6**: Initial state `undefined` causes flicker on first render
   - **Line 9**: Media query uses inconsistent boundary condition (767px vs 768px)

## Lib Directory Issues

### Lib Directory
1. **lib/data/mappers.ts** (Lines 14-15, 29-31, 73-74, 125)
   - `toDate` function returns new Date() for null/undefined values instead of preserving null/undefined

2. **lib/data/mappers.ts** (Line 53)
   - `is_email_verified: Boolean(input.isEmailVerified)` converts undefined to false; better to use `input.isEmailVerified ?? false`

3. **lib/data/mappers.ts** (Line 63)
   - `items: (record.items || []) as IOrderItem[]` - unsafe cast if record.items isn't actually IOrderItem[]

4. **lib/stock-utils.ts** (Lines 116-119, 165-119)
   - `restoreStock` and `reduceStock` functions spread `product.stock` as Record<string, number> which could be problematic if product.stock is a Map

5. **lib/data/legacy-products.ts** (Throughout)
   - Hardcoded product data that should likely be in a database or external file

## Recommendations

### High Priority
1. Fix bcrypt error handling in lib/auth.ts
2. Implement proper server-side token invalidation on logout
3. Add CSRF protection to API routes
4. Fix the toDate function in lib/data/mappers.ts
5. Correct the excessively long toast timeout in use-toast.ts

### Medium Priority
1. Implement proper password complexity requirements
2. Fix OTP expiration handling
3. Address potential user enumeration timing attack
4. Fix duplicate category addition in dynamic-navbar.tsx
5. Improve error handling in use-stock-check.ts

### Low Priority
1. Improve type definitions in component state
2. Fix inconsistent media query breakpoint in use-mobile.tsx
3. Add callbackUrl to Google signup form for consistency
4. Optimize useEffect dependencies in hooks
5. Remove redundant admin initialization check