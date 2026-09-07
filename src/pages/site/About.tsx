import { Link } from "react-router-dom";
import { ArrowRight, Coffee, Heart, Leaf, Users } from "lucide-react";
import aboutImg from "@/assets/cafe-about.jpg";
import heroImg from "@/assets/cafe-hero.jpg";

const values = [
  { icon: Coffee, title: "Quality first", text: "Beans and produce chosen carefully, prepared fresh to order." },
  { icon: Leaf, title: "Local & fresh", text: "We buy locally whenever we can and waste as little as possible." },
  { icon: Heart, title: "Warm service", text: "Every guest is greeted like a regular, because most become one." },
  { icon: Users, title: "A place to gather", text: "Room to work, meet friends or simply sit with a good cup." },
];

const About = () => (
  <>
    <section className="relative">
      <div className="absolute inset-0">
        <img
          src={heroImg}
          alt="Inside LamaHamar Cafe"
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-foreground/70" />
      </div>
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-28 text-background">
        <span className="text-xs font-bold uppercase tracking-[0.22em] text-background/70">
          About
        </span>
        <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight">
          Our story
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-background/85 leading-relaxed">
          LamaHamar Cafe is a neighbourhood cafe in Mogadishu built around great coffee,
          honest food and generous hospitality.
        </p>
      </div>
    </section>

    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20 grid gap-10 lg:grid-cols-2 items-center">
      <div className="space-y-5">
        <h2 className="text-3xl font-extrabold tracking-tight">
          From one machine to a full kitchen
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          We opened with a single espresso machine, a short menu and a lot of patience.
          Guests kept coming back and asking for more, so the kitchen grew: breakfasts,
          sandwiches, salads, fresh juices, pastries and desserts made in-house.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Today the cafe serves hundreds of guests every week, both at our tables and
          through delivery across the city. What has not changed is how we work — small
          batches, fresh ingredients and a proper welcome.
        </p>
        <Link
          to="/menu"
          className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
        >
          Explore the menu <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="rounded-3xl overflow-hidden shadow-elegant">
        <img
          src={aboutImg}
          alt="Barista at work"
          loading="lazy"
          width={1200}
          height={900}
          className="w-full object-cover"
        />
      </div>
    </section>

    <section className="bg-secondary/40 border-y border-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
        <h2 className="text-3xl font-extrabold tracking-tight text-center">
          What we care about
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => (
            <div key={v.title} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <span className="h-11 w-11 rounded-xl bg-secondary text-primary flex items-center justify-center">
                <v.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-bold">{v.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{v.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  </>
);

export default About;
