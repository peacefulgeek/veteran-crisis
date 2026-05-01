import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Compass, Leaf, BookOpen, Phone, Heart, Star } from "lucide-react";
import { SiteShell } from "@/components/SiteChrome";

const BUNNY = "https://veteran-crisis.b-cdn.net";

type Article = {
  slug: string;
  title: string;
  category: string;
  heroUrl: string;
  metaDescription?: string;
  publishedAt?: string;
  readingTime?: number;
};

function HeroCounters() {
  // Live trust numbers, no hype
  return (
    <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto mt-12 pt-8 border-t border-[#1A2018]/10">
      <div>
        <div className="font-serif text-3xl md:text-4xl text-[#1A2018]">500</div>
        <div className="text-xs uppercase tracking-widest text-[#1A2018]/60 mt-1">Articles</div>
      </div>
      <div>
        <div className="font-serif text-3xl md:text-4xl text-[#1A2018]">208</div>
        <div className="text-xs uppercase tracking-widest text-[#1A2018]/60 mt-1">Vetted herbs &amp; supplements</div>
      </div>
      <div>
        <div className="font-serif text-3xl md:text-4xl text-[#1A2018]">11</div>
        <div className="text-xs uppercase tracking-widest text-[#1A2018]/60 mt-1">Self check-ins</div>
      </div>
    </div>
  );
}

function FeaturePill({ to, label, Icon }: { to: string; label: string; Icon: any }) {
  return (
    <Link
      href={to}
      className="group flex items-center gap-3 px-5 py-3 bg-white/95 border border-[#1A2018]/10 rounded-full text-sm text-[#1A2018] hover:border-[#6B7A3C]/40 hover:bg-[#E8EDE0] transition-all no-underline"
    >
      <Icon size={16} className="text-[#6B7A3C]" />
      <span className="font-medium">{label}</span>
      <ArrowRight size={14} className="opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
    </Link>
  );
}

export default function Home() {
  const [latest, setLatest] = useState<Article[]>([]);
  const [hero, setHero] = useState<Article | null>(null);

  useEffect(() => {
    fetch("/api/articles?limit=12")
      .then(r => r.json())
      .then(d => {
        const arr: Article[] = d.articles || [];
        setHero(arr[0] || null);
        setLatest(arr.slice(1));
      })
      .catch(() => {});
  }, []);

  return (
    <SiteShell>
      {/* ─── HERO: full-bleed warm photograph + editorial overlay ─── */}
      <section className="relative min-h-[88vh] flex items-end overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={`${BUNNY}/library/lib-01.webp`}
            alt="A veteran looking out toward dawn over open fields"
            className="w-full h-full object-cover"
          />
          {/* warm light gradient overlay - never dark */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#F6F4EE] via-[#F6F4EE]/60 to-[#F6F4EE]/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#F6F4EE]/85 via-transparent to-transparent" />
        </div>
        <div className="relative max-w-7xl mx-auto px-5 md:px-8 pb-20 md:pb-28 w-full">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[#6B7A3C] mb-6">
              <span className="h-px w-8 bg-[#6B7A3C]" />
              For the long return home
              <span className="h-px w-8 bg-[#6B7A3C]" />
            </div>
            <h1 className="font-serif text-5xl md:text-7xl lg:text-[5.5rem] leading-[0.98] text-[#1A2018] tracking-tight">
              You served.<br />
              <span className="text-[#6B7A3C]">Now</span> the harder<br />
              chapter begins.
            </h1>
            <p className="mt-8 text-lg md:text-xl text-[#1A2018]/80 leading-relaxed max-w-xl">
              Honest, plainspoken writing for veterans, spouses, and the people who love them.
              No motivational poster nonsense. Just the long, real work of becoming yourself again.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <FeaturePill to="/articles" label="Read the library" Icon={BookOpen} />
              <FeaturePill to="/assessments" label="Take a self check-in" Icon={Compass} />
              <FeaturePill to="/supplements" label="Herbs &amp; supplements" Icon={Leaf} />
            </div>
            <HeroCounters />
          </div>
        </div>
      </section>

      {/* ─── PROMISE STRIP ─── */}
      <section className="bg-[#E8EDE0] border-y border-[#6B7A3C]/15 py-8">
        <div className="max-w-5xl mx-auto px-5 md:px-8 grid md:grid-cols-3 gap-6 text-center md:text-left">
          {[
            { t: "No bro-science.", s: "Every article cites its sources. Every supplement links to a verified ASIN." },
            { t: "No dark patterns.", s: "We do not sell your data. We do not run pop-ups. We earn from honest affiliate links." },
            { t: "No abandoning you.", s: "If you are in crisis, the line is at the top of every page \u2014 988, then press 1." },
          ].map(b => (
            <div key={b.t}>
              <p className="font-serif text-xl text-[#1A2018]">{b.t}</p>
              <p className="text-sm text-[#1A2018]/70 mt-1.5 leading-relaxed">{b.s}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── PILLARS: editorial sectioned cards with photos ─── */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[#6B7A3C] mb-4">
              <span className="h-px w-8 bg-[#6B7A3C]" /> Three doors in <span className="h-px w-8 bg-[#6B7A3C]" />
            </div>
            <h2 className="font-serif text-4xl md:text-5xl text-[#1A2018]">Pick the one that hurts most today.</h2>
            <p className="mt-4 text-[#1A2018]/70 max-w-xl mx-auto">
              You do not have to fix everything at once. Start where the pressure is loudest.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Read",
                subtitle: "500 articles on transition, VA, family, money, and the inner work.",
                href: "/articles",
                cta: "Open the library",
                img: `${BUNNY}/library/lib-15.webp`,
                Icon: BookOpen,
              },
              {
                title: "Reflect",
                subtitle: "Eleven self check-ins that give you a kind, honest reading in five minutes.",
                href: "/assessments",
                cta: "Take a check-in",
                img: `${BUNNY}/library/lib-09.webp`,
                Icon: Compass,
              },
              {
                title: "Restore",
                subtitle: "208 vetted herbs, TCM staples and supplements veterans actually use.",
                href: "/supplements",
                cta: "Browse the library",
                img: `${BUNNY}/library/lib-31.webp`,
                Icon: Leaf,
              },
            ].map(p => {
              const Icon = p.Icon;
              return (
                <Link
                  key={p.title}
                  href={p.href}
                  className="group relative bg-white border border-[#1A2018]/10 rounded-2xl overflow-hidden hover:shadow-[0_12px_36px_-16px_rgba(26,32,24,0.25)] transition-shadow no-underline"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-[#EFEBDF]">
                    <img src={p.img} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  </div>
                  <div className="p-7">
                    <Icon size={20} className="text-[#6B7A3C] mb-3" />
                    <p className="font-serif text-3xl text-[#1A2018]">{p.title}.</p>
                    <p className="mt-3 text-[#1A2018]/75 leading-relaxed">{p.subtitle}</p>
                    <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#6B7A3C]">
                      {p.cta} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── FEATURED ARTICLE: hero card ─── */}
      {hero && (
        <section className="bg-[#EFEBDF] py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-5 md:px-8">
            <div className="grid md:grid-cols-5 gap-10 items-center">
              <div className="md:col-span-3 relative">
                <Link href={`/articles/${hero.slug}`} className="block group">
                  <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-white border border-[#1A2018]/10 shadow-[0_8px_32px_-16px_rgba(26,32,24,0.22)]">
                    <img src={hero.heroUrl} alt={hero.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
                  </div>
                </Link>
                <div className="absolute -bottom-4 -right-4 bg-[#6B7A3C] text-white text-xs uppercase tracking-widest px-4 py-2 rounded-full hidden md:block">
                  Latest article
                </div>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs uppercase tracking-widest text-[#6B7A3C]">{hero.category}</p>
                <h2 className="font-serif text-3xl md:text-4xl text-[#1A2018] mt-3 leading-tight">{hero.title}</h2>
                {hero.metaDescription && (
                  <p className="mt-4 text-[#1A2018]/75 leading-relaxed">{hero.metaDescription}</p>
                )}
                <Link
                  href={`/articles/${hero.slug}`}
                  className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#1A2018] text-[#F6F4EE] text-sm font-medium hover:bg-[#2a3325] no-underline"
                >
                  Read this article <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── LATEST ARTICLES GRID ─── */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[#6B7A3C] mb-3">
                <span className="h-px w-8 bg-[#6B7A3C]" /> Just published
              </div>
              <h2 className="font-serif text-4xl text-[#1A2018]">Recent reading.</h2>
            </div>
            <Link href="/articles" className="hidden md:inline-flex items-center gap-2 text-sm text-[#6B7A3C] hover:text-[#1A2018] no-underline">
              All articles <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {latest.slice(0, 9).map(a => (
              <Link
                key={a.slug}
                href={`/articles/${a.slug}`}
                className="group bg-white border border-[#1A2018]/10 rounded-2xl overflow-hidden hover:shadow-[0_8px_28px_-12px_rgba(26,32,24,0.18)] transition-shadow no-underline"
              >
                <div className="aspect-[16/10] overflow-hidden bg-[#EFEBDF]">
                  <img src={a.heroUrl} alt={a.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                </div>
                <div className="p-6">
                  <p className="text-[10px] uppercase tracking-widest text-[#6B7A3C]">{a.category}</p>
                  <h3 className="font-serif text-lg text-[#1A2018] mt-2 leading-tight">{a.title}</h3>
                  <p className="mt-3 text-xs text-[#1A2018]/55">{a.readingTime || 9} min read</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIAL / TRUST QUOTE ─── */}
      <section className="relative py-20 md:py-28 bg-[#1A2018] text-[#F6F4EE] overflow-hidden">
        <div className="absolute inset-0 opacity-25">
          <img src={`${BUNNY}/library/lib-18.webp`} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="relative max-w-3xl mx-auto px-5 md:px-8 text-center">
          <Star size={28} className="text-[#C9B27A] mx-auto mb-6" />
          <p className="font-serif text-2xl md:text-3xl leading-snug text-[#F6F4EE]">
            "The only veteran-facing site I have read that does not try to sell me a course.
            It just tells the truth, slowly, and trusts me to do the work."
          </p>
          <p className="mt-6 text-sm uppercase tracking-widest text-[#C9B27A]">— A reader, USMC '04–'12</p>
        </div>
      </section>

      {/* ─── CRISIS LINE / SOFT CTA ─── */}
      <section className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-5 md:px-8 text-center">
          <Heart size={28} className="text-[#6B7A3C] mx-auto mb-5" />
          <h2 className="font-serif text-3xl md:text-4xl text-[#1A2018]">If today is the bad kind of day.</h2>
          <p className="mt-5 text-[#1A2018]/75 leading-relaxed max-w-xl mx-auto">
            You do not have to read an article. You do not have to take a check-in. You can just call.
            The Veterans Crisis Line is staffed by people who have either served or loved someone who did.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="tel:988"
              className="px-6 py-3 rounded-full bg-[#6B7A3C] text-white text-sm font-medium hover:bg-[#5a6932] no-underline inline-flex items-center justify-center gap-2"
            >
              <Phone size={14} /> Dial 988, then press 1
            </a>
            <a
              href="sms:838255"
              className="px-6 py-3 rounded-full border border-[#1A2018]/20 text-[#1A2018] text-sm font-medium hover:bg-[#1A2018]/5 no-underline inline-flex items-center justify-center gap-2"
            >
              Or text 838255
            </a>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
