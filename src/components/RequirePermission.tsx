import { Navigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import type { Permission } from "@/lib/permissions";

export const RequirePermission = ({
  permission,
  children,
  redirect,
}: {
  permission: Permission;
  children: React.ReactNode;
  redirect?: string;
}) => {
  const session = getSession();
  if (!session) return <Navigate to="/login" replace />;
  if (session.permissions?.[permission]) return <>{children}</>;
  if (redirect) return <Navigate to={redirect} replace />;
  return (
    <div className="max-w-lg mx-auto pt-16">
      <Card className="p-8 rounded-2xl border-border text-center space-y-3">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold">Access restricted</h2>
        <p className="text-sm text-muted-foreground">
          Your role <span className="font-mono font-semibold">{session.role}</span> doesn't have
          permission to view this page. Ask an administrator to enable it.
        </p>
      </Card>
    </div>
  );
};
