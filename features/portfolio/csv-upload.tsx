"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Download,
  X,
} from "lucide-react";
import {
  getCsvTemplate,
  parseTransactionCsv,
  type CsvParseResult,
} from "@/lib/member4/import/index";

const money = (value: number | undefined) =>
  value === undefined
    ? "—"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
      }).format(value);

export default function CSVUpload() {
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<CsvParseResult | null>(null);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    event.target.value = "";
    setError("");
    setResult(null);
    setFileName("");

    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith(".csv")) {
      setError("Please select a CSV file.");
      return;
    }
    if (selected.size > 2 * 1024 * 1024) {
      setError("The file is larger than the 2 MB preview limit.");
      return;
    }

    setReading(true);
    setFileName(selected.name);
    try {
      const text = await selected.text();
      setResult(parseTransactionCsv(text));
    } catch (caught) {
      setFileName("");
      setError(caught instanceof Error ? caught.message : "Unable to parse this CSV file.");
    } finally {
      setReading(false);
    }
  }

  function downloadTemplate() {
    const blob = new Blob([getCsvTemplate()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "tilt-transaction-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function clearFile() {
    setFileName("");
    setResult(null);
    setError("");
  }

  return (
    <main className="min-h-screen bg-[#080d18] px-5 py-8 text-white md:px-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/portfolio" className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400">
          <ArrowLeft size={16} /> Back to Portfolio
        </Link>

        <header className="mb-8">
          <div className="mb-3 flex items-center gap-2 text-blue-400">
            <FileSpreadsheet size={20} />
            <span className="text-sm font-semibold uppercase tracking-wider">Portfolio CSV preview</span>
          </div>
          <h1 className="text-3xl font-bold md:text-4xl">Validate a transaction statement.</h1>
          <p className="mt-3 text-slate-400">
            Review recognised trades and row-level errors before any future import workflow.
          </p>
        </header>

        <section className="rounded-2xl border border-white/10 bg-[#111a2b] p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Choose a CSV file</h2>
              <p className="mt-1 text-sm text-slate-400">Maximum file size: 2 MB</p>
            </div>
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5"
            >
              <Download size={16} /> Download template
            </button>
          </div>

          <label
            htmlFor="csv-file"
            className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/20 bg-[#0b1322] px-6 py-12 text-center hover:border-blue-500"
          >
            <div className="mb-4 rounded-full bg-blue-500/10 p-4">
              <Upload size={28} className="text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold">Browse for a CSV file</h3>
            <p className="mt-2 text-sm text-slate-400">
              Required columns: date, symbol, side, quantity and price
            </p>
            <span className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold">
              Choose file
            </span>
            <input
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={handleFile}
            />
          </label>

          {error && (
            <div role="alert" className="mt-5 flex items-center gap-2 rounded-lg bg-red-500/10 p-4 text-sm text-red-300">
              <AlertCircle size={18} /> {error}
            </div>
          )}

          {fileName && (
            <div className="mt-5 flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#0b1322] p-4">
              <div className="flex min-w-0 items-center gap-3">
                <FileSpreadsheet className="shrink-0 text-green-400" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{fileName}</p>
                  <p className="text-xs text-slate-500">
                    {reading ? "Reading and validating…" : "Local preview"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={clearFile}
                aria-label="Clear selected file"
                className="rounded p-2 text-slate-400 hover:bg-white/5"
              >
                <X size={18} />
              </button>
            </div>
          )}
        </section>

        {result && (
          <>
            <section className="mt-6 grid gap-4 sm:grid-cols-3">
              <SummaryCard label="Valid rows" value={result.valid.length} tone="green" />
              <SummaryCard label="Invalid rows" value={result.invalid.length} tone={result.invalid.length ? "red" : "green"} />
              <SummaryCard label="Recognised columns" value={result.recognisedColumns.length} tone="blue" />
            </section>

            {result.ignoredColumns.length > 0 && (
              <p className="mt-4 text-xs text-slate-500">
                Ignored columns: {result.ignoredColumns.join(", ")}
              </p>
            )}

            {result.valid.length > 0 && (
              <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#111a2b]">
                <div className="flex items-center gap-2 border-b border-white/10 p-5">
                  <CheckCircle2 className="text-green-400" size={20} />
                  <div>
                    <h2 className="font-semibold">Valid transaction rows</h2>
                    <p className="mt-1 text-xs text-slate-400">Validated preview only — nothing has been written to Supabase.</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="text-xs text-slate-500">
                      <tr>
                        <th className="p-4">Date</th>
                        <th>Symbol</th>
                        <th>Side</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Charges</th>
                        <th>Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.valid.map((transaction) => (
                        <tr key={transaction.id} className="border-t border-white/5">
                          <td className="p-4">{new Date(transaction.timestamp).toLocaleDateString("en-IN")}</td>
                          <td className="font-semibold">{transaction.symbol}</td>
                          <td className={transaction.side === "BUY" ? "text-emerald-400" : "text-red-400"}>{transaction.side}</td>
                          <td>{transaction.quantity}</td>
                          <td>{money(transaction.price)}</td>
                          <td>{money(transaction.charges)}</td>
                          <td className="max-w-48 truncate text-slate-400">{transaction.note ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {result.invalid.length > 0 && (
              <section className="mt-6 overflow-hidden rounded-2xl border border-red-400/20 bg-[#111a2b]">
                <div className="flex items-center gap-2 border-b border-white/10 p-5">
                  <AlertCircle className="text-red-400" size={20} />
                  <div>
                    <h2 className="font-semibold">Rows requiring correction</h2>
                    <p className="mt-1 text-xs text-slate-400">Invalid rows are excluded from the valid preview.</p>
                  </div>
                </div>
                <div className="divide-y divide-white/5">
                  {result.invalid.map((row) => (
                    <div key={row.rowIndex} className="p-4">
                      <p className="text-sm font-semibold text-red-300">Data row {row.rowIndex}</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-400">
                        {row.messages.map((message) => <li key={message}>{message}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <p className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs leading-5 text-amber-100/80">
          Safety boundary: this module validates and previews CSV rows only. It does not import historical trades,
          change cash or holdings, or create transactions in the authenticated simulation.
        </p>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "red" | "blue";
}) {
  const styles = {
    green: "text-green-400",
    red: "text-red-400",
    blue: "text-blue-400",
  };
  return (
    <article className="rounded-2xl border border-white/10 bg-[#111a2b] p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`mt-3 text-2xl font-bold ${styles[tone]}`}>{value}</p>
    </article>
  );
}
