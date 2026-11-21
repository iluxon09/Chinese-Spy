import type { ReactNode } from "react";

type MarkdownMessageProps = {
  content: string;
};

function renderInline(value: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*\n]+?\*\*|__[^_\n]+?__|~~[^~\n]+?~~|\x60[^\x60\n]+\x60|\[[^\]]+\]\(https?:\/\/[^)\s]+\)|\*[^*\n]+?\*|_[^_\n]+?_)/g;
  let cursor = 0;
  let index = 0;

  for (const match of value.matchAll(pattern)) {
    const token = match[0];
    const start = match.index ?? 0;

    if (start > cursor) nodes.push(value.slice(cursor, start));

    let element: ReactNode = token;
    if (token.startsWith("**") || token.startsWith("__")) {
      element = <strong className="font-semibold text-white">{token.slice(2, -2)}</strong>;
    } else if (token.startsWith("~~")) {
      element = <del className="text-slate-400">{token.slice(2, -2)}</del>;
    } else if (token.startsWith("\x60")) {
      element = <code className="rounded bg-black/25 px-1.5 py-0.5 font-mono text-[0.9em] text-emerald-200">{token.slice(1, -1)}</code>;
    } else if (token.startsWith("[")) {
      const split = token.lastIndexOf("](");
      const label = token.slice(1, split);
      const href = token.slice(split + 2, -1);
      element = (
        <a href={href} target="_blank" rel="noopener noreferrer"
          className="break-all text-emerald-300 underline decoration-emerald-300/40 underline-offset-2 hover:text-emerald-200">
          {label}
        </a>
      );
    } else {
      element = <em className="italic text-slate-100">{token.slice(1, -1)}</em>;
    }

    nodes.push(<span key={index++}>{element}</span>);
    cursor = start + token.length;
  }

  if (cursor < value.length) nodes.push(value.slice(cursor));
  return nodes;
}

function listKind(line: string): "ordered" | "unordered" | null {
  if (/^\s*\d+[.)]\s+/.test(line)) return "ordered";
  if (/^\s*[-*+]\s+/.test(line)) return "unordered";
  return null;
}

function startsBlock(line: string): boolean {
  return /^\x60{3}/.test(line)
    || /^#{1,3}\s+/.test(line)
    || listKind(line) !== null
    || /^\s*>\s?/.test(line)
    || /^\s*(?:---+|___+|\*\*\*+)\s*$/.test(line);
}

export default function MarkdownMessage({ content }: MarkdownMessageProps) {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;
  let key = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith("\x60\x60\x60")) {
      index += 1;
      const code: string[] = [];
      while (index < lines.length && !lines[index].startsWith("\x60\x60\x60")) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push(
        <pre key={key++} className="max-w-full overflow-x-auto rounded-xl border border-white/10 bg-black/25 p-3 text-xs leading-6 text-emerald-100">
          <code className="font-mono">{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+?)\s*#*$/);
    if (heading) {
      const depth = heading[1].length;
      const className = depth === 1
        ? "text-lg font-bold text-white"
        : depth === 2
          ? "text-base font-semibold text-white"
          : "text-sm font-semibold text-emerald-100";
      const Heading = depth === 1 ? "h2" : depth === 2 ? "h3" : "h4";
      blocks.push(<Heading key={key++} className={className}>{renderInline(heading[2])}</Heading>);
      index += 1;
      continue;
    }

    if (/^\s*(?:---+|___+|\*\*\*+)\s*$/.test(line)) {
      blocks.push(<hr key={key++} className="border-white/10" />);
      index += 1;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^\s*>\s?/, ""));
        index += 1;
      }
      blocks.push(
        <blockquote key={key++} className="border-l-2 border-emerald-300/50 pl-3 text-slate-300">
          {renderInline(quote.join(" "))}
        </blockquote>,
      );
      continue;
    }

    const kind = listKind(line);
    if (kind) {
      const items: string[] = [];
      while (index < lines.length && listKind(lines[index]) === kind) {
        items.push(lines[index].replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/, ""));
        index += 1;
      }
      const List = kind === "ordered" ? "ol" : "ul";
      blocks.push(
        <List key={key++}
          className={kind === "ordered"
            ? "list-decimal space-y-1.5 pl-5 marker:text-emerald-300"
            : "list-disc space-y-1.5 pl-5 marker:text-emerald-300"}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex} className="pl-1 leading-7 text-slate-200">
              {renderInline(item)}
            </li>
          ))}
        </List>,
      );
      continue;
    }

    const paragraph: string[] = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !startsBlock(lines[index])) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push(
      <p key={key++} className="leading-7 text-slate-200">
        {renderInline(paragraph.join(" "))}
      </p>,
    );
  }

  return (
    <div className="min-w-0 max-w-full space-y-3 break-words [overflow-wrap:anywhere] [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_a]:break-all">
      {blocks}
    </div>
  );
}
