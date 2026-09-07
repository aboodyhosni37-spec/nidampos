import { Link } from "react-router-dom";
import { ArrowRight, Clock, Mail, MapPin, Phone } from "lucide-react";

const Contact = () => (
  <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
    <header className="space-y-3 max-w-2xl">
      <span className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
        Contact
      </span>
      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Come say hello</h1>
      <p className="text-muted-foreground">
        Questions about an order, a booking or a large group? Call us or drop by the cafe —
        we are happy to help.
      </p>
    </header>

    <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-2">
        <span className="h-11 w-11 rounded-xl bg-secondary text-primary flex items-center justify-center">
          <MapPin className="h-5 w-5" />
        </span>
        <h2 className="font-bold pt-2">Visit</h2>
        <p className="text-sm text-muted-foreground">Mogadishu, Somalia</p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-2">
        <span className="h-11 w-11 rounded-xl bg-secondary text-primary flex items-center justify-center">
          <Phone className="h-5 w-5" />
        </span>
        <h2 className="font-bold pt-2">Call</h2>
        <a href="tel:+252619105454" className="text-sm text-muted-foreground hover:text-primary">
          +252 619105454
        </a>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-2">
        <span className="h-11 w-11 rounded-xl bg-secondary text-primary flex items-center justify-center">
          <Mail className="h-5 w-5" />
        </span>
        <h2 className="font-bold pt-2">Email</h2>
        <a
          href="mailto:lamahamar@gmail.com"
          className="text-sm text-muted-foreground hover:text-primary break-all"
        >
          lamahamar@gmail.com
        </a>
      </div>
    </div>

    <div className="mt-10 grid gap-5 lg:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <h2 className="font-bold flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> Opening hours
        </h2>
        <ul className="mt-4 space-y-3 text-sm">
          <li className="flex justify-between">
            <span className="text-muted-foreground">Every day</span>
            <span className="font-semibold">6:00 AM – 10:00 PM</span>
          </li>
        </ul>
      </div>


      <div className="rounded-2xl bg-primary text-primary-foreground p-8 flex flex-col justify-center gap-4">
        <h2 className="text-2xl font-extrabold tracking-tight">
          Ready to order?
        </h2>
        <p className="text-primary-foreground/80 text-sm">
          Delivery to your door or dine-in at your table — build your order online and pay
          on arrival.
        </p>
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

export default Contact;
