import { Navigate } from "react-router-dom";
import { getSession } from "@/lib/auth";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const user = getSession();
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
};
