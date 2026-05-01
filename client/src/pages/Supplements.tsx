import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { SiteShell } from "@/components/SiteChrome";

type Supplement = {
  asin: string;
  name: string;
  category: string;
  image: string;
  url: string;
  description: string[]; // 3 sentences
};

const BUNNY = "https://veteran-crisis.b-cdn.net";

function fallbackImage(idx: number) {
  const n = (idx % 60) + 1;
  return `${BUNNY}/supplements/sup-${String(n).padStart(2, "0")}.webp`;
}

export default function Supplements() {
  const [items, setItems] = useState<Supplement[]>([]);
  const [cats, setCats] = useState<string[]>([]);
  const [active, setActive] = useState<string>("All");
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/supplements")
      .then(r => r.json())
      .then(d => {
        setItems(d.supplements || []);
        setCats(["All", ...(d.categories || [])]);
      })
      .catch(() => setItems([]));
  }, []);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return items.filter(s => {
      if (active !== "All" && s.category !== active) return false;
      if (ql && !s.name.toLowerCase().includes(ql) && !s.category.toLowerCase().includes(ql)) return false;
      return true;
    });
  }, [items, active, q]);

  return (
    <SiteShell>
      {/* HERO */}
      <section className="relative pt-12 md:pt-20 pb-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#F6F4EE] via-[#EFEBDF] to-[#E8EDE0]" />
        <div className="relative max-w-4xl mx-auto px-5 md:px-8 text-center">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#6B7A3C] mb-5">
            <span className="h-px w-8 bg-[#6B7A3C]" /> Herbs, TCM &amp; Supplements <span className="h-px w-8 bg-[#6B7A3C]" />
          </div>
          <h1 className="font-serif text-4xl md:text-6xl text-[#1A2018] leading-[1.05]">
            Two hundred quiet allies<br />for the long return home.
          </h1>
          <p className="mt-7 text-lg md:text-xl text-[#1A2018]/75 leading-relaxed max-w-2xl mx-auto">
            A curated library of vetted herbs, traditional Chinese medicine staples, and modern
            supplements that veterans actually use. Three honest sentences each. No miracles.
            <br />
            <span className="text-sm text-[#1A2018]/55">As an Amazon Associate we earn from qualifying purchases (paid links).</span>
          </p>
        </div>
      </section>

      {/* SEARCH + CATEGORIES */}
      <section className="sticky top-[57px] md:top-[65px] z-40 bg-[#F6F4EE]/95 backdrop-blur-md border-y border-[#1A2018]/8">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-4 flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1A2018]/40" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search 208 entries"
              className="w-full pl-9 pr-3 py-2 rounded-full bg-white border border-[#1A2018]/15 text-sm focus:outline-none focus:border-[#6B7A3C]"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {cats.map(c => (
              <button
                key={c}
                onClick={() => setActive(c)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs border transition-colors ${
                  active === c
                    ? "bg-[#6B7A3C] text-white border-[#6B7A3C]"
                    : "bg-white text-[#1A2018]/75 border-[#1A2018]/15 hover:border-[#6B7A3C]/40"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* GRID */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <p className="text-sm text-[#1A2018]/60 mb-6">
            Showing <strong className="text-[#1A2018]">{filtered.length}</strong> of {items.length}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((s, i) => (
              <a
                key={s.asin}
                href={s.url}
                target="_blank"
                rel="nofollow sponsored noopener"
                className="group bg-white border border-[#1A2018]/10 rounded-2xl overflow-hidden hover:shadow-[0_8px_28px_-12px_rgba(26,32,24,0.18)] transition-shadow no-underline"
              >
                <div className="aspect-[4/3] overflow-hidden bg-[#EFEBDF]">
                  <img
                    src={s.image || fallbackImage(i)}
                    onError={(e: any) => { e.currentTarget.src = fallbackImage(i); }}
                    alt={s.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="p-5">
                  <div className="text-[10px] uppercase tracking-widest text-[#6B7A3C]">{s.category}</div>
                  <h3 className="font-serif text-lg text-[#1A2018] mt-2 leading-tight">{s.name}</h3>
                  <p className="mt-3 text-sm text-[#1A2018]/75 leading-relaxed line-clamp-3">
                    {Array.isArray(s.description) ? s.description.join(" ") : ""}
                  </p>
                  <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-[#6B7A3C] font-medium">
                    View on Amazon <ExternalLink size={12} />
                  </div>
                </div>
              </a>
            ))}
          </div>
          {!filtered.length && (
            <p className="text-center text-[#1A2018]/55 py-16">Nothing matched. Try a different category or word.</p>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
