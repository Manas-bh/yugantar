"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DynamicNavbar } from "@/components/dynamic-navbar";
import { UserMenu } from "@/components/auth/user-menu";
import { CartBadge } from "@/components/cart-badge";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Site-wide header component.
 *
 * Automatically detects the current path for active-link highlighting
 * and hides the cart badge on auth / admin routes.
 *
 * Placed once in the root layout — individual pages do NOT need to
 * import or render this component.
 */
export function SiteHeader() {
  const pathname = usePathname();

  // Hide cart on auth and admin routes
  const hideCart =
    !pathname ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/admin");

  const hideNav = pathname && pathname.startsWith("/admin");

  return (
    <header className="app-shell sticky top-0 z-50">
      <div className="section-shell overflow-hidden bg-background/95 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-3 sm:h-[74px] sm:px-5">
          <div className="flex min-w-0 flex-1 items-center">
            {!hideNav && <DynamicNavbar currentPath={pathname} />}
          </div>

          <Link
            href="/"
            className="absolute left-1/2 -translate-x-1/2 text-lg font-black uppercase tracking-[0.16em] text-foreground sm:text-2xl sm:tracking-[0.22em]"
          >
            Yugantar
          </Link>

          <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="icon"
              className="hidden h-10 w-10 rounded-full border-border bg-background text-foreground hover:bg-muted sm:inline-flex"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </Button>
            <UserMenu />
            {!hideCart && <CartBadge />}
          </div>
        </div>
      </div>
    </header>
  );
}
