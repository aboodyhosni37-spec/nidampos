import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Brain,
  Building2,
  Calculator,
  Check,
  ChevronDown,
  Mail,
  MapPin,
  Menu,
  Package,
  PlayCircle,
  QrCode,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Truck,
  TrendingUp,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NidamLogo } from "@/components/NidamLogo";
import { getSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Home", href: "#home" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Contact", href: "#contact" },
];

const stats = [
  { label: "Businesses", value: 1200, suffix: "+" },
  { label: "Transactions", value: 5000000, suffix: "+", format: "compact" },
  { label: "Active Users", value: 8400, suffix: "+" },
  { label: "Branches", value: 320, suffix: "+" },
];

const features = [
  { icon: Store, title: "POS Sales", desc: "Lightning-fast checkout for any business type." },
  { icon: Package, title: "Inventory", desc: "Real-time stock tracking across all branches." },
  { icon: BarChart3, title: "Reports", desc: "Deep insights and exportable analytics." },
  { icon: QrCode, title: "QR Menu", desc: "Contactless ordering and digital menus." },
  { icon: Building2, title: "Multi Branch", desc: "Run unlimited locations from one cloud." },
  { icon: Brain, title: "AI Analytics", desc: "Smart forecasts and customer insights." },
  { icon: Truck, title: "Delivery Integration", desc: "Connect to delivery partners seamlessly." },
  { icon: Calculator, title: "Accounting", desc: "Built-in finance & tax management." },
];

const pricing = [
  {
    name: "Starter",
    price: "$19",
    period: "/mo",
    desc: "Perfect for small shops and cafes.",
    features: ["1 Branch", "POS Sales", "Basic Inventory", "Email Support"],
    highlight: false,
  },
  {
    name: "Business",
    price: "$49",
    period: "/mo",
    desc: "Most popular for growing teams.",
    features: ["3 Branches", "Advanced Reports", "QR Menu", "AI Insights", "Priority Support"],
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "Tailored for large operations.",
    features: ["Unlimited Branches", "Custom Integrations", "Dedicated Manager", "24/7 Support"],
    highlight: false,
  },
];

const testimonials = [
  {
    name: "Amina Yusuf",
    role: "Owner, Hilal Cafe",
    quote: "NIDAM POS transformed our daily operations. Checkout is 3x faster.",
  },
  {
    name: "Mohamed Ali",
    role: "Manager, City Mart",
    quote: "Multi-branch reports save us hours every week. Worth every dollar.",
  },
  {
    name: "Fadumo Hassan",
    role: "CEO, Bright Pharmacy",
    quote: "Inventory tracking is flawless. Best POS we've used in Somalia.",
  },
];

const faqs = [
  {
    q: "Is there a free trial?",
    a: "Yes, you can try NIDAM POS free for 14 days with full features.",
  },
  {
    q: "Does it work offline?",
    a: "Yes, the POS continues to operate offline and syncs once you reconnect.",
  },
  {
    q: "Can I manage multiple branches?",
    a: "Absolutely. Business and Enterprise plans support multi-branch operations.",
  },
  {
    q: "What kind of support do you provide?",
    a: "Email, chat, and priority phone support depending on your plan.",
  },
];

const formatValue = (n: number, format?: string) => {
  if (format === "compact") {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  }
  return n.toLocaleString();
};

const useCountUp = (target: number, duration = 1600) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setVal(Math.floor(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
};

const StatCard = ({ s }: { s: (typeof stats)[number] }) => {
  const v = useCountUp(s.value);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 text-center hover:border-emerald-400/40 hover:bg-white/[0.08] transition-all">
      <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">
        {formatValue(v, s.format)}
        {s.suffix}
      </div>
      <div className="text-xs uppercase tracking-widest text-white/60 mt-2">{s.label}</div>
    </div>
  );
};

