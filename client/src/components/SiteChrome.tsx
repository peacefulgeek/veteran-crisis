import { useState, type ReactNode } from "react";
import { Link } from "wouter";
import { Menu, X, Phone } from "lucide-react";

const NAV_ITEMS = [
  { href: "/articles", label: "Articles" },
  { href: "/assessments", label: "Self Check-Ins" },
  { href: "/supplements", label: "Herbs & Supplements" },
  { href: "/recommended", label: "Tools" },
  { href: "/about", label: "About" },
];

export function CrisisLineBar() {
  return (
    <div className="bg-[#1A2018] text-[#F6F4EE] text-xs md:text-sm">
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-2 flex flex-col sm:flex-row items-center justify-between gap-1">
        <span className="flex items-center gap-2">
          <Phone size={14} className="text-[#C9B27A]" />
          <span>If you are in crisis: dial <strong className="text-[#C9B27A]">988, then press 1</strong> — Veterans Crisis Line</span>
        </span>
        <span className="hidden sm:inline text-[#F6F4EE]/60">Or text <strong className="text-[#C9B27A]">838255</strong></span>
      </div>
    </div>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 bg-[#F6F4EE]/92 backdrop-blur-md border-b border-[#1A2018]/8">
      <nav className="max-w-7xl mx-auto px-5 md:px-8 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="font-serif text-xl md:text-2xl tracking-tight text-[#1A2018] hover:text-[#6B7A3C] transition-colors no-underline"
        >
          Veteran Crisis
        </Link>
        <ul className="hidden md:flex items-center gap-8">
          {NAV_ITEMS.map(item => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="text-[#1A2018]/80 hover:text-[#6B7A3C] transition-colors text-sm tracking-wide no-underline"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <button
          aria-label="Toggle menu"
          className="md:hidden text-[#1A2018]"
          onClick={() => setOpen(v => !v)}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>
      {open && (
        <div className="md:hidden border-t border-[#1A2018]/10 bg-[#F6F4EE]">
          <ul className="px-5 py-4 flex flex-col gap-3">
            {NAV_ITEMS.map(item => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block py-2 text-[#1A2018] hover:text-[#6B7A3C] no-underline"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-[#1A2018]/10 bg-[#EFEBDF] mt-24">
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-12 grid md:grid-cols-3 gap-10">
        <div>
          <p className="font-serif text-xl text-[#1A2018]">Veteran Crisis</p>
          <p className="text-sm text-[#1A2018]/70 mt-2 leading-relaxed">
            Honest, plainspoken writing on the long work of becoming yourself
            again on the other side of service.
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-[#6B7A3C] font-medium">Read</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            <li><Link href="/articles" className="text-[#1A2018]/80 hover:text-[#6B7A3C] no-underline">All Articles</Link></li>
            <li><Link href="/recommended" className="text-[#1A2018]/80 hover:text-[#6B7A3C] no-underline">Tools We Recommend</Link></li>
            <li><Link href="/author/the-oracle-lover" className="text-[#1A2018]/80 hover:text-[#6B7A3C] no-underline">About the Author</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-[#6B7A3C] font-medium">Site</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            <li><Link href="/about" className="text-[#1A2018]/80 hover:text-[#6B7A3C] no-underline">About</Link></li>
            <li><Link href="/contact" className="text-[#1A2018]/80 hover:text-[#6B7A3C] no-underline">Contact</Link></li>
            <li><Link href="/privacy" className="text-[#1A2018]/80 hover:text-[#6B7A3C] no-underline">Privacy</Link></li>
            <li><Link href="/disclosures" className="text-[#1A2018]/80 hover:text-[#6B7A3C] no-underline">Disclosures</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[#1A2018]/10 px-5 md:px-8 py-6 text-center text-xs text-[#1A2018]/60">
        © {new Date().getFullYear()} Veteran Crisis. Written by The Oracle Lover. As an Amazon Associate we earn from qualifying purchases.
      </div>
    </footer>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F6F4EE] text-[#1A2018] font-sans antialiased">
      <CrisisLineBar />
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
