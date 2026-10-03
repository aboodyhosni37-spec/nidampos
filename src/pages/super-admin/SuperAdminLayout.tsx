import { useEffect, useState } from "react";
import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Building2, LayoutDashboard, Loader2, LogOut, ShieldAlert, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { isSuperAdmin } from "@/lib/superAdmin";

type State = "checking" | "signed-out" | "denied" | "ok";

export default function SuperAdminLayout() {
  const nav = useNavigate();
  const [state, setState] = useState<State>("checking");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return setState("signed-out");
      setEmail(data.user.email ?? "");
      setState((await isSuperAdmin()) ? "ok" : "denied");
    };
    const { data: sub } = supabase.auth.onAuthStateChange(() => setTimeout(check, 0));
    check();
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    nav("/super-admin/login", { replace: true });
  };

  if (state === "checking")
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  if (state === "signed-out") return <Navigate to="/super-admin/login" replace />;
  if (state === "denied")
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center space-y-3">
          <ShieldAlert className="h-8 w-8 mx-auto" />
          <h2 className="text-lg font-bold">Access restricted</h2>
          <p className="text-sm text-muted-foreground">This account is not a Super Admin.</p>
          <Button variant="outline" onClick={signOut}>Sign out</Button>
        </Card>
      </div>
    );

  const links = [
    { to: "/super-admin", label: "Overview", icon: LayoutDashboard, end: true },
    { to: "/super-admin/restaurants", label: "Restaurants", icon: Building2 },
  ];

  return (
    <div className="min-h-screen flex bg-secondary/40">
      <aside className="w-60 shrink-0 border-r bg-background flex flex-col">
        <div className="p-5 border-b">
          <div className="font-bold">Hagaajiye Tech</div>
          <div className="text-xs text-muted-foreground">Super Admin</div>
        </div>
        <nav className="p-3 space-y-1 flex-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                  isActive ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                )
              }
            >
              <l.icon className="h-4 w-4" /> {l.label}
            </NavLink>
          ))}
          <NavLink to="/login" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-secondary">
            <Store className="h-4 w-4" /> Open POS
          </NavLink>
        </nav>
        <div className="p-3 border-t space-y-2">
          <div className="text-xs text-muted-foreground truncate">{email}</div>
          <Button variant="outline" size="sm" className="w-full" onClick={signOut}>
            <LogOut className="h-3.5 w-3.5 mr-1" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-6 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
