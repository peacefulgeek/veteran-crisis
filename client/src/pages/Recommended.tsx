import { useEffect, useState } from "react";
import { SiteShell } from "@/components/SiteChrome";

const HERO =
  "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=1920&q=80";

type Product = {
  asin: string;
  name: string;
  url: string;
  category: string;
  tags: string[];
};

export default function Recommended() {
  const [products, setProducts] = useState<Product[] | null>(null);
  useEffect(() => {
    fetch("/api/products")
      .then(r => r.json())
      .then(j => setProducts(j.products || []))
      .catch(() => setProducts([]));
  }, []);

  return (
    <SiteShell>
      <section className="relative h-[58vh] flex items-end overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${HERO})` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A2018]/90 via-[#1A2018]/55 to-[#1A2018]/15" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-10 pb-16 text-[#F6F4EE]">
          <p className="text-xs uppercase tracking-[0.32em] mb-4">Tools we recommend</p>
          <h1 className="font-serif text-4xl md:text-6xl leading-tight">Veteran Transition Library.</h1>
        </div>
      </section>
      <section className="max-w-4xl mx-auto px-6 md:px-10 pt-14">
        <p className="text-[#1A2018]/80 leading-relaxed">
          Books, gear, and tools we recommend for the practical work of
          transition. Mental health, finance, careers, civilian skills, physical
          fitness, and organization. Links below are <strong>paid links</strong>.
          As an Amazon Associate we earn from qualifying purchases at no
          additional cost to you.
        </p>
      </section>
      <section className="max-w-6xl mx-auto px-6 md:px-10 py-14 grid md:grid-cols-2 gap-6">
        {(products || []).map(p => (
          <a
            key={p.asin}
            href={p.url}
            target="_blank"
            rel="sponsored noopener nofollow"
            className="block bg-[#E8EDE0]/55 hover:bg-[#E8EDE0] border border-[#1A2018]/8 p-7 rounded-xl transition-colors no-underline"
          >
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#6B7A3C] mb-2">{p.category}</p>
            <h3 className="font-serif text-xl text-[#1A2018]">{p.name}</h3>
            <p className="text-xs text-[#1A2018]/60 mt-3">
              ASIN: {p.asin} · (paid link)
            </p>
          </a>
        ))}
      </section>
    </SiteShell>
  );
}