const Landing = () => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (getSession()) navigate("/dashboard", { replace: true });
  }, [navigate]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goLogin = () => navigate("/login");

  const handleAnchor = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#0a1428] to-[#0f172a] text-white overflow-x-hidden">
      {/* Background glows */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-emerald-500/20 blur-[120px]" />
        <div className="absolute top-1/2 -right-40 h-[500px] w-[500px] rounded-full bg-sky-500/15 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[500px] w-[500px] rounded-full bg-teal-500/10 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {/* NAVBAR */}
      <header
        className={cn(
          "fixed top-0 inset-x-0 z-50 transition-all duration-300",
          scrolled
            ? "bg-[#0a1428]/80 backdrop-blur-xl border-b border-white/10"
            : "bg-transparent"
        )}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="#home" onClick={(e) => handleAnchor(e, "#home")} className="flex items-center gap-2.5">
            <NidamLogo size="sm" />
            <div className="leading-tight">
              <div className="text-sm font-bold">NIDAM POS</div>
              <div className="text-[10px] uppercase tracking-widest text-emerald-300/80">Blue Flag</div>
            </div>
          </a>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={(e) => handleAnchor(e, l.href)}
                className="px-3 py-2 text-sm text-white/70 hover:text-white transition-colors rounded-md hover:bg-white/5"
              >
                {l.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/5" onClick={goLogin}>
              Login
            </Button>
            <Button
              onClick={goLogin}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/20"
            >
              Start Free Trial
            </Button>
          </div>

          <button
            className="md:hidden p-2 rounded-md hover:bg-white/5"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {mobileOpen && (
          <div className="md:hidden border-t border-white/10 bg-[#0a1428]/95 backdrop-blur-xl">
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={(e) => handleAnchor(e, l.href)}
                  className="block px-3 py-2.5 text-sm text-white/80 hover:bg-white/5 rounded-md"
                >
                  {l.label}
                </a>
              ))}
              <div className="pt-3 grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={goLogin} className="border-white/15 bg-white/5 hover:bg-white/10">
                  Login
                </Button>
                <Button
                  onClick={goLogin}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                >
                  Free Trial
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <section id="home" className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
            <Sparkles className="h-3 w-3" /> Smart Cloud POS Platform · v2.0
          </span>
          <h1 className="mt-6 text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
            <span className="bg-gradient-to-r from-white via-white to-emerald-200 bg-clip-text text-transparent">
              NIDAM
            </span>{" "}
            <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
              POS
            </span>
          </h1>
          <p className="mt-5 text-lg md:text-xl text-white/80 max-w-2xl mx-auto">
            Smart cloud-based POS &amp; business management system.
          </p>
          <p className="mt-3 text-sm md:text-base text-white/55 max-w-3xl mx-auto">
            Manage restaurants, cafes, supermarkets, pharmacies, and retail businesses using one powerful platform.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={goLogin}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-xl shadow-emerald-500/25 h-12 px-7"
            >
              Start Free Trial <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={goLogin}
              className="border-white/15 bg-white/5 hover:bg-white/10 text-white h-12 px-7"
            >
              Login
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => document.getElementById("preview")?.scrollIntoView({ behavior: "smooth" })}
              className="text-white/80 hover:text-white hover:bg-white/5 h-12 px-7"
            >
              <PlayCircle className="h-5 w-5" /> Watch Demo
            </Button>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-white/55">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> No credit card required · 14-day free trial
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <StatCard key={s.label} s={s} />
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs uppercase tracking-widest text-emerald-300/80 font-semibold">Features</span>
            <h2 className="mt-3 text-3xl md:text-5xl font-bold">Everything you need to run your business</h2>
            <p className="mt-4 text-white/65">
              One platform with modern tools built for restaurants, retail and beyond.
            </p>
          </div>

          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-emerald-400/30 p-5 transition-all hover:-translate-y-1"
              >
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500/25 to-teal-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300 group-hover:scale-110 transition-transform">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-white/60">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DASHBOARD PREVIEW */}
      <section id="preview" className="px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs uppercase tracking-widest text-emerald-300/80 font-semibold">Preview</span>
            <h2 className="mt-3 text-3xl md:text-5xl font-bold">A dashboard you'll actually enjoy</h2>
          </div>

          <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-6 md:p-8 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
                  <Store className="h-4 w-4 text-emerald-300" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Live Dashboard</div>
                  <div className="text-[11px] text-white/50">Today · Realtime</div>
                </div>
              </div>
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/60" />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { l: "Sales", v: "$12,480", t: "+18%" },
                { l: "Orders", v: "384", t: "+9%" },
                { l: "Customers", v: "216", t: "+12%" },
                { l: "Avg. Ticket", v: "$32.50", t: "+4%" },
              ].map((s) => (
                <div key={s.l} className="rounded-xl bg-white/5 border border-white/10 p-4">
                  <div className="text-[10px] uppercase tracking-wider text-white/50">{s.l}</div>
                  <div className="text-xl font-bold mt-1">{s.v}</div>
                  <div className="text-[11px] font-semibold text-emerald-300 inline-flex items-center gap-1 mt-0.5">
                    <TrendingUp className="h-3 w-3" /> {s.t}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-end gap-2 h-32 md:h-44 rounded-xl bg-white/[0.03] border border-white/10 p-4">
              {[40, 65, 50, 80, 55, 90, 70, 95, 60, 85, 75, 100, 78, 88, 92, 70].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-md bg-gradient-to-t from-emerald-500/40 to-emerald-300/80"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs uppercase tracking-widest text-emerald-300/80 font-semibold">Pricing</span>
            <h2 className="mt-3 text-3xl md:text-5xl font-bold">Simple, transparent pricing</h2>
            <p className="mt-4 text-white/65">Start free. Upgrade when you grow.</p>
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-5">
            {pricing.map((p) => (
              <div
                key={p.name}
                className={cn(
                  "relative rounded-2xl border p-7 transition-all",
                  p.highlight
                    ? "border-emerald-400/50 bg-gradient-to-b from-emerald-500/10 to-transparent shadow-2xl shadow-emerald-500/10 scale-[1.02]"
                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                )}
              >
                {p.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                    Most Popular
                  </span>
                )}
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <p className="text-sm text-white/60 mt-1">{p.desc}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{p.price}</span>
                  <span className="text-white/60 text-sm">{p.period}</span>
                </div>
                <ul className="mt-6 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-white/80">
                      <Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={goLogin}
                  className={cn(
                    "mt-7 w-full h-11",
                    p.highlight
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white"
                      : "bg-white/10 hover:bg-white/15 text-white"
                  )}
                >
                  Get Started
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs uppercase tracking-widest text-emerald-300/80 font-semibold">Testimonials</span>
            <h2 className="mt-3 text-3xl md:text-5xl font-bold">Loved by businesses</h2>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-5">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 hover:bg-white/[0.06] transition-all"
              >
                <div className="flex gap-0.5 text-emerald-300">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="mt-4 text-white/85 leading-relaxed">"{t.quote}"</p>
                <div className="mt-5 pt-5 border-t border-white/10">
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-white/55">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs uppercase tracking-widest text-emerald-300/80 font-semibold">FAQ</span>
            <h2 className="mt-3 text-3xl md:text-5xl font-bold">Frequently asked questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((f, i) => {
              const open = openFaq === i;
              return (
                <div
                  key={f.q}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.04]"
                  >
                    <span className="font-medium">{f.q}</span>
                    <ChevronDown
                      className={cn("h-4 w-4 text-white/60 transition-transform", open && "rotate-180")}
                    />
                  </button>
                  {open && <div className="px-5 pb-5 text-sm text-white/65">{f.a}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-5xl mx-auto rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-sky-500/10 p-10 md:p-14 text-center backdrop-blur-xl">
          <h2 className="text-3xl md:text-4xl font-bold">Ready to grow your business?</h2>
          <p className="mt-3 text-white/70">Start your free trial today. No credit card required.</p>
          <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
            <Button
              size="lg"
              onClick={goLogin}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white h-12 px-8"
            >
              Start Free Trial <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={goLogin}
              className="border-white/15 bg-white/5 hover:bg-white/10 text-white h-12 px-8"
            >
              Login
            </Button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" className="border-t border-white/10 mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <NidamLogo size="sm" />
              <div className="leading-tight">
                <div className="text-sm font-bold">NIDAM POS</div>
                <div className="text-[10px] uppercase tracking-widest text-emerald-300/80">Blue Flag</div>
              </div>
            </div>
            <p className="mt-4 text-sm text-white/60 max-w-sm">
              The smart cloud POS platform built for modern businesses across Somalia and beyond.
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold mb-3">Company</div>
            <ul className="space-y-2 text-sm text-white/65">
              <li className="font-semibold text-white/85">Blue Flag Technology</li>
              <li className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-emerald-400" /> Mogadishu, Somalia</li>
              <li className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-emerald-400" /> info@blueflag.so</li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold mb-3">Quick Links</div>
            <ul className="space-y-2 text-sm text-white/65">
              {navLinks.map((l) => (
                <li key={l.href}>
                  <a href={l.href} onClick={(e) => handleAnchor(e, l.href)} className="hover:text-white">
                    {l.label}
                  </a>
                </li>
              ))}
              <li>
                <Link to="/login" className="hover:text-white">Login</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 py-5 text-center text-xs text-white/50">
          © {new Date().getFullYear()} Blue Flag Technology · NIDAM POS. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Landing;
