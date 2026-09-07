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
          Contact
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">{page.title}</h1>
        <p className="text-muted-foreground">{page.description}</p>
      </header>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-2">
          <span className="h-11 w-11 rounded-xl bg-secondary text-primary flex items-center justify-center">
            <MapPin className="h-5 w-5" />
          </span>
          <h2 className="font-bold pt-2">Visit</h2>
          <p className="text-sm text-muted-foreground">{c.address}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-2">
          <span className="h-11 w-11 rounded-xl bg-secondary text-primary flex items-center justify-center">
            <Phone className="h-5 w-5" />
          </span>
          <h2 className="font-bold pt-2">Call</h2>
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
          <h2 className="font-bold pt-2">Email</h2>
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
            <Clock className="h-4 w-4 text-primary" /> Opening hours
          </h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex justify-between">
              <span className="text-muted-foreground">{c.hours_label}</span>
              <span className="font-semibold">{c.hours_value}</span>
            </li>
          </ul>
        </div>

        <div className="rounded-2xl bg-primary text-primary-foreground p-8 flex flex-col justify-center gap-4">
          <h2 className="text-2xl font-extrabold tracking-tight">{page.cta_title}</h2>
          <p className="text-primary-foreground/80 text-sm">{page.cta_text}</p>
          <Link
            to="/menu"
            className="inline-flex w-fit items-center gap-2 h-12 px-6 rounded-xl bg-background text-foreground font-semibold hover:bg-background/90 transition-colors"
          >
            Order Now <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Contact;
