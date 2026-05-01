import { SiteShell } from "@/components/SiteChrome";

export default function Disclosures() {
  return (
    <SiteShell>
      <article className="max-w-[720px] mx-auto px-5 md:px-0 py-24 article-body">
        <p className="text-xs uppercase tracking-[0.32em] text-[#6B7A3C] mb-3">Disclosures</p>
        <h1 className="font-serif text-4xl text-[#1A2018]">Disclosures</h1>

        <h2>Amazon Associates</h2>
        <p>
          Veteran Crisis is a participant in the Amazon Services LLC
          Associates Program, an affiliate advertising program designed to
          provide a means for sites to earn advertising fees by advertising and
          linking to amazon.com. As an Amazon Associate we earn from qualifying
          purchases.
        </p>
        <p>
          When we link to a product on Amazon and you buy it, Amazon pays us a
          small commission at no additional cost to you. Every Amazon link on
          this site is labeled <em>(paid link)</em>.
        </p>

        <h2>How we choose products</h2>
        <p>
          We only recommend products we have used personally or that have been
          consistently recommended by veterans we trust. We are not paid to
          feature anything. If a product is not on the page, it is because we
          did not love it enough to put it there.
        </p>

        <h2>Editorial independence</h2>
        <p>
          No advertiser, affiliate program, or sponsor has any influence over
          what we write. The writing comes first. The recommendations come
          second.
        </p>

        <h2>AI-assisted writing</h2>
        <p>
          Articles on this site are drafted with the assistance of a large
          language model (DeepSeek V4-Pro) under the direct editorial control of
          The Oracle Lover. Every published piece is reviewed before it goes
          live. We do not republish AI output without human review.
        </p>

        <h2>Medical, legal, and financial information</h2>
        <p>
          Veteran Crisis is not a medical, legal, or financial provider.
          Articles are written for general education. For decisions about your
          health, your benefits, or your money, consult a licensed professional
          in your jurisdiction.
        </p>
      </article>
    </SiteShell>
  );
}
