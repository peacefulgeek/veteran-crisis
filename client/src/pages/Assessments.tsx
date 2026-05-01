import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  Compass, Moon, Sun, Heart, Briefcase, Flag, Wallet,
  Activity, Star, Users, Shield, ChevronRight, ChevronLeft, ArrowRight,
} from "lucide-react";
import { SiteShell } from "@/components/SiteChrome";

type Assessment = {
  id: string;
  title: string;
  sub: string;
  icon: string;
  questions: string[];
};

const ICONS: Record<string, any> = {
  compass: Compass, moon: Moon, sun: Sun, heart: Heart, briefcase: Briefcase,
  flag: Flag, wallet: Wallet, activity: Activity, star: Star, users: Users, shield: Shield,
};

function tierFor(score: number, total: number) {
  const pct = score / total;
  if (pct >= 0.8) return {
    label: "Solid Ground",
    body: "You are standing on real footing right now. The work ahead is to keep what is already steady steady, and to extend the same care to the places that need a little more attention.",
    accent: "#6B7A3C",
  };
  if (pct >= 0.55) return {
    label: "Mostly Steady",
    body: "Most of you is in good shape and there are a couple of patterns worth a closer look. None of it is alarming. Pick the one question you answered \u201cno\u201d to that bothers you most and start there.",
    accent: "#A8985A",
  };
  if (pct >= 0.3) return {
    label: "Wobble Showing",
    body: "There is a real wobble showing up here, and it deserves attention before it gets bigger. This is exactly the kind of moment a check-in is for. Read the article that goes with this assessment and pick one small action this week.",
    accent: "#B47A4A",
  };
  return {
    label: "Time For Support",
    body: "You answered honestly and the picture matters. Please consider talking to a trusted friend, a VSO, or your VA primary care this week \u2014 not because something is broken, but because the load is heavier than one person should carry alone.",
    accent: "#8C3B2E",
  };
}

function AssessmentCard({ a, onPick }: { a: Assessment; onPick: () => void }) {
  const Icon = ICONS[a.icon] || Compass;
  return (
    <button
      onClick={onPick}
      className="text-left bg-white border border-[#1A2018]/10 rounded-2xl p-7 hover:border-[#6B7A3C]/40 hover:shadow-[0_4px_24px_-8px_rgba(107,122,60,0.25)] transition-all group"
    >
      <div className="w-12 h-12 rounded-full bg-[#E8EDE0] text-[#6B7A3C] flex items-center justify-center mb-5 group-hover:bg-[#6B7A3C] group-hover:text-white transition-colors">
        <Icon size={22} />
      </div>
      <h3 className="font-serif text-xl text-[#1A2018] mb-2">{a.title}</h3>
      <p className="text-sm text-[#1A2018]/70 leading-relaxed">{a.sub}</p>
      <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#6B7A3C]">
        Begin <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
      </div>
    </button>
  );
}

