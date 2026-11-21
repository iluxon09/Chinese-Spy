"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Clock, GraduationCap } from "lucide-react";
import { getAllLessons } from "@/lib/member4/academy/index";

const indicatorLabels: Record<string, string> = {
  fomo: "FOMO",
  overtrading: "Overtrading",
  concentration: "Concentration",
  panic_selling: "Panic selling",
};

export default function AcademyDashboard() {
  const lessons = getAllLessons();

  return (
    <main className="terminal-subpage min-h-screen bg-[#080d18] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header>
          <p className="text-sm text-cyan-400">TILT LEARNING HUB</p>
          <h1 className="mt-2 text-3xl font-bold">Finance Academy</h1>
          <p className="mt-2 text-sm text-slate-400">
            Build financial knowledge through concise lessons, practical examples and knowledge checks.
          </p>
        </header>

        <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-6">
          <div className="flex items-center gap-4">
            <GraduationCap className="h-10 w-10 shrink-0 text-cyan-400" />
            <div>
              <h2 className="text-xl font-semibold">Learn. Practise. Improve.</h2>
              <p className="mt-1 text-sm text-slate-400">
                Learn the principles behind risk, portfolio construction and trading behaviour.
              </p>
            </div>
          </div>
          <Link
            href="/trading"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950"
          >
            Practise Trading <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Available lessons</h2>
            <p className="mt-1 text-sm text-slate-400">
              Stable lesson IDs are shared with the behavioural recommendation contract.
            </p>
          </div>
          <span className="shrink-0 text-sm text-slate-500">{lessons.length} lessons</span>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {lessons.map((lesson) => (
            <article
              key={lesson.id}
              className="rounded-2xl border border-white/10 bg-[#111a2b] p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-cyan-400">
                  {lesson.id.replaceAll("_", " ")}
                </span>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-400">
                  {lesson.estimatedMinutes} min
                </span>
              </div>
              <h3 className="mt-4 text-xl font-semibold">{lesson.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">{lesson.summary}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                {lesson.relatedIndicators.map((indicator) => (
                  <span
                    key={indicator}
                    className="rounded-lg bg-cyan-400/10 px-3 py-2 text-xs text-cyan-200"
                  >
                    {indicatorLabels[indicator] ?? indicator}
                  </span>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                <span className="flex items-center gap-2 text-xs text-slate-400">
                  <Clock className="h-4 w-4" />
                  Knowledge check included
                </span>
                <Link
                  href={`/academy/${lesson.id}`}
                  className="flex items-center gap-2 text-sm font-medium text-cyan-400"
                >
                  Open lesson <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#111a2b] p-6">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-cyan-400" />
            <h2 className="text-lg font-semibold">Learning tip</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Treat the simulator as a place to test a decision process, not to chase a particular return.
            The lessons are educational and do not constitute investment advice.
          </p>
        </section>
      </div>
    </main>
  );
}
