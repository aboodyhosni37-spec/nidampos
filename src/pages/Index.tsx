import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChefHat, ShieldCheck, TrendingUp } from "lucide-react";
import { NidamLogo } from "@/components/NidamLogo";
import { PosLoginForm } from "@/components/PosLoginForm";
import { getSession } from "@/lib/auth";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (getSession()) navigate("/dashboard", { replace: true });
  }, [navigate]);

  return (
    <main className="min-h-screen relative flex items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-[#0f172a] to-[#020617]">
      <div className="w-full max-w-5xl animate-fade-in">
        <div className="grid lg:grid-cols-2 rounded-3xl overflow-hidden border border-white/10 bg-card/60 backdrop-blur-2xl shadow-elegant">
          {/* LEFT — Branding */}
          <div className="relative hidden lg:flex flex-col justify-between p-10 xl:p-12 text-white bg-gradient-to-br from-[#0f172a] via-[#0b1224] to-[#020617]">
            <div className="flex flex-col items-center text-center">
              <NidamLogo size="xl" />
              <h1 className="mt-6 text-4xl xl:text-5xl font-bold tracking-tight">
                NIDAM <span className="font-light text-emerald-300">POS</span>
              </h1>
              <p className="mt-2 text-sm uppercase tracking-[0.25em] text-emerald-300/80 font-semibold">
                Smart POS System
              </p>
            </div>

            <div className="text-center my-8">
              <h2 className="text-2xl xl:text-3xl font-bold">Welcome Back</h2>
              <p className="mt-1 text-sm text-white/70">Secure POS Login</p>
            </div>

            <div className="space-y-3">
              <Feature icon={<ShieldCheck className="h-4 w-4" />} text="Secure PIN authentication" />
              <Feature icon={<ChefHat className="h-4 w-4" />} text="Kitchen tickets & smart printing" />
              <Feature icon={<TrendingUp className="h-4 w-4" />} text="Loyalty rewards & live insights" />
            </div>

            <div className="text-xs text-white/50 mt-6 text-center">
              © {new Date().getFullYear()} NIDAM POS · Powered by Blue Flag
            </div>
          </div>

          {/* RIGHT — Form */}
          <div className="p-6 sm:p-10 xl:p-12 flex flex-col justify-center min-h-[560px]">
            <div className="flex flex-col items-center mb-6 lg:hidden">
              <NidamLogo size="md" />
              <h2 className="mt-3 text-2xl font-bold">NIDAM POS</h2>
            </div>

            <div className="hidden lg:block mb-6">
              <h2 className="text-3xl font-bold tracking-tight">Enter your PIN</h2>
              <p className="text-muted-foreground mt-1.5 text-sm">
                Type your 4-digit PIN to sign in.
              </p>
            </div>

            <PosLoginForm />
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-5">
          Powered by <span className="font-semibold text-primary">Blue Flag</span>
        </p>
      </div>
    </main>
  );
};

const Feature = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <div className="flex items-center gap-3 text-sm text-white/90">
    <span className="h-8 w-8 rounded-xl bg-emerald-500/15 border border-emerald-400/20 flex items-center justify-center text-emerald-300">
      {icon}
    </span>
    {text}
  </div>
);

export default Index;
