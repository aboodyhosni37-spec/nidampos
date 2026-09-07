import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, Coffee, Leaf, MapPin, Star, Truck } from "lucide-react";
import heroImg from "@/assets/cafe-hero.jpg";
import aboutImg from "@/assets/cafe-about.jpg";
import { ProductCard } from "@/components/site/ProductCard";
import { useCustomerCart } from "@/lib/customerCart";
import { loadMenu, type DbProduct } from "@/lib/storefront";
import { fetchSettings } from "@/lib/systemSettings";
import { toast } from "sonner";

const Home = () => {
  const [featured, setFeatured] = useState<DbProduct[]>([]);
  const { add } = useCustomerCart();

  useEffect(() => {
    fetchSettings().catch(() => {});
    loadMenu()
      .then(({ products }) => {
        const withImages = products.filter((p) => p.image_url);
        const pick = (withImages.length >= 8 ? withImages : products).slice(0, 8);
        setFeatured(pick);
      })
      .catch(() => {});
  }, []);

  const handleAdd = (p: DbProduct) => {
    add(p);
    toast.success(`${p.name} added to your order`);
  };

  return (
    <>
      {/* HERO */}
      <section className="relative">
        <div className="absolute inset-0">
          <img
            src={heroImg}
            alt="LamaHamar Cafe interior with coffee and pastries"
            width={1600}
            height={1100}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/85 via-foreground/60 to-foreground/25" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-24 sm:py-32 lg:py-40">
          <div className="max-w-2xl space-y-6 text-background">
            <span className="inline-flex items-center gap-2 rounded-full border border-background/25 bg-background/10 px-3.5 py-1.5 text-xs font-semibold backdrop-blur">
              <Leaf className="h-3.5 w-3.5" /> Fresh · Local · Roasted daily
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
              LamaHamar Cafe
            </h1>
            <p className="text-lg sm:text-xl text-background/85 leading-relaxed">
              A warm corner of Mogadishu for great coffee, fresh food and unhurried
              conversation.
            </p>
            <p className="text-background/70 max-w-xl">
              Browse the full menu, build your order in seconds, and choose delivery to
              your door or dine-in at your table.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                to="/menu"
                className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
              >
                Order Now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/about"
                className="inline-flex items-center gap-2 h-12 px-6 rounded-xl border border-background/30 bg-background/10 text-background font-semibold backdrop-blur hover:bg-background/20 transition-colors"
              >
                Our story
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* PERKS */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 -mt-10 relative z-10">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Coffee, title: "Freshly brewed", text: "Beans roasted and ground daily." },
            { icon: Truck, title: "Fast delivery", text: "Hot orders across the city." },
            { icon: Clock, title: "Open every day", text: "6:00 AM – 10:00 PM." },
          ].map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-border bg-card p-5 shadow-soft flex items-start gap-3"
            >
              <span className="h-11 w-11 shrink-0 rounded-xl bg-secondary text-primary flex items-center justify-center">
                <p.icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-bold">{p.title}</h3>
                <p className="text-sm text-muted-foreground">{p.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Popular right now
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-2">
              Featured favourites
            </h2>
          </div>
          <Link
            to="/menu"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:gap-2.5 transition-all"
          >
            View full menu <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {featured.length === 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="aspect-[4/3] bg-secondary animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-4 w-3/4 bg-secondary rounded animate-pulse" />
                  <div className="h-8 w-1/2 bg-secondary rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} onAdd={handleAdd} />
            ))}
          </div>
        )}
      </section>

      {/* ABOUT PREVIEW */}
      <section className="bg-secondary/40 border-y border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20 grid gap-10 lg:grid-cols-2 items-center">
          <div className="rounded-3xl overflow-hidden shadow-elegant">
            <img
              src={aboutImg}
              alt="Barista pouring latte art at LamaHamar Cafe"
              loading="lazy"
              width={1200}
              height={900}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="space-y-5">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              About us
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Made by hand, served with care
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              LamaHamar Cafe started with one espresso machine and a simple idea: good
              coffee should feel like a small daily luxury. Today our kitchen serves
              breakfast, light lunches, pastries and cold drinks — all prepared fresh to
              order.
            </p>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Star className="h-4 w-4 text-primary fill-primary" />
              Loved by guests across Mogadishu
            </div>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
            >
              Read our story <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA / CONTACT */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
        <div className="rounded-3xl bg-primary text-primary-foreground p-8 sm:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Hungry? Order in a few taps.
            </h2>
            <p className="text-primary-foreground/80">
              Delivery across the city or dine-in at your table — pay when your order
              arrives.
            </p>
            <p className="inline-flex items-center gap-2 text-sm text-primary-foreground/80">
              <MapPin className="h-4 w-4" /> Mogadishu, Somalia
            </p>
          </div>
          <Link
            to="/menu"
            className="inline-flex items-center gap-2 h-12 px-7 rounded-xl bg-background text-foreground font-semibold hover:bg-background/90 transition-colors shrink-0"
          >
            Start your order <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
};

export default Home;
