import { Link } from "react-router-dom";
import { ArrowRight, Coffee, Heart, Leaf, Users } from "lucide-react";
import { useSiteContent } from "@/lib/siteContent";

const VALUE_ICONS = [Coffee, Leaf, Heart, Users];

const About = () => {
  const content = useSiteContent();
  const about = content.about;

  return (
    <>
      <section className="relative">
        <div className="absolute inset-0">
          <img
            src={about.hero_image}
            alt={`Inside ${content.brand.name}`}
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
            {about.title}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-background/85 leading-relaxed">
            {about.intro}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20 grid gap-10 lg:grid-cols-2 items-center">
        <div className="space-y-5">
          <h2 className="text-3xl font-extrabold tracking-tight">{about.story_title}</h2>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
            {about.story_text}
          </p>
          {about.story_text_2 && (
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {about.story_text_2}
            </p>
          )}
          <Link
            to="/menu"
            className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
          >
            Explore the menu <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="rounded-3xl overflow-hidden shadow-elegant">
          <img
            src={about.image}
            alt={`${content.brand.name} team at work`}
            loading="lazy"
            width={1200}
            height={900}
            className="w-full object-cover"
          />
        </div>
      </section>

      {about.values.length > 0 && (
        <section className="bg-secondary/40 border-y border-border">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
            <h2 className="text-3xl font-extrabold tracking-tight text-center">
              {about.values_title}
            </h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {about.values.map((v, i) => {
                const Icon = VALUE_ICONS[i % VALUE_ICONS.length];
                return (
                  <div
                    key={`${v.title}-${i}`}
                    className="rounded-2xl border border-border bg-card p-6 shadow-soft"
                  >
                    <span className="h-11 w-11 rounded-xl bg-secondary text-primary flex items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 font-bold">{v.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                      {v.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </>
  );
};

export default About;
