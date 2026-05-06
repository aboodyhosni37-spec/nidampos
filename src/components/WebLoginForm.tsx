import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { setSession } from "@/lib/auth";
import { findUserByUsernamePin } from "@/lib/users";
import { listRoles } from "@/lib/permissions";

export const WebLoginForm = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({ title: "Missing fields", description: "Enter your username and PIN." });
      return;
    }
    setLoading(true);
    try {
      const user = await findUserByUsernamePin(username.trim(), password.trim());
      if (!user) {
        toast({ title: "Invalid credentials", description: "Username or PIN is wrong.", variant: "destructive" });
        return;
      }
      const roles = await listRoles();
      const role = roles.find((r) => r.role === user.role);
      setSession({
        id: user.id,
        name: user.name,
        method: "web",
        identifier: user.username || user.name,
        role: user.role,
        permissions: role?.permissions ?? {},
      });
      toast({ title: "Welcome back!", description: `Signed in as ${user.name}` });
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
      <div className="space-y-2">
        <Label htmlFor="username" className="text-sm font-medium">Username</Label>
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            id="username"
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="h-14 pl-12 rounded-xl border-border bg-secondary/40 focus-visible:bg-background transition-colors"
            autoComplete="username"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium">PIN</Label>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="4–6 digit PIN"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-14 pl-12 pr-12 rounded-xl border-border bg-secondary/40 focus-visible:bg-background transition-colors"
            inputMode="numeric"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="group w-full h-14 rounded-xl bg-gradient-button text-white font-semibold text-base shadow-soft hover:shadow-elegant hover:-translate-y-0.5 transition-all duration-300"
      >
        {loading ? "Signing in..." : (
          <>
            Sign In
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </Button>
    </form>
  );
};
