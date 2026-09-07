import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Coffee, MapPin, ShieldCheck } from "lucide-react";
import { PosLoginForm } from "@/components/PosLoginForm";
import { getSession } from "@/lib/auth";
import { useSiteContent } from "@/lib/siteContent";
import { useForcedLightTheme } from "@/lib/theme";

const Index = () => {
  useForcedLightTheme();
  const navigate = useNavigate();
  const content = useSiteContent();

  useEffect(() => {
    if (getSession()) navigate("/dashboard", { replace: true });
  }, [navigate]);

  const brandName = content.brand.name;

  return (
    <main className="min-h-screen bg-background">
      <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr]">
        {/* LEFT — brand panel */}
        <section className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-primary text-primary-foreground p-12 xl:p-16">
          <div className="pointer-events-none absolute inset-0 opacity-20">
            <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-background/40 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-background/20 blur-3xl" />
          </div>

          <div className="relative z-10 flex items-center gap-3">
            {content.brand.logo_url ? (
              <img
                src={content.brand.logo_url}
                alt={`${brandName} logo`}
                className="h-12 w-12 rounded-2xl object-cover"
              />
            ) : (
              <span className="h-12 w-12 rounded-2xl bg-background/15 border border-background/25 flex items-center justify-center">
                <Coffee className="h-6 w-6" />
              </span>
            )}
            <span className="leading-tight">
              <span className="block text-xl font-extrabold tracking-tight">{brandName}</span>
              <span className="block text-[11px] uppercase tracking-[0.28em] text-primary-foreground/70 font-semibold">
                Staff Portal
              </span>
            </span>
          </div>

          <div className="relative z-10 space-y-6 max-w-lg">
            <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-[1.08]">
              Welcome back to the counter.
            </h1>
            <p className="text-primary-foreground/80 text-lg leading-relaxed">
              Sign in with your personal PIN to open the till, manage orders, stock and
              daily reports.
            </p>
            <ul className="space-y-3 text-sm text-primary-foreground/85">
              <li className="flex items-center gap-3">
                <span className="h-9 w-9 rounded-xl bg-background/15 flex items-center justify-center">
                  <MapPin className="h-4 w-4" />
                </span>
                {content.contact.address}
              </li>
              <li className="flex items-center gap-3">
                <span className="h-9 w-9 rounded-xl bg-background/15 flex items-center justify-center">
                  <Clock className="h-4 w-4" />
                </span>
                {content.contact.hours_label} · {content.contact.hours_value}
              </li>
            </ul>
          </div>

          <div className="relative z-10 text-xs text-primary-foreground/70">
            © {new Date().getFullYear()} {brandName}
          </div>
        </section>

        {/* RIGHT — login */}
        <section className="flex flex-col justify-center px-5 py-10 sm:px-10 lg:px-14">
          <div className="w-full max-w-sm mx-auto">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to website
            </Link>

            <div className="mt-8 flex flex-col items-center lg:items-start gap-3">
              <span className="lg:hidden h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-soft">
                {content.brand.logo_url ? (
                  <img
                    src={content.brand.logo_url}
                    alt={`${brandName} logo`}
                    className="h-14 w-14 rounded-2xl object-cover"
                  />
                ) : (
                  <Coffee className="h-7 w-7" />
                )}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                <ShieldCheck className="h-3 w-3" /> Secure staff login
              </span>
              <div className="text-center lg:text-left">
                <h2 className="text-3xl font-extrabold tracking-tight">Staff sign in</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Enter your 4-digit PIN to open your dashboard.
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-soft">
              <PosLoginForm />
            </div>

            <p className="mt-6 text-center text-[11px] text-muted-foreground">
              Authorised staff only · PINs are personal and must not be shared.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Index;
