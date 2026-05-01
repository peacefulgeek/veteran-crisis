import { Link } from "wouter";
import { SiteShell } from "@/components/SiteChrome";
import { useArticles, formatDate } from "@/lib/articles";

const HERO =
  "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1920&q=80";

export default function Author() {
  const { data: articles } = useArticles(60);
  return (
    <SiteShell>
      <section className="relative h-[58vh] flex items-end overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${HERO})` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A2018]/90 via-[#1A2018]/55 to-[#1A2018]/15" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-10 pb-16 text-[#F6F4EE]">
          <p className="text-xs uppercase tracking-[0.32em] mb-4">Author</p>
          <h1 className="font-serif text-4xl md:text-6xl leading-tight">The Oracle Lover</h1>
          <p className="mt-6 text-lg max-w-2xl text-[#F6F4EE]/85 leading-relaxed">
            Writing for people walking through hard transitions, and for the
            men and women who served and are now becoming someone new.
          </p>
        </div>
      </section>

      <article className="max-w-[720px] mx-auto px-5 md:px-0 py-20 article-body">
        <p>
          The Oracle Lover writes about identity, transition, mental health,
          and the practical work of becoming yourself again on the other side
          of major life passages. The Veteran Shift is the home for
          military-to-civilian writing. Other writing on broader themes lives
          at <a href="https://theoraclelover.com" target="_blank" rel="noopener">theoraclelover.com</a>.
        </p>
        <h2>Influences and method</h2>
        <p>
          The work draws on Jung, Angeles Arrien, Rachel Pollack, Clarissa
          Pinkola Estés, and Joseph Campbell, mixed with the very practical
          experience of veterans and clinicians who do the work every day. The
          voice is direct on purpose. The military teaches you to be honest
          under pressure. You can use that.
        </p>
        <h2>Editorial standards</h2>
        <p>
          Every article ships with a TL;DR, a byline, a published date,
          internal links to related work on the site, and at least one external
          link to a primary source from a .gov or .edu domain. AI assists with
          drafting under direct human editorial control.
        </p>
      </article>

      <section className="max-w-6xl mx-auto px-6 md:px-10 pb-24">
        <h2 className="font-serif text-2xl text-[#1A2018] mb-8">Recent work</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {(articles || []).slice(0, 9).map(a => (
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
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#6B7A3C] mb-2">{a.category}</p>
              <h3 className="font-serif text-lg text-[#1A2018] group-hover:text-[#6B7A3C] transition-colors">{a.title}</h3>
              <p className="text-xs text-[#1A2018]/55 mt-2">{formatDate(a.publishedAt)} · {a.readingTime || 8} min</p>
            </Link>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
