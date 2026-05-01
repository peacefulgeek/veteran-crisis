import { Link } from "wouter";
import { SiteShell } from "@/components/SiteChrome";

const HERO =
  "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1920&q=80";

export default function About() {
  return (
    <SiteShell>
      <section className="relative h-[58vh] flex items-end overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${HERO})` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A2018]/90 via-[#1A2018]/55 to-[#1A2018]/15" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-10 pb-16 text-[#F6F4EE]">
          <p className="text-xs uppercase tracking-[0.32em] mb-4">About</p>
          <h1 className="font-serif text-4xl md:text-6xl leading-tight">Why this exists.</h1>
        </div>
      </section>
      <article className="max-w-[720px] mx-auto px-5 md:px-0 py-20 article-body">
        <p>
          Veteran Crisis exists because the transition from service to civilian
          life is one of the most under-supported life passages in the country.
          The military gives you a complete identity for years. Civilian life
          does not have a replacement ready. People walk out the door with their
          DD-214 and almost no map for what happens next.
        </p>
        <p>
          We write for the person sitting in the parking lot of their first
          civilian job, wondering if they made a mistake. For the spouse picking
          up the pieces of a dozen moves. For the family quietly trying to
          rebuild.
        </p>
        <h2>Plain language. No fluff.</h2>
        <p>
          The writing here is direct, practical, and respectful of your time. We
          take the VA seriously. We take identity seriously. We take your time
          seriously. We don’t use the word "blessed." We don’t call you "my
          friend." We talk to you like an adult who has been through real
          things.
        </p>
        <h2>Where to start.</h2>
        <p>
          Most people start with the <Link href="/articles" className="text-[#6B7A3C]">articles library</Link> or the
          <Link href="/recommended" className="text-[#6B7A3C]"> tools we recommend</Link>. The author page lives at
          <Link href="/author/the-oracle-lover" className="text-[#6B7A3C]"> /author/the-oracle-lover</Link>.
        </p>
        <p>
          If you found something useful here, send it to a veteran. That is the
          whole point.
        </p>
      </article>
    </SiteShell>
  );
}
