import { SiteShell } from "@/components/SiteChrome";

export default function Privacy() {
  return (
    <SiteShell>
      <article className="max-w-[720px] mx-auto px-5 md:px-0 py-24 article-body">
        <p className="text-xs uppercase tracking-[0.32em] text-[#6B7A3C] mb-3">Privacy</p>
        <h1 className="font-serif text-4xl text-[#1A2018]">Privacy Policy</h1>
        <p className="text-sm text-[#1A2018]/60 mb-10">
          Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>

        <h2>What we collect</h2>
        <p>
          Veteran Crisis collects standard server logs (IP address, user
          agent, page requested, timestamp) for security and analytics. We do
          not sell your data. We do not run third-party advertising trackers.
        </p>

        <h2>Cookies</h2>
        <p>
          We use a single essential cookie for the optional sign-in flow. We do
          not use cookies for cross-site tracking or behavioral advertising.
        </p>

        <h2>Affiliate links</h2>
        <p>
          As an Amazon Associate we earn from qualifying purchases when you
          click an Amazon link from our site and complete a purchase. The link
          tells Amazon that we referred you. Amazon’s privacy policy applies
          once you are on amazon.com. We do not collect your purchase details.
        </p>

        <h2>Email</h2>
        <p>
          If you email us, we keep that email so we can write back. We do not
          add you to any list. If you want us to delete the email after
          replying, ask in the email and we will.
        </p>

        <h2>Children</h2>
        <p>This site is not directed at children under 13 and does not knowingly collect data from them.</p>

        <h2>Contact</h2>
        <p>
          Questions about this policy can be sent through our contact page.
        </p>
      </article>
    </SiteShell>
  );
}
