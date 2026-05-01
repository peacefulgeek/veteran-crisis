import { Link } from "wouter";
import { SiteShell } from "@/components/SiteChrome";
import { useArticles, formatDate } from "@/lib/articles";

// Dawn road, golden light, hopeful — light theme matches palette.
const HERO =
  "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=2400&q=82";
// Secondary mosaic strip
const MOSAIC = [
  "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=900&q=78",
  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=78",
  "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=78",
  "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=900&q=78",
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=900&q=78",
  "https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?auto=format&fit=crop&w=900&q=78",
];

export default function Home() {
  const { data: articles, loading } = useArticles(12);
  const featured = articles?.[0];
  const rest = articles?.slice(1, 7) || [];

  return (
    <SiteShell>
      {/* HERO */}
      <section className="relative min-h-[88vh] flex items-end overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center scale-105"
          style={{ backgroundImage: `url(${HERO})` }}
        />
        {/* Light, warm overlay — never goes full dark, stays inviting per design brief */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A2018]/72 via-[#1A2018]/35 to-[#F6F4EE]/0" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-10 pb-20 md:pb-28 text-[#F6F4EE]">
          <p className="text-xs uppercase tracking-[0.32em] text-[#E8EDE0] opacity-90 mb-6">
            For the people walking from one life into another.
          </p>
          <h1 className="font-serif font-light text-5xl md:text-7xl leading-[1.05] tracking-tight">
            The Veteran Shift.
          </h1>
          <p className="mt-7 text-lg md:text-xl max-w-2xl text-[#F6F4EE]/90 leading-relaxed">
            Honest, plainspoken writing on identity, the VA, civilian work,
            mental health, and the long, slow business of becoming yourself
            again on the other side of service.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/articles"
              className="inline-flex items-center px-7 py-3.5 bg-[#6B7A3C] hover:bg-[#7A8A45] text-[#F6F4EE] tracking-wide rounded-full transition-all no-underline"
            >
              Read the writing
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center px-7 py-3.5 border border-[#F6F4EE]/40 hover:border-[#F6F4EE] text-[#F6F4EE] tracking-wide rounded-full transition-all no-underline"
            >
              Why this exists
            </Link>
          </div>
        </div>
      </section>

      {/* MOSAIC STRIP — warm, image-rich introduction */}
      <section aria-hidden className="max-w-6xl mx-auto px-6 md:px-10 -mt-12 md:-mt-16 relative z-20">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
          {MOSAIC.map((src, i) => (
            <div key={i} className="aspect-square overflow-hidden rounded-md ring-1 ring-[#1A2018]/8 shadow-sm">
              <img src={src} alt="" loading="lazy" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
            </div>
          ))}
        </div>
      </section>

      {/* PILLARS */}
      <section className="max-w-6xl mx-auto px-6 md:px-10 py-24">
        <p className="text-xs uppercase tracking-[0.32em] text-[#6B7A3C] mb-3">
          What we write about
        </p>
        <h2 className="font-serif text-3xl md:text-4xl text-[#1A2018] max-w-3xl leading-tight">
          Six pillars. One long road home.
        </h2>
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {[
            { title: "Identity", body: "Who you are when the rank comes off and the schedule disappears." },
            { title: "The VA & Benefits", body: "Plain-language navigation of disability ratings, GI Bill, VR&E, and VA healthcare." },
            { title: "Career & Translation", body: "Resume work, federal hiring, civilian culture, and the language that lands jobs." },
            { title: "Mental Health", body: "Moral injury, PTSD, the difference between resilience and avoidance." },
            { title: "Family & Reintegration", body: "Spouses, kids, the marriages we want to keep." },
            { title: "Money", body: "Pay structure, the VA loan, the GI Bill, the things you actually need to know." },
          ].map(p => (
            <div
              key={p.title}
              className="bg-[#E8EDE0]/55 border border-[#1A2018]/8 p-7 hover:bg-[#E8EDE0] transition-colors rounded-xl"
            >
              <h3 className="font-serif text-xl text-[#1A2018]">{p.title}</h3>
              <p className="text-sm text-[#1A2018]/75 mt-3 leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      {featured && (
        <section className="bg-[#EFEBDF] py-24">
          <div className="max-w-6xl mx-auto px-6 md:px-10 grid md:grid-cols-2 gap-12 items-center">
            {featured.heroUrl && (
              <Link href={`/articles/${featured.slug}`} className="block group no-underline">
                <div className="aspect-[4/5] overflow-hidden rounded-xl">
                  <img
                    src={featured.heroUrl}
                    alt={featured.heroAlt || featured.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
              </Link>
            )}
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-[#6B7A3C] mb-3">Featured</p>
              <Link href={`/articles/${featured.slug}`} className="no-underline">
                <h3 className="font-serif text-3xl md:text-4xl text-[#1A2018] hover:text-[#6B7A3C] transition-colors leading-tight">
                  {featured.title}
                </h3>
              </Link>
              <p className="text-sm text-[#1A2018]/65 mt-4">
                {formatDate(featured.publishedAt)} · {featured.readingTime || 8} min read · By {featured.author}
              </p>
              <p className="text-base text-[#1A2018]/85 mt-6 leading-relaxed">
                {featured.metaDescription}
              </p>
              <Link
                href={`/articles/${featured.slug}`}
                className="inline-block mt-7 text-[#6B7A3C] hover:text-[#1A2018] tracking-wide text-sm border-b border-[#6B7A3C]/40 hover:border-[#1A2018] no-underline pb-1"
              >
                Read the article →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* RECENT */}
      <section className="max-w-6xl mx-auto px-6 md:px-10 py-24">
        <div className="flex items-baseline justify-between mb-12">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-[#6B7A3C] mb-3">Recent</p>
            <h2 className="font-serif text-3xl md:text-4xl text-[#1A2018]">Lately on the site.</h2>
          </div>
          <Link href="/articles" className="text-sm text-[#6B7A3C] hover:text-[#1A2018] no-underline">
            All articles →
          </Link>
        </div>
        {loading ? (
          <p className="text-sm text-[#1A2018]/60">Loading…</p>
        ) : (
          <div className="grid md:grid-cols-3 gap-8">
            {rest.map(a => (
              <Link key={a.slug} href={`/articles/${a.slug}`} className="group no-underline">
                {a.heroUrl && (
                  <div className="aspect-[3/2] overflow-hidden rounded-lg mb-5">
                    <img
                      src={a.heroUrl}
                      alt={a.heroAlt || a.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                )}
                <p className="text-xs uppercase tracking-[0.28em] text-[#6B7A3C] mb-2">
                  {a.category}
                </p>
                <h3 className="font-serif text-xl text-[#1A2018] group-hover:text-[#6B7A3C] transition-colors leading-snug">
                  {a.title}
                </h3>
                <p className="text-xs text-[#1A2018]/55 mt-3">
                  {formatDate(a.publishedAt)} · {a.readingTime || 8} min
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* AUTHOR INVITE */}
      <section className="bg-[#1A2018] text-[#F6F4EE]">
        <div className="max-w-4xl mx-auto px-6 md:px-10 py-24 text-center">
          <p className="text-xs uppercase tracking-[0.32em] text-[#E8EDE0]/80 mb-5">The author</p>
          <h2 className="font-serif text-3xl md:text-4xl leading-tight">
            Written by The Oracle Lover.
          </h2>
          <p className="mt-6 text-base md:text-lg text-[#F6F4EE]/85 leading-relaxed max-w-2xl mx-auto">
            For people walking through hard transitions. The kind nobody trains
            you for. The kind that ask you to become someone new without losing
            who you were.
          </p>
          <Link
            href="/author/the-oracle-lover"
            className="inline-block mt-9 px-7 py-3.5 border border-[#F6F4EE]/40 hover:border-[#F6F4EE] tracking-wide rounded-full transition-all no-underline text-[#F6F4EE]"
          >
            About the author
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
