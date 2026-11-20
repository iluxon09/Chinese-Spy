"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertTriangle,
  Download,
} from "lucide-react";
import {
  parseTransactionCsv,
  getCsvTemplate,
  formatPaiseAsRupees,
  type CsvParseResult,
} from "@/lib/import";

export default function CSVUpload() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<CsvParseResult | null>(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const processText = useCallback((text: string, name: string) => {
    setError("");
    setFileName(name);
    try {
      const parsed = parseTransactionCsv(text);
      setResult(parsed);
      if (parsed.valid.length === 0 && parsed.invalid.length === 0) {
        setError("No data rows found in the file.");
      }
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "Failed to parse CSV");
    }
  }, []);

  const onFile = useCallback(
    (file: File | null) => {
      if (!file) return;
      if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
        setError("Please upload a .csv file.");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setError("File too large (max 2 MB for this prototype).");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        processText(String(reader.result ?? ""), file.name);
      };
      reader.onerror = () => setError("Could not read the file.");
      reader.readAsText(file);
    },
    [processText],
  );

  const clear = () => {
    setFileName(null);
    setResult(null);
    setError("");
  };

  const downloadTemplate = () => {
    const blob = new Blob([getCsvTemplate()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tilt-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-[#080d18] px-5 py-8 text-white md:px-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/portfolio"
          className="mb-7 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
        >
          <ArrowLeft size={16} /> Back to Portfolio
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold">Import trade history</h1>
          <p className="mt-2 text-sm text-slate-400">
            Upload a CSV of past trades for Market Mirror analysis. Invalid rows
            are never imported silently — you always see what failed.
          </p>
        </div>

        <div className="mb-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#111a2b] px-4 py-2 text-sm text-slate-200 hover:border-cyan-400/40"
          >
            <Download size={16} /> Download template
          </button>
          <span className="self-center text-xs text-slate-500">
            Required: date, symbol, side, quantity, price · Optional: charges, note, id
          </span>
        </div>

        <section
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            onFile(e.dataTransfer.files?.[0] ?? null);
          }}
          className={`rounded-2xl border-2 border-dashed p-10 text-center transition ${
            dragOver
              ? "border-cyan-400 bg-cyan-400/5"
              : "border-white/15 bg-[#111a2b]"
          }`}
        >
          <Upload className="mx-auto h-10 w-10 text-slate-500" />
          <p className="mt-4 text-sm text-slate-300">
            Drag & drop a CSV here, or choose a file
          </p>
          <label className="mt-4 inline-block cursor-pointer rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-[#080d18] hover:bg-cyan-400">
            Select CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </section>

        {error && (
          <div className="mt-4 flex gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            <AlertTriangle size={18} className="shrink-0" />
            {error}
          </div>
        )}

        {fileName && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-[#111a2b] px-4 py-3">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="text-cyan-400" size={20} />
              <div>
                <p className="text-sm font-medium">{fileName}</p>
                {result && (
                  <p className="text-xs text-slate-500">
                    {result.valid.length} valid · {result.invalid.length} invalid
                  </p>
                )}
              </div>
            </div>
            <button type="button" onClick={clear} className="text-slate-400 hover:text-white">
              <X size={18} />
            </button>
          </div>
        )}

        {result && result.valid.length > 0 && (
          <section className="mt-6 rounded-2xl border border-white/10 bg-[#111a2b] p-6">
            <div className="mb-5 flex items-center gap-2">
              <CheckCircle2 className="text-green-400" size={20} />
              <h2 className="text-lg font-semibold">
                Valid trades ({result.valid.length}) — preview only
              </h2>
            </div>
            <p className="mb-4 text-sm text-slate-400">
              These rows mapped cleanly. Confirm before any backend import.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Symbol</th>
                    <th className="px-3 py-2 font-medium">Side</th>
                    <th className="px-3 py-2 font-medium">Qty</th>
                    <th className="px-3 py-2 font-medium">Price</th>
                    <th className="px-3 py-2 font-medium">Charges</th>
                  </tr>
                </thead>
                <tbody>
                  {result.valid.slice(0, 20).map((t) => (
                    <tr key={t.id} className="border-b border-white/5">
                      <td className="px-3 py-2 text-slate-300">
                        {t.timestamp.slice(0, 10)}
                      </td>
                      <td className="px-3 py-2 font-medium text-white">{t.symbol}</td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            t.side === "BUY" ? "text-green-400" : "text-amber-400"
                          }
                        >
                          {t.side}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-300">{t.quantity}</td>
                      <td className="px-3 py-2 text-slate-300">
                        {formatPaiseAsRupees(t.executionPricePaise)}
                      </td>
                      <td className="px-3 py-2 text-slate-400">
                        {t.chargesPaise != null
                          ? formatPaiseAsRupees(t.chargesPaise)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result.valid.length > 20 && (
              <p className="mt-2 text-xs text-slate-500">
                Showing first 20 of {result.valid.length} valid rows.
              </p>
            )}
          </section>
        )}

        {result && result.invalid.length > 0 && (
          <section className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="text-amber-400" size={20} />
              <h2 className="text-lg font-semibold text-amber-200">
                Rejected rows ({result.invalid.length})
              </h2>
            </div>
            <ul className="space-y-3 text-sm">
              {result.invalid.slice(0, 15).map((row) => (
                <li
                  key={row.rowIndex}
                  className="rounded-lg border border-amber-500/10 bg-[#0b1322] px-4 py-3"
                >
                  <span className="text-amber-300">Row {row.rowIndex}</span>
                  <span className="ml-2 text-slate-400">
                    {row.messages.join("; ")}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-6 text-xs leading-6 text-slate-500">
          Prices and charges in the CSV are read as rupees and stored as paise
          for consistency with the trading engine. No passwords or broker OTPs
          are requested. Backend persistence is wired during full integration.
        </p>
      </div>
    </main>
  );
}
