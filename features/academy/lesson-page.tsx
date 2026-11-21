"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, BookOpen, CheckCircle2, Lightbulb } from "lucide-react";
import { getLessonById } from "@/lib/member4/academy/index";
import type { LessonId } from "@/lib/member4/types/shared";

export default function LessonPage() {
  const params = useParams<{ lessonId: string }>();
  const lesson = getLessonById(params.lessonId as LessonId);

  if (!lesson) {
    return (
      <main className="terminal-subpage min-h-screen bg-[#080d18] p-8 text-white">
        <h1 className="text-2xl font-bold">Lesson not found</h1>
        <Link href="/academy" className="mt-4 inline-block text-cyan-400">
          Return to Academy
        </Link>
      </main>
    );
  }

  return (
    <main className="terminal-subpage min-h-screen bg-[#080d18] px-5 py-8 text-white md:px-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/academy" className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400">
          <ArrowLeft size={16} /> Back to Academy
        </Link>

        <header className="mb-8 rounded-2xl border border-white/10 bg-[#111a2b] p-7">
          <div className="mb-4 flex items-center gap-2 text-sm text-cyan-400">
            <BookOpen size={17} /> FINANCE ACADEMY · {lesson.id.toUpperCase()}
          </div>
          <h1 className="text-3xl font-bold">{lesson.title}</h1>
          <p className="mt-3 text-sm text-slate-400">
            {lesson.estimatedMinutes} minute lesson
          </p>
          <p className="mt-4 text-sm leading-6 text-slate-300">{lesson.summary}</p>
        </header>

        <section className="rounded-xl border border-white/10 bg-[#111a2b] p-6">
          <h2 className="mb-3 text-lg font-semibold">The concept</h2>
          <p className="whitespace-pre-line text-sm leading-7 text-slate-300">{lesson.explanation}</p>
        </section>

        <section className="mt-5 rounded-xl border border-white/10 bg-[#111a2b] p-6">
          <h2 className="mb-3 text-lg font-semibold">Practical example</h2>
          <p className="whitespace-pre-line text-sm leading-7 text-slate-300">{lesson.practicalExample}</p>
        </section>

        <section className="mt-5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-6">
          <div className="mb-3 flex items-center gap-2 font-semibold text-cyan-300">
            <Lightbulb size={18} /> Key takeaway
          </div>
          <p className="text-sm leading-7 text-slate-200">{lesson.keyTakeaway}</p>
        </section>

        {lesson.quiz && (
          <Quiz
            key={lesson.id}
            question={lesson.quiz.question}
            options={lesson.quiz.options}
            answer={lesson.quiz.correctIndex}
            explanation={lesson.quiz.explanation}
          />
        )}

        <Link
          href="/academy"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950"
        >
          <CheckCircle2 size={17} /> Finish lesson
        </Link>
      </div>
    </main>
  );
}

function Quiz({
  question,
  options,
  answer,
  explanation,
}: {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  return (
    <section className="mt-6 rounded-xl border border-white/10 bg-[#111a2b] p-6">
      <h2 className="mb-4 text-lg font-semibold">Knowledge check</h2>
      <p className="mb-5 text-sm leading-6 text-slate-300">{question}</p>
      <div className="space-y-3">
        {options.map((option, index) => (
          <button
            key={option}
            type="button"
            disabled={submitted}
            aria-pressed={selected === index}
            onClick={() => setSelected(index)}
            className={`w-full rounded-lg border p-4 text-left text-sm transition disabled:cursor-default ${
              selected === index
                ? "border-cyan-500 bg-cyan-500/10 text-white"
                : "border-white/10 bg-[#0b1322] text-slate-300 hover:bg-white/5"
            }`}
          >
            {String.fromCharCode(65 + index)}. {option}
          </button>
        ))}
      </div>
      {!submitted ? (
        <button
          type="button"
          disabled={selected === null}
          onClick={() => setSubmitted(true)}
          className="mt-5 rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Check answer
        </button>
      ) : (
        <div
          role="status"
          className={`mt-5 rounded-lg p-4 text-sm ${
            selected === answer
              ? "bg-green-500/10 text-green-300"
              : "bg-amber-500/10 text-amber-300"
          }`}
        >
          <p className="font-semibold">
            {selected === answer ? "Correct!" : "Not quite. Review the explanation below."}
          </p>
          <p className="mt-2 leading-6">{explanation}</p>
        </div>
      )}
    </section>
  );
}
