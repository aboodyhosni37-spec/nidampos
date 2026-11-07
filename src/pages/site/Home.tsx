import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, MapPin, Phone, Coffee } from "lucide-react";
import { ProductCard } from "@/components/site/ProductCard";
import { Button } from "@/components/ui/button";
import { useCustomerCart } from "@/lib/customerCart";
import { useSiteContent, type HomeSectionId } from "@/lib/siteContent";
import { loadMenu, type DbProduct, type DbCategory } from "@/lib/storefront";
import { fetchSettings } from "@/lib/systemSettings";
import { toast } from "sonner";
import foodPhoto from "@/assets/cafe-food.jpg";
import { useCustomerPageLoading } from "@/lib/customerLoading";

const Home = () => {
  const content = useSiteContent();
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [loading, setLoading] = useState(true);
  useCustomerPageLoading(loading);
  const { add } = useCustomerCart();
  useEffect(() => {
    fetchSettings().catch(() => {});
    loadMenu().then(data => { setProducts(data.products); setCategories(data.categories); }).catch(() => {}).finally(() => setLoading(false));
  }, []);
  const handleAdd = (p: DbProduct, qty = 1) => { add(p, qty); toast.success(`${p.name} added to your order`); };
  const home = content.home;
  const pictured = products.filter(p => p.image_url);
  const featured = (pictured.length ? pictured : products).slice(0, 4);
  const traditional = products.filter(p => /breakfast|lunch|dinner/i.test(p.category_name)).slice(4, 8);
  const drinks = products.filter(p => /hot drinks|coffee|fresh/i.test(p.category_name)).slice(0, 4);
  const heroPhoto = pictured.find(p => /lunch/i.test(p.category_name)) || pictured[0];
  const theme = content.theme;
  const alt = theme.alt_backgrounds ? "border-y border-border bg-secondary/50" : "border-y border-border";
  const accent = theme.accent === "gold" ? "text-amber-600" : theme.accent === "orange" ? "text-orange-600" : "text-muted-foreground";
  const go = (href: string, children: React.ReactNode) => /^(https?:|tel:|mailto:)/.test(href) ? <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{children}</a> : <Link to={href || "/"}>{children}</Link>;
  const heroSrc = home.hero_custom_image || heroPhoto?.image_url || foodPhoto;
  const gallery = content.gallery.images.filter(g => g.url);
  const sections: Record<HomeSectionId, React.ReactNode> = {
    hero: <section className="customer-photo-surface relative isolate overflow-hidden bg-primary text-primary-foreground">
      <img src={heroSrc} alt={heroPhoto?.name || content.brand.name} className="absolute inset-0 h-full w-full object-cover" fetchPriority="high" />
      <div className="customer-hero-shade absolute inset-0" style={{ opacity: Math.max(0, Math.min(100, theme.hero_shade)) / 100 }} />
      <div className="relative mx-auto flex min-h-[480px] max-w-7xl items-center px-5 py-16 sm:min-h-[560px] sm:px-8 lg:min-h-[580px] lg:px-12">
        <div className="max-w-xl space-y-6">
          <p className="text-sm font-medium">{home.hero_badge || `${content.brand.tagline || "Cuntada Dalka"} · ${content.contact.address}`}</p>
          <h1 className="font-serif text-5xl leading-[1.08] sm:text-6xl lg:text-7xl">{home.hero_title || content.brand.name}</h1>
          {(home.hero_subtitle || home.hero_description) && <p className="max-w-lg text-base leading-relaxed sm:text-lg">{home.hero_subtitle || home.hero_description}</p>}
          <div className="flex flex-wrap gap-3 pt-3">
            {home.primary_cta_label && <Button asChild size="lg" className="h-12 rounded-full bg-background px-7 text-foreground hover:bg-background/90">{go(home.primary_cta_href, <>{home.primary_cta_label} <ArrowRight /></>)}</Button>}
            {home.secondary_cta_label && <Button asChild variant="outline" size="lg" className="h-12 rounded-full border-primary-foreground/50 bg-transparent px-7 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">{go(home.secondary_cta_href, home.secondary_cta_label)}</Button>}
          </div>
        </div>
      </div>
      <div className="relative border-t border-primary-foreground/20">
        <div className="mx-auto flex max-w-7xl flex-wrap gap-x-8 gap-y-3 px-5 py-4 text-sm sm:px-8 lg:px-12">
          <span className="flex items-center gap-2"><MapPin className="h-4 w-4" />{content.contact.address}</span>
          <span className="flex items-center gap-2"><Clock className="h-4 w-4" />{content.contact.hours_value}</span>
        </div>
      </div>
    </section>,
    categories: <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className={`mb-2 text-sm ${accent}`}>{home.categories_eyebrow}</p><h2 className="font-serif text-3xl sm:text-4xl">{home.categories_title}</h2></div>{home.categories_link_label && <Button asChild variant="link"><Link to="/menu">{home.categories_link_label} <ArrowRight /></Link></Button>}</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {categories.filter(c => products.some(p => p.category_id === c.id)).map(c => {
          const image = products.find(p => p.category_id === c.id && p.image_url)?.image_url;
          return <Link key={c.id} to={`/menu?category=${encodeURIComponent(c.id)}`} className="customer-photo-surface group relative flex min-h-28 items-end overflow-hidden rounded-lg bg-primary p-4 text-primary-foreground sm:min-h-36">
            {image && content.menu.show_images && <img src={image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover motion-safe:transition-transform motion-safe:group-hover:scale-105" />}
            <span className="customer-category-shade absolute inset-0" /><span className="relative flex w-full items-center justify-between gap-2 text-sm font-semibold">{c.name}<ArrowRight className="h-4 w-4 shrink-0" /></span>
          </Link>;
        })}
      </div>
    </section>,
    featured: <section className={alt}>
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className={`mb-2 text-sm ${accent}`}>{home.featured_eyebrow}</p><h2 className="font-serif text-3xl sm:text-4xl">{home.featured_title || "Featured menu"}</h2></div>{home.featured_link_label && <Button asChild variant="link"><Link to="/menu">{home.featured_link_label} <ArrowRight /></Link></Button>}</div>
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{featured.map(p => <ProductCard key={p.id} product={p} onAdd={handleAdd} showImage={content.menu.show_images} />)}</div>
        {!loading && !products.length && <p className="py-8 text-muted-foreground">The menu is temporarily unavailable. Please try again shortly.</p>}
      </div>
    </section>,
    traditional: traditional.length > 0 && <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-12"><div className="mb-8"><p className={`mb-2 text-sm ${accent}`}>{home.traditional_eyebrow}</p><h2 className="font-serif text-3xl sm:text-4xl">{home.traditional_title}</h2></div><div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{traditional.map(p => <ProductCard key={p.id} product={p} onAdd={handleAdd} showImage={content.menu.show_images} />)}</div></section>,
    about: <section className={alt}><div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-2 lg:px-12">
      {home.about_image && <img src={home.about_image} alt={content.brand.name} loading="lazy" className="aspect-[4/3] w-full rounded-lg object-cover" />}
      <div className="space-y-5"><p className={`text-sm ${accent}`}>{home.about_eyebrow}</p><h2 className="font-serif text-3xl leading-tight sm:text-4xl">{home.about_title}</h2><p className="whitespace-pre-line leading-relaxed text-muted-foreground">{home.about_text}</p>{home.about_button_label && <Button asChild variant="outline" className="h-12 rounded-full px-6">{go(home.about_button_href, <>{home.about_button_label} <ArrowRight /></>)}</Button>}</div>
    </div></section>,
    gallery: gallery.length > 0 && <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-12"><div className="mb-8"><p className={`mb-2 text-sm ${accent}`}>{content.gallery.eyebrow}</p><h2 className="font-serif text-3xl sm:text-4xl">{content.gallery.title}</h2></div><div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{gallery.map((g, i) => <figure key={i} className="overflow-hidden rounded-lg"><img src={g.url} alt={g.caption || content.brand.name} loading="lazy" className="aspect-square w-full object-cover" />{g.caption && <figcaption className="pt-2 text-sm text-muted-foreground">{g.caption}</figcaption>}</figure>)}</div></section>,
    drinks: drinks.length > 0 && <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-12"><div className="mb-8 flex items-center gap-4"><Coffee className="h-7 w-7" /><h2 className="font-serif text-3xl sm:text-4xl">{home.drinks_title}</h2></div><div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{drinks.map(p => <ProductCard key={p.id} product={p} onAdd={handleAdd} showImage={content.menu.show_images} />)}</div></section>,
    visit: <section className="bg-primary text-primary-foreground"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-5 py-12 sm:px-8 sm:py-16 lg:flex-row lg:items-center lg:px-12"><div className="space-y-4"><h2 className="font-serif text-3xl sm:text-4xl">{home.visit_title || `Visit ${content.brand.name}`}</h2><p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{content.contact.address}</p><p className="flex items-center gap-2"><Clock className="h-4 w-4" />{content.contact.hours_label} · {content.contact.hours_value}</p></div><div className="flex flex-wrap gap-3">{home.visit_order_label && <Button asChild className="h-12 rounded-full bg-background px-6 text-foreground hover:bg-background/90"><Link to="/menu">{home.visit_order_label} <ArrowRight /></Link></Button>}{home.visit_contact_label && <Button asChild variant="outline" className="h-12 rounded-full border-primary-foreground/50 bg-transparent px-6 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"><a href={`tel:${content.contact.phone}`}><Phone />{home.visit_contact_label}</a></Button>}</div></div></section>,
  };
  return <>{content.layout.home_sections.filter(x => x.visible).map(x => <Fragment key={x.id}>{sections[x.id]}</Fragment>)}</>;
};
export default Home;
