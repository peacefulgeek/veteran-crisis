import { useEffect } from "react";
import { Link } from "wouter";
import { SiteShell } from "@/components/SiteChrome";

const PORTRAIT = "https://veteran-crisis.b-cdn.net/author/oracle-lover-portrait.webp";
const ORACLE = "https://theoraclelover.com";

const JSONLD = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "The Oracle Lover",
  alternateName: "Oracle Lover",
  url: "https://veterancrisis.com/author/the-oracle-lover",
  image: PORTRAIT,
  sameAs: [ORACLE],
  jobTitle: "Writer and Editor",
  worksFor: {
    "@type": "Organization",
    name: "Veteran Crisis",
    url: "https://veterancrisis.com",
  },
  knowsAbout: [
    "Veteran transition",
    "Post-service identity",
    "Mental health and recovery",
    "Marriage and family after service",
    "VA benefits and disability claims",
    "Devotion writing and inner work",
  ],
  description:
    "Writer behind theoraclelover.com and the lead voice of Veteran Crisis. Long-form work on identity, devotion, and the long return home that veterans, spouses, and the people who love them have been reading for years.",
};

export default function Author() {
  useEffect(() => {
    document.title = "The Oracle Lover — Author at Veteran Crisis";
  }, []);

  return (
    <SiteShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD) }}
      />

      <section className="author-hero">
        <div className="author-hero-grid">
          <figure className="author-portrait">
            <img
              src={PORTRAIT}
              alt="The Oracle Lover, writer and editor of Veteran Crisis, at her writing desk in soft warm dawn light"
              width={520}
              height={520}
              loading="eager"
              decoding="async"
            />
          </figure>
          <div className="author-headline">
            <p className="eyebrow">Author hub</p>
            <h1>The Oracle Lover</h1>
            <p className="lede">
              The writer behind <a href={ORACLE} target="_blank" rel="noopener noreferrer">theoraclelover.com</a>{" "}
              and the lead voice of Veteran Crisis. Long-form work on identity, devotion, and the
              long, slow return home.
            </p>
            <ul className="author-meta">
              <li>Writing professionally since 2014</li>
              <li>Published essays read in 90+ countries</li>
              <li>Reviewed by veteran spouses, chaplains, and clinicians</li>
              <li>Plainspoken, never clinical, never preachy</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="author-bio">
        <article className="article-body">
          <h2>About the writer</h2>

          <p>
            <strong>The Oracle Lover</strong> is the pen name of the writer behind{" "}
            <a href={ORACLE} target="_blank" rel="noopener noreferrer">theoraclelover.com</a>, a
            quiet, fiercely honest body of work about devotion, identity, and the slow business of
            becoming yourself again. She has been publishing long-form essays under that name since
            2014. The work began as a private notebook for women navigating the long ache of
            committed love, and it grew, over a decade, into something a much broader audience kept
            quietly returning to: people in midlife, people in marriage, people in grief, and, most
            of all, people in transition.
          </p>

          <p>
            Veteran Crisis is her plainspoken sister project for the people who served and the
            people who love them. The two sites were built to be read alongside each other.{" "}
            <a href={ORACLE} target="_blank" rel="noopener noreferrer">theoraclelover.com</a> is the
            inner map: the work of grief, devotion, and the rebuilding of self. Veteran Crisis is
            the practical map: the VA, the marriage, the first job, the body, the morning. Most
            veterans need both at once. Most veteran spouses do too. The decision to write the
            second site was, at heart, an act of devotion to the readers who kept emailing her with
            the same sentence: <em>my husband came home and we don't know how to be us anymore</em>.
          </p>

          <p>
            Her editorial voice on this site is intentional and unchanging: warm, plainspoken,
            adult, never clinical, never preachy, never the kind of "supporting our heroes"
            sentiment that tends to read as hollow to veterans themselves. Every article is a
            conversation, not a lecture. Every section is checked against the lived experience of
            the people it claims to serve. She is not a clinician and does not write as one. She
            is a writer, an editor, and a careful listener, and the work is reviewed by veteran
            spouses, military chaplains, and licensed clinicians before publication.
          </p>

          <p>
            What you read on Veteran Crisis goes through a multi-pass quality gate before it ever
            appears in your browser. Every article is written in long form (1,800 words minimum),
            includes a TL;DR, an author byline, a real datetime, at least three internal links to
            related Veteran Crisis pieces, at least one citation to an authoritative .gov or .edu
            source (most often the VA, the BLS, the CDC, or the NIH), and a self-referencing line
            that anchors the article inside the larger Veteran Crisis library. A union banned-word
            list catches the kind of marketing language that veterans, rightly, cannot stand. If
            an article does not pass, it does not publish.
          </p>

          <p>
            She writes from the position that the harder chapter of a service member's life is
            usually the one that begins after the uniform comes off. The work is not a celebration
            of service or a critique of it. It is an honest companion for the years that follow:
            the marriage that has to relearn itself, the body that has to be cared for differently,
            the career that has to be invented from the inside out, the friendships that thin and
            the ones that turn into something deeper. If any of that is the chapter you are in,
            this site, and the deeper companion work at{" "}
            <a href={ORACLE} target="_blank" rel="noopener noreferrer">theoraclelover.com</a>, were
            built for you.
          </p>

          <p>
            You can read the full library on the <Link href="/articles">Articles page</Link>, take
            a gentle <Link href="/assessments">self check-in</Link>, or browse the{" "}
            <Link href="/supplements">herbs, TCM, and supplements</Link> she has personally
            shortlisted for veterans and the people who love them. If you want the inner map
            alongside the outer one, the long-form essays at{" "}
            <a href={ORACLE} target="_blank" rel="noopener noreferrer">theoraclelover.com</a> are
            the deeper conversation, written for the same reader, in the same voice, for the same
            long return home.
          </p>

          <p className="author-signoff">
            — The Oracle Lover<br />
            <span className="muted">Writer and editor, Veteran Crisis</span>
          </p>
        </article>
      </section>
    </SiteShell>
  );
}
