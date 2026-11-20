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

const lessons = [
  {
    title: "Understanding the Stock Market",
    duration: "8 min",
    sections: [
      {
        heading: "What is the stock market?",
        content:
          "The stock market is a marketplace where investors buy and sell shares of publicly listed companies. A share represents a small ownership stake in a company.",
      },
      {
        heading: "How do stock prices move?",
        content:
          "Prices change based on demand and supply. Company performance, economic conditions, industry trends and investor expectations can all influence prices.",
      },
      {
        heading: "Key terms",
        content:
          "A stock exchange is a marketplace for trading shares. An IPO is when a company first offers shares to the public. A portfolio is a collection of investments.",
      },
    ],
    takeaway:
      "Stock prices reflect changing expectations, demand and supply.",
    question: "What does owning a company's share represent?",
    options: [
      "A small ownership stake",
      "A guaranteed profit",
      "A loan to the government",
    ],
    answer: 0,
  },
  {
    title: "Risk and Diversification",
    duration: "10 min",
    sections: [
      {
        heading: "Understanding investment risk",
        content:
          "Risk is the possibility that an investment may lose value or perform differently than expected. Different assets carry different levels of risk.",
      },
      {
        heading: "What is diversification?",
        content:
          "Diversification means spreading investments across different companies, sectors or asset classes instead of depending on a single investment.",
      },
      {
        heading: "Why does it matter?",
        content:
          "A diversified portfolio can reduce the impact of poor performance in one investment. It does not eliminate risk or guarantee returns.",
      },
    ],
    takeaway:
      "Diversification helps manage concentration risk, but cannot eliminate market risk.",
    question: "What is the main purpose of diversification?",
    options: [
      "Guarantee profits",
      "Reduce dependence on one investment",
      "Avoid all market fluctuations",
    ],
    answer: 1,
  },
  {
    title: "Avoiding Emotional Decisions",
    duration: "7 min",
    sections: [
      {
        heading: "The psychology of investing",
        content:
          "Fear, excitement and social pressure can influence investment decisions. Investors may buy because others are buying or sell because markets are falling.",
      },
      {
        heading: "Common behavioural biases",
        content:
          "FOMO can lead to rushed decisions. Panic selling can lead to decisions driven by short-term fear. Overconfidence can cause investors to underestimate risk.",
      },
      {
        heading: "Building discipline",
        content:
          "Set clear investment goals, understand your risk tolerance and review decisions using evidence rather than short-term emotions.",
      },
    ],
    takeaway:
      "A consistent, evidence-based process can help reduce emotional decision-making.",
    question: "FOMO in investing refers to:",
    options: [
      "Fear of missing out",
      "A market index",
      "A type of mutual fund",
    ],
    answer: 0,
  },
  {
    title: "Fundamentals of Long-Term Investing",
    duration: "9 min",
    sections: [
      {
        heading: "Think beyond short-term movements",
        content:
          "Long-term investing focuses on financial goals over an extended period rather than reacting to every short-term market movement.",
      },
      {
        heading: "Understand what you invest in",
        content:
          "Before investing, study a company's business model, financial health, competitive position and potential risks.",
      },
      {
        heading: "Consistency and patience",
        content:
          "A disciplined approach involves regular reviews, realistic expectations and avoiding decisions based only on short-term price changes.",
      },
    ],
    takeaway:
      "Understand the investment, define your goals and maintain a disciplined approach.",
    question: "What is central to long-term investing?",
    options: [
      "Reacting to every price movement",
      "Following every trending stock",
      "A disciplined approach aligned with goals",
    ],
    answer: 2,
  },
];

export default function LessonPage() {
  const params = useParams<{ lessonId: string }>();
  const lessonNumber = Number(
    params.lessonId.replace("lesson-", "")
  );
  const lesson = lessons[lessonNumber - 1];

  if (!lesson) {
    return (
      <main className="min-h-screen bg-[#080d18] p-8 text-white">
        <h1 className="text-2xl font-bold">Lesson not found</h1>
        <Link
          href="/academy"
          className="mt-4 inline-block text-blue-400"
        >
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
          <div className="mb-4 flex items-center gap-2 text-sm text-blue-400">
            <BookOpen size={17} />
            ACADEMY LESSON {lessonNumber}
          </div>

          <h1 className="text-3xl font-bold">
            {lesson.title}
          </h1>

          <p className="mt-3 text-sm text-slate-400">
            {lesson.duration} read
          </p>
        </div>

        <div className="space-y-5">
          {lesson.sections.map((section, index) => (
            <section
              key={section.heading}
              className="rounded-xl border border-white/10 bg-[#111a2b] p-6"
            >
              <h2 className="mb-3 text-lg font-semibold">
                {index + 1}. {section.heading}
              </h2>

              <p className="text-sm leading-7 text-slate-300">
                {section.content}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-blue-500/20 bg-blue-500/5 p-6">
          <div className="mb-3 flex items-center gap-2 font-semibold text-blue-400">
            <Lightbulb size={18} />
            Key Takeaway
          </div>

          <p className="text-sm leading-7 text-slate-300">
            {lesson.takeaway}
          </p>
        </div>

        {/* QUIZ SECTION */}
        <Quiz
          question={lesson.question}
          options={lesson.options}
          answer={lesson.answer}
        />

        <Link
          href="/academy"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500"
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
  answer,
}: {
  question: string;
  options: string[];
  answer: number;
}) {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <section className="mt-6 rounded-xl border border-white/10 bg-[#111a2b] p-6">
      <h2 className="mb-4 text-lg font-semibold">
        Knowledge Check
      </h2>

      <p className="mb-5 text-sm text-slate-300">
        {question}
      </p>

      <div className="space-y-3">
        {options.map((option, index) => (
          <button
            key={option}
            onClick={() => setSelected(index)}
            className={`w-full rounded-lg border p-4 text-left text-sm transition ${
              selected === index
                ? "border-blue-500 bg-blue-500/10"
                : "border-white/10 bg-[#0b1322] hover:border-white/30"
            }`}
          >
            {String.fromCharCode(65 + index)}. {option}
          </button>
        ))}
      </div>

      {selected !== null && (
        <div
          className={`mt-5 rounded-lg p-4 text-sm ${
            selected === answer
              ? "bg-green-500/10 text-green-400"
              : "bg-amber-500/10 text-amber-400"
          }`}
        >
          {selected === answer
            ? "Correct! Well done."
            : "Not quite. Review the lesson and try again."}
        </div>
      )}
    </section>
  );
}