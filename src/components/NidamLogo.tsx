import { cn } from "@/lib/utils";

interface NidamLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  animated?: boolean;
  state?: "idle" | "active" | "loading" | "success" | "error";
  className?: string;
}

const sizeMap = {
  sm: "h-10 w-10 text-lg rounded-xl",
  md: "h-14 w-14 text-2xl rounded-2xl",
  lg: "h-20 w-20 text-3xl rounded-2xl",
  xl: "h-28 w-28 text-5xl rounded-3xl",
};

export const NidamLogo = ({ size = "md", className }: NidamLogoProps) => {
  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center font-bold text-white shadow-soft",
        "bg-gradient-to-br from-[hsl(var(--brand-emerald))] via-[hsl(var(--brand-emerald-bright))] to-[hsl(var(--brand-teal))]",
        sizeMap[size],
        className
      )}
    >
      <span className="relative z-10 tracking-tight">N</span>
    </div>
  );
};
