"use client";

import Link from "next/link";
import { BookOpen, Clock, GraduationCap, ArrowRight } from "lucide-react";
import { getAllLessons } from "@/lib/academy";

export default function AcademyDashboard() {
  const lessons = getAllLessons();

  return (
    <main className="min-h-screen bg-[#080d18] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <p className="text-sm text-cyan-400">TILT LEARNING HUB</p>
          <h1 className="mt-2 text-3xl font-bold">Finance Academy</h1>
          <p className="mt-2 text-sm text-slate-400">
            Build financial knowledge through short, practical lessons linked to your simulator behaviour.
          </p>
        </div>

        <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-6">
          <div className="flex items-center gap-4">
            <GraduationCap className="h-10 w-10 text-cyan-400" />
            <div>
              <h2 className="text-xl font-semibold">Learn. Practise. Improve.</h2>
              <p className="mt-1 text-sm text-slate-400">
                Lessons map to Market Mirror indicators so you study the exact gaps your trades reveal.
              </p>
            </div>
          </div>
          <Link
            href="/trading"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-[#080d18] hover:bg-cyan-400"
          >
            Open simulator <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">All lessons</h2>
          <span className="text-sm text-slate-500">{lessons.length} lessons</span>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {lessons.map((lesson) => (
            <article
              key={lesson.id}
              className="flex flex-col rounded-2xl border border-white/10 bg-[#111a2b] p-6 transition hover:border-cyan-400/30"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold tracking-wide text-cyan-400">
                  {lesson.category}
                </span>
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-slate-400">
                  {lesson.level}
                </span>
              </div>

              <h3 className="mt-4 text-xl font-semibold">{lesson.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-400">{lesson.summary}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                {lesson.topics.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-300"
                  >
                    {topic}
                  </span>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  {lesson.estimatedMinutes} min
                </span>
                <Link
                  href={`/academy/${lesson.id}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-cyan-400 hover:text-cyan-300"
                >
                  Open lesson <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>

        <p className="text-xs text-slate-500">
          <BookOpen className="mr-1 inline h-3.5 w-3.5" />
          Education only — no stock tips or guaranteed returns.
        </p>
      </div>
    </main>
  );
}
