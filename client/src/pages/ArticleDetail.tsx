import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useRoute } from "wouter";
import { SiteShell } from "@/components/SiteChrome";
import { useArticle, formatDate } from "@/lib/articles";

export default function ArticleDetail() {
  const [, params] = useRoute("/articles/:slug");
  const slug = params?.slug;
  const { data: a, loading, error } = useArticle(slug);
  const heroRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLDivElement>(null);
  const [activeDot, setActiveDot] = useState(0);
  const [parallax, setParallax] = useState(0);

  // Parse h2 anchors for dot nav
  const sections = useMemo(() => {
    if (!a?.body) return [];
    const m = a.body.match(/<h2[^>]*>([^<]+)<\/h2>/gi) || [];
    return m.map((mm, i) => ({
      id: `s-${i + 1}`,
      label: (mm.replace(/<[^>]+>/g, "") || `Section ${i + 1}`).slice(0, 40),
    }));
  }, [a?.body]);

  // Inject IDs into the rendered HTML so dots can scroll
  const bodyHtml = useMemo(() => {
    if (!a?.body) return "";
    let i = 0;
    return a.body.replace(/<h2(?![^>]*\sid=)/gi, () => {
      i++;
      return `<h2 id="s-${i}"`;
    });
  }, [a?.body]);

  // ── Per-article meta + JSON-LD injection (works in dev + prod for crawlers that run JS)
  useEffect(() => {
    if (!a) return;
    const SITE = 'https://veterancrisis.com';
    const url = `${SITE}/articles/${a.slug}`;
    const ogImg = (a as any).ogImage || a.heroUrl || `${SITE}/og-default.webp`;
    const desc = (a.metaDescription || a.title || '').slice(0, 240);
    const orig = document.title;
    document.title = `${a.title} — Veteran Crisis`;

    const upsertMeta = (selector: string, attrs: Record<string, string>) => {
      let el = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
        document.head.appendChild(el);
      } else {
        Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
      }
      return el;
    };
    const upsertLink = (rel: string, href: string) => {
      let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        document.head.appendChild(el);
      }
      el.setAttribute('href', href);
      return el;
    };

    upsertMeta('meta[name="description"]', { name: 'description', content: desc });
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: a.title });
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: desc });
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'article' });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: url });
    upsertMeta('meta[property="og:image"]', { property: 'og:image', content: ogImg });
    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: 'Veteran Crisis' });
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: a.title });
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: desc });
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: ogImg });
    upsertLink('canonical', url);

    // JSON-LD Article schema
    const ldId = 'jsonld-article';
    let ld = document.getElementById(ldId) as HTMLScriptElement | null;
    if (!ld) {
      ld = document.createElement('script');
      ld.id = ldId;
      ld.type = 'application/ld+json';
      document.head.appendChild(ld);
    }
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: a.title,
      description: desc,
      image: [ogImg],
      datePublished: a.publishedAt,
      dateModified: a.lastModifiedAt || a.publishedAt,
      author: { '@type': 'Person', name: a.author || 'The Oracle Lover', url: `${SITE}/author/the-oracle-lover` },
      publisher: { '@type': 'Organization', name: 'Veteran Crisis', url: SITE },
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    });

    return () => {
      document.title = orig;
      const stale = document.getElementById(ldId);
      if (stale) stale.remove();
    };
  }, [a?.slug, a?.title, a?.metaDescription, (a as any)?.ogImage, a?.heroUrl, a?.publishedAt, a?.lastModifiedAt, a?.author]);

  // Parallax + dot nav scroll watch
  useEffect(() => {
    const onScroll = () => {
      setParallax(window.scrollY * 0.18);
      if (!articleRef.current) return;
      const headings = articleRef.current.querySelectorAll("h2[id]");
      let idx = 0;
      const triggerY = window.scrollY + 220;
      headings.forEach((h, i) => {
        const top = (h as HTMLElement).offsetTop + (articleRef.current?.offsetTop || 0);
        if (top <= triggerY) idx = i;
      });
      setActiveDot(idx);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [bodyHtml]);

  if (loading) {
    return (
      <SiteShell>
        <div className="max-w-3xl mx-auto px-6 md:px-10 py-32 text-[#1A2018]/60">Loading…</div>
      </SiteShell>
    );
  }
  if (error || !a) {
    return (
      <SiteShell>
        <div className="max-w-3xl mx-auto px-6 md:px-10 py-32">
          <h1 className="font-serif text-3xl text-[#1A2018]">Not found.</h1>
          <p className="text-[#1A2018]/70 mt-3">
            That article isn’t live yet. <Link href="/articles" className="text-[#6B7A3C]">Back to all articles</Link>.
          </p>
        </div>
      </SiteShell>
    );
  }

  const tldrMatch = a.body.match(/<section[^>]*data-tldr[^>]*>[\s\S]*?<\/section>/i);
  const tldr = tldrMatch ? tldrMatch[0] : null;

  return (
    <SiteShell>
      {/* HERO */}
      <section
        ref={heroRef}
        className="relative h-[78vh] md:h-[88vh] flex items-end overflow-hidden"
      >
        {a.heroUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${a.heroUrl})`,
              transform: `translateY(${parallax}px) scale(1.06)`,
              willChange: "transform",
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A2018]/95 via-[#1A2018]/55 to-[#1A2018]/15" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-10 pb-20 md:pb-24 text-[#F6F4EE]">
          <p className="text-xs uppercase tracking-[0.32em] text-[#E8EDE0] opacity-90 mb-5">
            {a.category}
          </p>
          <h1 className="font-serif font-light text-3xl md:text-5xl leading-[1.1] tracking-tight max-w-3xl">
            {a.title}
          </h1>
          <p className="text-sm text-[#F6F4EE]/80 mt-7">
            By {a.author} · {formatDate(a.publishedAt)} · {a.readingTime || 8} min read
          </p>
        </div>
      </section>

      {/* DOT NAV */}
      {sections.length > 0 && (
        <nav
          aria-label="Article sections"
          className="hidden lg:flex flex-col gap-3 fixed top-1/2 -translate-y-1/2 right-7 z-40"
        >
          {sections.map((s, i) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              title={s.label}
              className={
                "block w-2.5 h-2.5 rounded-full transition-all " +
                (i === activeDot ? "bg-[#6B7A3C] scale-125" : "bg-[#1A2018]/25 hover:bg-[#6B7A3C]/70")
              }
            />
          ))}
        </nav>
      )}

      {/* BODY */}
      <article ref={articleRef} className="max-w-[720px] mx-auto px-5 md:px-0 py-16 md:py-24">
        {tldr && (
          <div
            className="bg-[#E8EDE0] border-l-4 border-[#6B7A3C] p-6 rounded-r-md mb-12 text-[#1A2018]/90 prose-tldr"
            dangerouslySetInnerHTML={{ __html: tldr }}
          />
        )}
        <div
          className="article-body"
          dangerouslySetInnerHTML={{
            __html: tldr ? bodyHtml.replace(tldrMatch![0], "") : bodyHtml,
          }}
        />
      </article>

      {/* AFTER ARTICLE CTA */}
      <section className="bg-[#EFEBDF] border-t border-[#1A2018]/8">
        <div className="max-w-3xl mx-auto px-6 md:px-10 py-16 text-center">
          <p className="text-xs uppercase tracking-[0.32em] text-[#6B7A3C] mb-3">Keep reading</p>
          <h3 className="font-serif text-2xl md:text-3xl text-[#1A2018]">
            More writing for the long road home.
          </h3>
          <Link
            href="/articles"
            className="inline-block mt-7 px-7 py-3 bg-[#6B7A3C] hover:bg-[#7A8A45] text-[#F6F4EE] tracking-wide rounded-full no-underline transition-all"
          >
            Browse the library
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
