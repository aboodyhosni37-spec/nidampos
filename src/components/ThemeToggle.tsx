import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme, type ThemeMode } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";

const options: { value: ThemeMode; label: string; icon: any }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export const ThemeToggle = ({
  className,
  showLabels = false,
  compact = false,
}: {
  className?: string;
  showLabels?: boolean;
  compact?: boolean;
}) => {
  const { theme, resolved, setTheme } = useTheme();

  if (compact) return <DropdownMenu>
    <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className={cn("h-11 w-11 shrink-0 rounded-lg", className)} aria-label="Website appearance" title="Website appearance">{resolved === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}</Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="min-w-44">
      <DropdownMenuRadioGroup value={theme} onValueChange={v => { if (v === "light" || v === "dark" || v === "system") setTheme(v); }}>
        {options.map(o => <DropdownMenuRadioItem key={o.value} value={o.value} className="gap-2"><o.icon className="h-4 w-4" />{o.value === "system" ? "System Default" : `${o.label} Mode`}</DropdownMenuRadioItem>)}
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>;

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border border-border bg-muted/60 p-1",
        className
      )}
    >
      {options.map((o) => {
        const active = theme === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.label}
            title={`${o.label} theme`}
            onClick={() => setTheme(o.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 h-8 text-xs font-medium transition-colors",
              active
                ? "bg-background text-primary shadow-soft"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <o.icon className="h-4 w-4" />
            {showLabels && <span>{o.label}</span>}
          </button>
        );
      })}
    </div>
  );
};
