import { Link } from "react-router-dom";
import { ArrowRight, Clock, Mail, MapPin, Phone } from "lucide-react";
import { useSiteContent } from "@/lib/siteContent";

const Contact = () => {
  const content = useSiteContent();
  const c = content.contact;
  const page = content.contact_page;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
      <header className="space-y-3 max-w-2xl">
        <span className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
          {page.eyebrow}
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">{page.title}</h1>
        <p className="text-muted-foreground">{page.description}</p>
      </header>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-2">
          <span className="h-11 w-11 rounded-xl bg-secondary text-primary flex items-center justify-center">
            <MapPin className="h-5 w-5" />
          </span>
          <h2 className="font-bold pt-2">{page.visit_title}</h2>
          <p className="text-sm text-muted-foreground">{c.address}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-2">
          <span className="h-11 w-11 rounded-xl bg-secondary text-primary flex items-center justify-center">
            <Phone className="h-5 w-5" />
          </span>
          <h2 className="font-bold pt-2">{page.call_title}</h2>
          <a
            href={`tel:${c.phone.replace(/\s+/g, "")}`}
            className="text-sm text-muted-foreground hover:text-primary"
          >
            {c.phone}
          </a>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-2">
          <span className="h-11 w-11 rounded-xl bg-secondary text-primary flex items-center justify-center">
            <Mail className="h-5 w-5" />
          </span>
          <h2 className="font-bold pt-2">{page.email_title}</h2>
          <a
            href={`mailto:${c.email}`}
            className="text-sm text-muted-foreground hover:text-primary break-all"
          >
            {c.email}
          </a>
        </div>
      </div>

      {page.image && (
        <div className="mt-10 rounded-3xl overflow-hidden shadow-elegant">
          <img
            src={page.image}
            alt={`${content.brand.name} location`}
            loading="lazy"
            className="w-full object-cover"
          />
        </div>
      )}

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="font-bold flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" /> {page.hours_title}
          </h2>
          <ul className="mt-4 space-y-3 text-sm">
            {[{ label: c.hours_label, value: c.hours_value }, ...c.extra_hours].filter((h) => h.label || h.value).map((h, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span className="text-muted-foreground">{h.label}</span>
                <span className="font-semibold">{h.value}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl bg-primary text-primary-foreground p-8 flex flex-col justify-center gap-4">
          <h2 className="text-2xl font-extrabold tracking-tight">{page.cta_title}</h2>
          <p className="text-primary-foreground/80 text-sm">{page.cta_text}</p>
          {page.cta_button_label && <Link
            to={page.cta_button_href || "/menu"}
            className="inline-flex w-fit items-center gap-2 h-12 px-6 rounded-xl bg-background text-foreground font-semibold hover:bg-background/90 transition-colors"
          >
            {page.cta_button_label} <ArrowRight className="h-4 w-4" />
          </Link>}
        </div>
      </div>
    </div>
  );
};

export default Contact;
