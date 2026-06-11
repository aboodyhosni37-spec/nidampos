import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  ShoppingCart,
  Package,
  Wallet,
  BarChart3,
  Users as UsersIcon,
  UserCog,
  Settings as SettingsIcon,
  LogOut,
  Menu,
} from "lucide-react";
import { NidamLogo } from "@/components/NidamLogo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { clearSession, getSession } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import type { Permission } from "@/lib/permissions";

const nav: { to: string; label: string; icon: any; perm?: Permission }[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/dashboard/orders", label: "Orders", icon: ClipboardList, perm: "access_orders" },
  { to: "/dashboard/pos", label: "POS", icon: ShoppingCart, perm: "access_pos" },
  { to: "/dashboard/customers", label: "Customers", icon: UsersIcon, perm: "access_customers" },
  { to: "/dashboard/inventory", label: "Inventory", icon: Package, perm: "access_inventory" },
  { to: "/dashboard/expenses", label: "Expenses", icon: Wallet, perm: "access_expenses" },
  { to: "/dashboard/staff", label: "Staff & Salaries", icon: UserCog, perm: "access_staff" },
  { to: "/dashboard/reports", label: "Reports", icon: BarChart3, perm: "view_reports" },
  { to: "/dashboard/settings", label: "Settings", icon: SettingsIcon, perm: "access_settings" },
];

export const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [exitConfirm, setExitConfirm] = useState(false);
  const user = getSession();

  const visibleNav = nav.filter((n) => !n.perm || user?.permissions?.[n.perm]);

  const logout = () => {
    clearSession();
    toast({ title: "Signed out", description: "See you soon!" });
    navigate("/login", { replace: true });
  };

  const isPosMode = location.pathname.startsWith("/dashboard/pos");
  const requestExitPos = () => setExitConfirm(true);
  const hasActiveCart = (): boolean => Boolean((window as any).__posHasCart);

  if (isPosMode) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="h-14 shrink-0 bg-card border-b border-border flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <NidamLogo size="sm" />
            <div className="font-semibold tracking-tight">
              NIDAM <span className="font-light text-muted-foreground">POS</span>
            </div>
            <span className="ml-2 text-[10px] uppercase tracking-wider font-bold bg-primary/15 text-primary px-2 py-0.5 rounded-full">
              POS Mode
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-right">
              <div className="text-sm font-semibold leading-tight">{user?.name || "Cashier"}</div>
              <div className="text-xs text-muted-foreground capitalize">{user?.role}</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={requestExitPos}
              className="rounded-lg"
            >
              Exit POS
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="rounded-lg text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="flex-1 min-h-0 p-3 lg:p-4 overflow-auto">
          <Outlet />
        </main>

        <AlertDialog open={exitConfirm} onOpenChange={setExitConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {hasActiveCart() ? "Unfinished order in cart" : "Exit POS?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {hasActiveCart()
                  ? "You have an unfinished order in the cart. Exiting now will discard it. Continue?"
                  : "Are you sure you want to exit POS?"}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Stay in POS</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setExitConfirm(false);
                  navigate("/dashboard");
                }}
              >
                {hasActiveCart() ? "Discard & Exit" : "Exit POS"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-secondary/40">
      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-card border-r border-border sticky top-0 h-screen">
        <SidebarContent items={visibleNav} onNavigate={() => {}} onLogout={logout} userName={user?.name || "Guest"} role={user?.role || "guest"} />
      </aside>

      {/* Sidebar - mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-card border-r border-border animate-fade-in flex flex-col">
            <SidebarContent
              items={visibleNav}
              onNavigate={() => setMobileOpen(false)}
              onLogout={logout}
              userName={user?.name || "Guest"}
              role={user?.role || "guest"}
            />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-16 bg-card/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="font-semibold text-lg tracking-tight">
              NIDAM <span className="font-light text-muted-foreground">POS</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="text-sm font-semibold leading-tight">{user?.name || "Cashier"}</div>
              <div className="text-xs text-muted-foreground">{user?.method === "pos" ? "POS Terminal" : "Web"}</div>
            </div>
            <div className="h-10 w-10 rounded-full bg-gradient-button text-white flex items-center justify-center font-bold shadow-soft">
              {(user?.name || "U").charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 animate-fade-in">
          <Outlet />
        </main>

        <footer className="py-4 text-center text-xs text-muted-foreground border-t border-border bg-card">
          Powered by <span className="font-semibold text-primary">Blue Flag</span>
        </footer>
      </div>
    </div>
  );
};

const SidebarContent = ({
  items,
  onNavigate,
  onLogout,
  userName,
  role,
}: {
  items: { to: string; label: string; icon: any }[];
  onNavigate: () => void;
  onLogout: () => void;
  userName: string;
  role: string;
}) => (
  <>
    <div className="h-16 flex items-center gap-3 px-6 border-b border-border">
      <NidamLogo size="sm" />
      <div>
        <div className="font-bold tracking-tight text-sm">NIDAM POS</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Restaurant Suite</div>
      </div>
    </div>

    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/dashboard"}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
              isActive
                ? "bg-gradient-button text-white shadow-soft"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )
          }
        >
          <item.icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
          {item.label}
        </NavLink>
      ))}
    </nav>

    <div className="p-3 border-t border-border space-y-2">
      <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-secondary/60">
        <div className="h-9 w-9 rounded-full bg-gradient-button text-white flex items-center justify-center font-bold text-sm">
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{userName}</div>
          <div className="text-xs text-muted-foreground capitalize">{role}</div>
        </div>
      </div>
      <Button
        variant="ghost"
        onClick={onLogout}
        className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
    </div>
  </>
);
