import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Delete } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { setSession } from "@/lib/auth";
import { findUserByPin } from "@/lib/users";
import { listRoles } from "@/lib/permissions";

const NUMPAD = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
const PIN_LEN = 4;

export const PosLoginForm = () => {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [welcome, setWelcome] = useState<string | null>(null);

  const handlePress = (digit: string) => {
    setError(null);
    if (pin.length < PIN_LEN) setPin((p) => p + digit);
  };
  const handleBackspace = () => {
    setError(null);
    setPin((p) => p.slice(0, -1));
  };
  const handleClear = () => {
    setError(null);
    setPin("");
  };

  const tryLogin = async (pinValue: string) => {
    setVerifying(true);
    setError(null);
    try {
      const user = await findUserByPin(pinValue);
      if (!user) {
        setError("Invalid PIN");
        setPin("");
        return;
      }
      const roles = await listRoles();
      const role = roles.find((r) => r.role === user.role);
      setSession({
        id: user.id,
        name: user.name,
        method: "pos",
        identifier: user.username || user.name,
        role: user.role,
        permissions: role?.permissions ?? {},
      });
      setWelcome(user.name);
      toast({ title: `Welcome, ${user.name}!` });
      setTimeout(() => {
        navigate(role?.permissions?.access_pos ? "/dashboard/pos" : "/dashboard", { replace: true });
      }, 350);
    } catch (e: any) {
      setError(e.message || "Login failed");
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (pin.length === PIN_LEN) tryLogin(pin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  return (
    <div className="space-y-5">
      <div
        className={cn(
          "rounded-2xl border p-5 bg-secondary/40 transition-colors",
          error ? "border-destructive/50" : welcome ? "border-primary/60" : "border-border"
        )}
      >
        <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          <Lock className="h-3.5 w-3.5" /> Enter your 4-digit PIN
        </div>
        <div className="flex items-center justify-center gap-3 h-12">
          {Array.from({ length: PIN_LEN }).map((_, i) => {
            const filled = pin.length > i;
            return (
              <div
                key={i}
                className={cn(
                  "h-4 w-4 rounded-full border-2 transition-colors",
                  filled ? "bg-primary border-primary" : "border-muted-foreground/25"
                )}
              />
            );
          })}
        </div>
      </div>

      {error && (
        <div className="text-center text-sm font-semibold text-destructive">{error}</div>
      )}
      {welcome && (
        <div className="text-center text-sm font-semibold text-primary">Welcome, {welcome} ✓</div>
      )}

      <div className="grid grid-cols-3 gap-2.5">
        {NUMPAD.map((n) => (
          <NumpadButton key={n} onClick={() => handlePress(n)} disabled={verifying}>
            {n}
          </NumpadButton>
        ))}
        <NumpadButton variant="muted" onClick={handleClear} disabled={verifying}>
          <span className="text-xs font-bold">Clear</span>
        </NumpadButton>
        <NumpadButton onClick={() => handlePress("0")} disabled={verifying}>
          0
        </NumpadButton>
        <NumpadButton variant="muted" onClick={handleBackspace} disabled={verifying}>
          <Delete className="h-5 w-5" />
        </NumpadButton>
      </div>

      <Button
        onClick={() => tryLogin(pin)}
        disabled={pin.length !== PIN_LEN || verifying}
        className="w-full h-14 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-base disabled:opacity-40"
      >
        {verifying ? "Verifying…" : "Sign In"}
      </Button>
    </div>
  );
};

const NumpadButton = ({
  children,
  onClick,
  variant = "default",
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "muted";
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "h-14 sm:h-16 rounded-2xl text-2xl font-bold flex items-center justify-center select-none transition-colors active:scale-[0.97]",
      "disabled:opacity-40 disabled:cursor-not-allowed",
      variant === "default"
        ? "bg-card border border-border text-foreground hover:border-primary/50 hover:text-primary"
        : "bg-secondary/70 text-muted-foreground hover:bg-secondary hover:text-foreground"
    )}
  >
    {children}
  </button>
);
