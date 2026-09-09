import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { getSession, subscribeSession, validateSession } from "@/lib/auth";

type State = "checking" | "allowed" | "denied";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [state, setState] = useState<State>(() => (getSession() ? "checking" : "denied"));

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (!getSession()) {
        if (!cancelled) setState("denied");
        return;
      }
      const valid = await validateSession();
      if (cancelled) return;
      setState(valid ? "allowed" : "denied");
    };

    check();
    const unsubscribe = subscribeSession(() => {
      if (!getSession()) setState("denied");
      else check();
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [location.pathname]);

  if (state === "denied") return <Navigate to="/login" replace />;

  if (state === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
};
