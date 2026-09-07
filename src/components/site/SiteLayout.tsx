import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Coffee, Mail, MapPin, Menu as MenuIcon, Phone, ShoppingBag, X } from "lucide-react";
import { useCustomerCart } from "@/lib/customerCart";
import { useForcedLightTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/menu", label: "Menu" },
  { to: "/contact", label: "Contact" },
];

export const SiteBrand = ({ className }: { className?: string }) => (
  <Link to="/" className={cn("flex items-center gap-2.5", className)}>
    <span className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-soft">
      <Coffee className="h-5 w-5" />
    </span>
    <span className="leading-tight">
      <span className="block text-lg font-extrabold tracking-tight text-foreground">
        LamaHamar
      </span>
      <span className="block text-[11px] uppercase tracking-[0.22em] text-primary font-semibold">
        Cafe
      </span>
    </span>
  </Link>
);

const SiteLayout = () => {
  useForcedLightTheme();
  const { count } = useCustomerCart();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <SiteBrand />

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "px-3.5 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/order"
              className="relative inline-flex items-center gap-2 h-11 px-4 sm:px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-soft"
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Order Now</span>
              {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-foreground text-background text-[11px] font-bold flex items-center justify-center">
                  {count}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
              className="md:hidden h-11 w-11 rounded-xl border border-border flex items-center justify-center text-foreground"
            >
              {open ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open && (
          <nav className="md:hidden border-t border-border bg-background px-4 py-3 space-y-1">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "block px-3 py-3 rounded-lg text-sm font-medium",
                  pathname === n.to
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-secondary/60"
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <SiteBrand />
            <p className="text-sm text-muted-foreground max-w-xs">
              Freshly brewed coffee, honest food and a warm welcome — every single day.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-bold mb-3">Explore</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {NAV.map((n) => (
                <li key={n.to}>
                  <Link to={n.to} className="hover:text-primary transition-colors">
                    {n.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/order" className="hover:text-primary transition-colors">
                  Order Now
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold mb-3">Visit us</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                Mogadishu, Somalia
              </li>
              <li className="flex items-start gap-2">
                <Phone className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                +252 61 000 0000
              </li>
              <li className="flex items-start gap-2">
                <Mail className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                hello@lamahamarcafe.so
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold mb-3">Opening hours</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex justify-between gap-4">
                <span>Mon – Fri</span>
                <span className="font-medium text-foreground">7:00 – 23:00</span>
              </li>
              <li className="flex justify-between gap-4">
                <span>Sat – Sun</span>
                <span className="font-medium text-foreground">8:00 – 23:30</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} LamaHamar Cafe. All rights reserved.</span>
            <Link to="/login" className="hover:text-primary transition-colors">
              Staff login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SiteLayout;
