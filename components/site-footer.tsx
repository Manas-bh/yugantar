import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="app-shell mt-16 pb-6 pt-10 sm:mt-20">
      <div className="section-shell px-5 py-8 sm:px-8 sm:py-10">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="text-2xl font-black uppercase tracking-[0.15em] text-foreground sm:text-3xl">
              Yugantar
            </h3>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Till End of the Era. Premium statement tees built for everyday expression.
            </p>
            <p className="mt-4 text-sm font-medium text-foreground">support@yugantar.com</p>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-foreground">Menu</h4>
            <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/" className="transition-colors hover:text-primary">
                Home
              </Link>
              <Link href="/collections" className="transition-colors hover:text-primary">
                Store
              </Link>
              <Link href="/about" className="transition-colors hover:text-primary">
                About
              </Link>
              <Link href="/contact" className="transition-colors hover:text-primary">
                Contact
              </Link>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-foreground">Quick Links</h4>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-muted-foreground sm:grid-cols-1">
              <Link href="/faq" className="transition-colors hover:text-primary">
                FAQ
              </Link>
              <Link href="/shipping" className="transition-colors hover:text-primary">
                Shipping
              </Link>
              <Link href="/profile" className="transition-colors hover:text-primary">
                Account
              </Link>
              <Link href="/orders" className="transition-colors hover:text-primary">
                Orders
              </Link>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-foreground">Explore</h4>
            <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
              <Link
                href="/collections"
                className="transition-colors hover:text-primary"
              >
                Collections
              </Link>
              <Link
                href="/anime"
                className="transition-colors hover:text-primary"
              >
                Anime Tees
              </Link>
              <Link
                href="/meme"
                className="transition-colors hover:text-primary"
              >
                Meme Tees
              </Link>
              <Link
                href="/custom"
                className="transition-colors hover:text-primary"
              >
                Custom Prints
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-border/80 bg-background px-4 py-3 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} YUGANTAR. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
