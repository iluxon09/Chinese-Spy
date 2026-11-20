"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";
import { getLessonById } from "@/lib/academy";

export default function LessonPage() {
  const params = useParams<{ lessonid: string }>();
  // Support both [lessonid] and legacy lesson-N style if needed
  const rawId = (params.lessonid ?? "").toString();
  const lesson = getLessonById(rawId);

  if (!lesson) {
    return (
      <main className="min-h-screen bg-[#080d18] p-8 text-white">
        <h1 className="text-2xl font-bold">Lesson not found</h1>
        <p className="mt-2 text-sm text-slate-400">
          No lesson with id “{rawId}”.
        </p>
        <Link href="/academy" className="mt-4 inline-block text-cyan-400">
          Return to Academy
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080d18] px-5 py-8 text-white md:px-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/academy"
          className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to Academy
        </Link>

        <div className="mb-8 rounded-2xl border border-white/10 bg-[#111a2b] p-7">
          <div className="mb-4 flex items-center gap-2 text-sm text-cyan-400">
            <BookOpen size={17} />
            {lesson.category} · {lesson.level}
          </div>

          <h1 className="text-3xl font-bold">{lesson.title}</h1>
          <p className="mt-3 text-sm text-slate-400">
            {lesson.estimatedMinutes} min read
          </p>
          <p className="mt-4 text-sm leading-7 text-slate-300">{lesson.summary}</p>
        </div>

        <section className="mb-6 rounded-xl border border-white/10 bg-[#111a2b] p-6">
          <h2 className="mb-3 text-lg font-semibold">Explanation</h2>
          <p className="text-sm leading-7 text-slate-300">{lesson.explanation}</p>
        </section>

        <section className="mb-6 rounded-xl border border-white/10 bg-[#111a2b] p-6">
          <h2 className="mb-3 text-lg font-semibold">Practical example</h2>
          <p className="text-sm leading-7 text-slate-300">{lesson.practicalExample}</p>
        </section>

        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-6">
          <div className="mb-3 flex items-center gap-2 font-semibold text-blue-400">
            <Lightbulb size={18} />
            Key Takeaway
          </div>
          <p className="text-sm leading-7 text-slate-300">{lesson.keyTakeaway}</p>
        </div>

        {lesson.quiz && (
          <Quiz
            question={lesson.quiz.question}
            options={lesson.quiz.options}
            correctIndex={lesson.quiz.correctIndex}
            explanation={lesson.quiz.explanation}
          />
        )}

        <Link
          href="/academy"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-3 text-sm font-semibold text-[#080d18] hover:bg-cyan-400"
        >
          <CheckCircle2 size={17} />
          Finish Lesson
        </Link>
      </div>
    </main>
  );
}

function Quiz({
  question,
  options,
  correctIndex,
  explanation,
}: {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <section className="mt-6 rounded-xl border border-white/10 bg-[#111a2b] p-6">
      <h2 className="mb-4 text-lg font-semibold">Knowledge Check</h2>
      <p className="mb-5 text-sm text-slate-300">{question}</p>

      <div className="space-y-3">
        {options.map((option, index) => (
          <button
            key={option}
            type="button"
            onClick={() => setSelected(index)}
            className={`w-full rounded-lg border p-4 text-left text-sm transition ${
              selected === index
                ? "border-cyan-500 bg-cyan-500/10"
                : "border-white/10 bg-[#0b1322] hover:border-white/30"
            }`}
          >
            {String.fromCharCode(65 + index)}. {option}
          </button>
        ))}
      </div>

      {selected !== null && (
        <div
          className={`mt-5 space-y-2 rounded-lg p-4 text-sm ${
            selected === correctIndex
              ? "bg-green-500/10 text-green-400"
              : "bg-amber-500/10 text-amber-400"
          }`}
        >
          <p>
            {selected === correctIndex
              ? "Correct! Well done."
              : "Not quite. Review the lesson and try again."}
          </p>
          <p className="text-slate-300">{explanation}</p>
        </div>
      )}
    </section>
  );
}
