import { useMemo, useState } from "react";
import { Link } from "wouter";
import { SiteShell } from "@/components/SiteChrome";
import { useArticles, formatDate } from "@/lib/articles";

export default function Articles() {
  const { data, loading } = useArticles(120);
  const [filter, setFilter] = useState<string>("All");
  const categories = useMemo(() => {
    const set = new Set<string>();
    (data || []).forEach(a => set.add(a.category));
    return ["All", ...Array.from(set).sort()];
  }, [data]);
  const items = (data || []).filter(a => filter === "All" || a.category === filter);

  return (
    <SiteShell>
      <section className="max-w-6xl mx-auto px-6 md:px-10 pt-24 pb-12">
        <p className="text-xs uppercase tracking-[0.32em] text-[#6B7A3C] mb-3">The library</p>
        <h1 className="font-serif text-4xl md:text-5xl text-[#1A2018] leading-tight">
          Every essay, every guide.
        </h1>
        <p className="text-[#1A2018]/75 mt-5 max-w-2xl leading-relaxed">
          Long-form writing on the work of leaving the uniform behind. Identity,
          benefits, careers, families, money, mental health. No hype. No fluff.
          Just the writing.
        </p>
      </section>
      <section className="max-w-6xl mx-auto px-6 md:px-10 py-6">
        <div className="flex flex-wrap gap-2">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={
                "px-4 py-1.5 text-sm rounded-full border transition-colors " +
                (filter === c
                  ? "bg-[#6B7A3C] text-[#F6F4EE] border-[#6B7A3C]"
                  : "border-[#1A2018]/15 text-[#1A2018]/80 hover:border-[#6B7A3C] hover:text-[#6B7A3C]")
              }
            >
              {c}
            </button>
          ))}
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-6 md:px-10 pb-24">
        {loading ? (
          <p className="text-sm text-[#1A2018]/60">Loading…</p>
        ) : (
          <div className="grid md:grid-cols-3 gap-8 mt-6">
            {items.map(a => (
              <Link key={a.slug} href={`/articles/${a.slug}`} className="group no-underline">
                {a.heroUrl && (
                  <div className="aspect-[3/2] overflow-hidden rounded-lg mb-4">
                    <img
                      src={a.heroUrl}
                      alt={a.heroAlt || a.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                )}
                <p className="text-[10px] uppercase tracking-[0.28em] text-[#6B7A3C] mb-2">
                  {a.category}
                </p>
                <h3 className="font-serif text-lg md:text-xl text-[#1A2018] group-hover:text-[#6B7A3C] transition-colors leading-snug">
                  {a.title}
                </h3>
                <p className="text-xs text-[#1A2018]/55 mt-2">
                  {formatDate(a.publishedAt)} · {a.readingTime || 8} min
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </SiteShell>
  );
}
