import { useState } from "react";
import { SiteShell } from "@/components/SiteChrome";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      if (!r.ok) throw new Error("Failed");
      setStatus("ok");
      setName(""); setEmail(""); setMessage("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <SiteShell>
      <article className="max-w-[720px] mx-auto px-5 md:px-0 py-24">
        <p className="text-xs uppercase tracking-[0.32em] text-[#6B7A3C] mb-3">Contact</p>
        <h1 className="font-serif text-4xl text-[#1A2018]">Get in touch.</h1>
        <p className="text-[#1A2018]/80 mt-5 leading-relaxed">
          Notes, corrections, story ideas, and questions are all welcome. We
          read every email. We won’t add you to any list.
        </p>
        <form onSubmit={submit} className="mt-10 space-y-5">
          <div>
            <label className="text-sm text-[#1A2018]/80">Your name</label>
            <input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-md border border-[#1A2018]/15 bg-[#F6F4EE] focus:outline-none focus:border-[#6B7A3C]"
            />
          </div>
          <div>
            <label className="text-sm text-[#1A2018]/80">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-md border border-[#1A2018]/15 bg-[#F6F4EE] focus:outline-none focus:border-[#6B7A3C]"
            />
          </div>
          <div>
            <label className="text-sm text-[#1A2018]/80">Message</label>
            <textarea
              required
              rows={6}
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-md border border-[#1A2018]/15 bg-[#F6F4EE] focus:outline-none focus:border-[#6B7A3C]"
            />
          </div>
          <button
            type="submit"
            disabled={status === "sending"}
            className="px-7 py-3 bg-[#6B7A3C] hover:bg-[#7A8A45] text-[#F6F4EE] tracking-wide rounded-full transition-all"
          >
            {status === "sending" ? "Sending…" : "Send"}
          </button>
          {status === "ok" && (
            <p className="text-sm text-[#6B7A3C]">Got it. We’ll get back to you.</p>
          )}
          {status === "error" && (
            <p className="text-sm text-red-600">Something went wrong. Please try again.</p>
          )}
        </form>
      </article>
    </SiteShell>
  );
}
