import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  TrendingUp,
  Package,
  QrCode,
  BarChart3,
  Sparkles,
  Building2,
  Mail,
  MapPin,
  Store,
  ArrowRight,
} from "lucide-react";
import { NidamLogo } from "@/components/NidamLogo";
import { PosLoginForm } from "@/components/PosLoginForm";
import { getSession } from "@/lib/auth";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (getSession()) navigate("/dashboard", { replace: true });
  }, [navigate]);

  return (
    <main className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#020617] via-[#0a1428] to-[#0f172a]">
      {/* Animated background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-emerald-500/20 blur-[120px] animate-pulse" />
        <div
          className="absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-sky-500/15 blur-[120px] animate-pulse"
          style={{ animationDelay: "1.5s" }}
        />
        <div
          className="absolute -bottom-40 left-1/3 h-[500px] w-[500px] rounded-full bg-teal-500/15 blur-[120px] animate-pulse"
          style={{ animationDelay: "2.5s" }}
        />
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-7xl animate-fade-in">
          <div className="grid lg:grid-cols-[1.3fr_1fr] rounded-[2rem] overflow-hidden border border-white/10 bg-card/40 backdrop-blur-2xl shadow-elegant">
            {/* LEFT — Premium Hero */}
            <div className="relative hidden lg:flex flex-col justify-between p-10 xl:p-14 text-white">
              {/* Inner gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-sky-500/10" />

              <div className="relative z-10 space-y-8">
                {/* Brand bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <NidamLogo size="md" />
                    <div>
                      <div className="text-xs uppercase tracking-[0.25em] text-emerald-300/80 font-semibold">
                        Blue Flag
                      </div>
                      <div className="text-xl font-bold tracking-tight">NIDAM POS</div>
                    </div>
                  </div>
                  <span className="hidden xl:inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
                    <Sparkles className="h-3 w-3" /> v2.0 · Cloud
                  </span>
                </div>

                {/* Hero */}
                <div className="space-y-5">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/80">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Smart Cloud POS Platform
                  </span>
                  <h1 className="text-4xl xl:text-6xl font-bold tracking-tight leading-[1.05]">
                    NIDAM{" "}
                    <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
                      POS
                    </span>
                  </h1>
                  <p className="text-lg text-white/80 max-w-md leading-relaxed">
                    Smart cloud-based POS &amp; business management system.
                  </p>
                  <p className="text-sm text-white/55 max-w-lg leading-relaxed">
                    Manage restaurants, cafes, supermarkets, pharmacies, and retail businesses
                    with one powerful platform.
                  </p>
                </div>

                {/* POS mockup illustration */}
                <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-5 backdrop-blur-md shadow-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
                        <Store className="h-4 w-4 text-emerald-300" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold">Live Dashboard</div>
                        <div className="text-[10px] text-white/50">Today · Realtime</div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-red-400/60" />
                      <span className="h-2 w-2 rounded-full bg-yellow-400/60" />
                      <span className="h-2 w-2 rounded-full bg-emerald-400/60" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <MiniStat label="Sales" value="$12.4K" trend="+18%" />
                    <MiniStat label="Orders" value="384" trend="+9%" />
                    <MiniStat label="Customers" value="216" trend="+12%" />
                  </div>
                  {/* Bar chart mockup */}
                  <div className="mt-4 flex items-end gap-1.5 h-16">
                    {[40, 65, 50, 80, 55, 90, 70, 95, 60, 85, 75, 100].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-sm bg-gradient-to-t from-emerald-500/40 to-emerald-300/80"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>

                {/* Feature cards */}
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                  <FeatureCard icon={TrendingUp} title="Sales Management" />
                  <FeatureCard icon={Package} title="Inventory Tracking" />
                  <FeatureCard icon={Building2} title="Multi Branch" />
                  <FeatureCard icon={QrCode} title="QR Menu" />
                  <FeatureCard icon={BarChart3} title="Reports & Analytics" />
                  <FeatureCard icon={Sparkles} title="AI Insights" />
                </div>
              </div>

              {/* Footer */}
              <div className="relative z-10 mt-10 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-white/55">
                <div className="font-semibold text-white/80">Blue Flag Technology</div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" /> Mogadishu, Somalia
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3 w-3" /> info@blueflag.so
                </div>
              </div>
            </div>

            {/* RIGHT — Login (unchanged functionality) */}
            <div className="relative p-6 sm:p-10 xl:p-12 flex flex-col justify-center min-h-[600px] bg-card/60 backdrop-blur-xl border-l border-white/5">
              <div className="flex flex-col items-center mb-6 lg:hidden">
                <NidamLogo size="md" />
                <h2 className="mt-3 text-2xl font-bold">NIDAM POS</h2>
                <p className="text-xs text-muted-foreground">by Blue Flag</p>
              </div>

              <div className="hidden lg:block mb-8">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-2.5 py-1 text-[10px] font-semibold text-emerald-300 uppercase tracking-wider mb-3">
                  <ShieldCheck className="h-3 w-3" /> Secure Login
                </div>
                <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
                <p className="text-muted-foreground mt-1.5 text-sm">
                  Enter your 4-digit PIN to access your dashboard.
                </p>
              </div>

              <PosLoginForm />

              <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
                Protected by enterprise-grade encryption
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-white/50 mt-5">
            © {new Date().getFullYear()} <span className="font-semibold text-emerald-300">Blue Flag Technology</span> · NIDAM POS
          </p>
        </div>
      </div>
    </main>
  );
};

const MiniStat = ({ label, value, trend }: { label: string; value: string; trend: string }) => (
  <div className="rounded-xl bg-white/5 border border-white/10 p-3">
    <div className="text-[10px] uppercase tracking-wider text-white/50">{label}</div>
    <div className="text-base font-bold mt-0.5">{value}</div>
    <div className="text-[10px] font-semibold text-emerald-300 inline-flex items-center gap-0.5">
      <ArrowRight className="h-2.5 w-2.5 -rotate-45" /> {trend}
    </div>
  </div>
);

const FeatureCard = ({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) => (
  <div className="group rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-emerald-400/30 p-3 transition-all duration-300 hover:-translate-y-0.5">
    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-400/20 flex items-center justify-center text-emerald-300 group-hover:scale-110 transition-transform">
      <Icon className="h-4 w-4" />
    </div>
    <div className="mt-2 text-xs font-semibold text-white/90">{title}</div>
  </div>
);

export default Index;