function Quiz({ a, onClose }: { a: Assessment; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>(Array(a.questions.length).fill(false));
  const done = idx >= a.questions.length;
  const score = answers.filter(Boolean).length;
  const tier = tierFor(score, a.questions.length);

  function answer(yes: boolean) {
    const next = [...answers];
    next[idx] = yes;
    setAnswers(next);
    setIdx(idx + 1);
  }

  if (done) {
    return (
      <div className="bg-white rounded-2xl border border-[#1A2018]/10 p-8 md:p-12 max-w-2xl mx-auto">
        <div className="text-xs uppercase tracking-widest text-[#6B7A3C]">Your Reading</div>
        <h2 className="font-serif text-3xl md:text-4xl text-[#1A2018] mt-3" style={{ color: tier.accent }}>
          {tier.label}
        </h2>
        <p className="mt-2 text-sm text-[#1A2018]/60">
          You answered <strong>{score}</strong> of <strong>{a.questions.length}</strong> with a yes.
        </p>
        <p className="mt-6 text-[17px] leading-[1.75] text-[#1A2018]/85">{tier.body}</p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => { setIdx(0); setAnswers(Array(a.questions.length).fill(false)); }}
            className="px-5 py-3 border border-[#1A2018]/20 rounded-full text-sm hover:bg-[#1A2018]/5"
          >
            Retake
          </button>
          <Link
            href="/articles"
            className="px-5 py-3 rounded-full bg-[#6B7A3C] text-white text-sm hover:bg-[#5a6932] no-underline text-center"
          >
            Read related articles
          </Link>
          <button
            onClick={onClose}
            className="px-5 py-3 border border-[#1A2018]/20 rounded-full text-sm hover:bg-[#1A2018]/5"
          >
            Try a different check-in
          </button>
        </div>
        <p className="mt-8 text-xs text-[#1A2018]/55 leading-relaxed">
          This is a reflective tool, not a clinical assessment. If you are in crisis,
          dial <strong className="text-[#1A2018]">988, then press 1</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#1A2018]/10 p-8 md:p-12 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-7">
        <div className="text-xs uppercase tracking-widest text-[#6B7A3C]">{a.title}</div>
        <div className="text-xs text-[#1A2018]/55">{idx + 1} / {a.questions.length}</div>
      </div>
      <div className="h-1 bg-[#1A2018]/8 rounded-full mb-8">
        <div
          className="h-1 rounded-full bg-[#6B7A3C] transition-all"
          style={{ width: `${(idx / a.questions.length) * 100}%` }}
        />
      </div>
      <p className="font-serif text-2xl md:text-3xl text-[#1A2018] leading-snug">{a.questions[idx]}</p>
      <div className="mt-10 flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => answer(true)}
          className="flex-1 px-6 py-4 rounded-full bg-[#6B7A3C] text-white hover:bg-[#5a6932] flex items-center justify-center gap-2 font-medium"
        >
          Yes, mostly true <ChevronRight size={16} />
        </button>
        <button
          onClick={() => answer(false)}
          className="flex-1 px-6 py-4 rounded-full bg-white border border-[#1A2018]/20 text-[#1A2018] hover:bg-[#1A2018]/5 flex items-center justify-center gap-2 font-medium"
        >
          Not really <ChevronRight size={16} />
        </button>
      </div>
      <div className="mt-6 flex items-center justify-between text-xs text-[#1A2018]/55">
        <button onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0} className="flex items-center gap-1 disabled:opacity-30">
          <ChevronLeft size={14} /> back
        </button>
        <button onClick={onClose} className="hover:text-[#1A2018]">cancel</button>
      </div>
    </div>
  );
}

export default function Assessments() {
  const [items, setItems] = useState<Assessment[]>([]);
  const [active, setActive] = useState<Assessment | null>(null);

  useEffect(() => {
    fetch("/api/assessments")
      .then(r => r.json())
      .then(d => setItems(d.assessments || []))
      .catch(() => setItems([]));
  }, []);

  return (
    <SiteShell>
      {/* HERO */}
      <section className="relative pt-12 md:pt-20 pb-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#F6F4EE] via-[#EFEBDF] to-[#E8EDE0]" />
        <div className="relative max-w-4xl mx-auto px-5 md:px-8 text-center">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#6B7A3C] mb-5">
            <span className="h-px w-8 bg-[#6B7A3C]" /> Self Check-Ins <span className="h-px w-8 bg-[#6B7A3C]" />
          </div>
          <h1 className="font-serif text-4xl md:text-6xl text-[#1A2018] leading-[1.05]">
            Eleven honest ways<br />to take your own measure.
          </h1>
          <p className="mt-7 text-lg md:text-xl text-[#1A2018]/75 leading-relaxed max-w-2xl mx-auto">
            These are not clinical tests. They are reflective questions designed to give you a clear,
            kind reading of where you actually are right now \u2014 and one small next step.
          </p>
        </div>
      </section>

      {/* GRID OR ACTIVE QUIZ */}
      <section className="pb-24">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          {active ? (
            <Quiz a={active} onClose={() => setActive(null)} />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map(a => (
                <AssessmentCard key={a.id} a={a} onPick={() => setActive(a)} />
              ))}
            </div>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
