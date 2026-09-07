import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, Coffee, Leaf, MapPin, Star, Truck } from "lucide-react";
import { ProductCard } from "@/components/site/ProductCard";
import { useCustomerCart } from "@/lib/customerCart";
import { useSiteContent } from "@/lib/siteContent";
import { loadMenu, type DbProduct } from "@/lib/storefront";
import { fetchSettings } from "@/lib/systemSettings";
import { toast } from "sonner";

const HIGHLIGHT_ICONS = [Coffee, Truck, Clock];

const Home = () => {
  const content = useSiteContent();
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

  const home = content.home;

  return (
    <>
      {/* HERO */}
      <section className="relative">
        <div className="absolute inset-0">
          <img
            src={home.hero_image}
            alt={`${content.brand.name} interior`}
            width={1600}
            height={1100}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/85 via-foreground/60 to-foreground/25" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-24 sm:py-32 lg:py-40">
          <div className="max-w-2xl space-y-6 text-background">
            {home.hero_badge && (
              <span className="inline-flex items-center gap-2 rounded-full border border-background/25 bg-background/10 px-3.5 py-1.5 text-xs font-semibold backdrop-blur">
                <Leaf className="h-3.5 w-3.5" /> {home.hero_badge}
              </span>
            )}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
              {home.hero_title}
            </h1>
            <p className="text-lg sm:text-xl text-background/85 leading-relaxed">
              {home.hero_subtitle}
            </p>
            {home.hero_description && (
              <p className="text-background/70 max-w-xl">{home.hero_description}</p>
            )}
            <div className="flex flex-wrap gap-3 pt-2">
              {home.primary_cta_label && (
                <Link
                  to={home.primary_cta_href || "/menu"}
                  className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
                >
                  {home.primary_cta_label} <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              {home.secondary_cta_label && (
                <Link
                  to={home.secondary_cta_href || "/about"}
                  className="inline-flex items-center gap-2 h-12 px-6 rounded-xl border border-background/30 bg-background/10 text-background font-semibold backdrop-blur hover:bg-background/20 transition-colors"
                >
                  {home.secondary_cta_label}
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* HIGHLIGHTS */}
      {home.highlights.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 sm:px-6 -mt-10 relative z-10">
          <div className="grid gap-4 sm:grid-cols-3">
            {home.highlights.map((p, i) => {
              const Icon = HIGHLIGHT_ICONS[i % HIGHLIGHT_ICONS.length];
              return (
                <div
                  key={`${p.title}-${i}`}
                  className="rounded-2xl border border-border bg-card p-5 shadow-soft flex items-start gap-3"
                >
                  <span className="h-11 w-11 shrink-0 rounded-xl bg-secondary text-primary flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-bold">{p.title}</h3>
                    <p className="text-sm text-muted-foreground">{p.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* FEATURED */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              {home.featured_eyebrow}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-2">
              {home.featured_title}
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
              <ProductCard
                key={p.id}
                product={p}
                onAdd={handleAdd}
                showImage={content.menu.show_images}
              />
            ))}
          </div>
        )}
      </section>

      {/* ABOUT PREVIEW */}
      <section className="bg-secondary/40 border-y border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20 grid gap-10 lg:grid-cols-2 items-center">
          <div className="rounded-3xl overflow-hidden shadow-elegant">
            <img
              src={home.about_image}
              alt={`Inside ${content.brand.name}`}
              loading="lazy"
              width={1200}
              height={900}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="space-y-5">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              {home.about_eyebrow}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {home.about_title}
            </h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {home.about_text}
            </p>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Star className="h-4 w-4 text-primary fill-primary" />
              Loved by guests across {content.contact.address}
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

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20">
        <div className="rounded-3xl bg-primary text-primary-foreground p-8 sm:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {home.cta_title}
            </h2>
            <p className="text-primary-foreground/80">{home.cta_text}</p>
            <p className="inline-flex items-center gap-2 text-sm text-primary-foreground/80">
              <MapPin className="h-4 w-4" /> {content.contact.address}
            </p>
          </div>
          <Link
            to="/menu"
            className="inline-flex items-center gap-2 h-12 px-7 rounded-xl bg-background text-foreground font-semibold hover:bg-background/90 transition-colors shrink-0"
          >
            {home.cta_button_label} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
};

export default Home;
