import { ClipboardList, Package, BarChart3, ChefHat } from "lucide-react";
import { NidamLogo } from "./NidamLogo";

const features = [
  { icon: ClipboardList, title: "Order Management", desc: "Streamlined order flow" },
  { icon: Package, title: "Inventory", desc: "Real-time stock tracking" },
  { icon: BarChart3, title: "Sales Reports", desc: "Insights at a glance" },
  { icon: ChefHat, title: "Kitchen Display", desc: "Sync with the kitchen" },
];

export const BrandingPanel = () => {
  return (
    <div className="relative hidden lg:flex lg:w-1/2 overflow-hidden bg-gradient-brand bg-[length:200%_200%] animate-gradient-shift">
      {/* Decorative glows */}
      <div className="absolute inset-0 bg-gradient-glow" />
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 text-white w-full">
        {/* Logo + Title */}
        <div className="space-y-8 animate-fade-in">
          <NidamLogo size="xl" animated />
          <div>
            <h1 className="text-5xl xl:text-6xl font-bold tracking-tight">
              NIDAM <span className="font-light">POS</span>
            </h1>
            <p className="mt-3 text-lg text-white/80 max-w-md">
              The premium restaurant management system built for speed, simplicity and scale.
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-4 my-12">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-5 hover:bg-white/15 hover:scale-[1.03] transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${150 + i * 100}ms`, animationFillMode: "backwards" }}
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 group-hover:bg-white/30 transition-colors">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-base">{f.title}</h3>
              <p className="text-sm text-white/70 mt-1">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-sm text-white/70">
          © {new Date().getFullYear()} NIDAM POS. Crafted for restaurants worldwide.
        </div>
      </div>
    </div>
  );
};
