import { Fragment, type ReactNode } from "react";

function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

/** Minimal, dependency-free markdown renderer for agent answers (XSS-safe). */
export function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  let numbered: string[] = [];

  const flushBullets = () => {
    if (!bullets.length) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`}>
        {bullets.map((item, index) => (
          <li key={index}>{inline(item)}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  const flushNumbered = () => {
    if (!numbered.length) return;
    blocks.push(
      <ol key={`ol-${blocks.length}`}>
        {numbered.map((item, index) => (
          <li key={index}>{inline(item)}</li>
        ))}
      </ol>,
    );
    numbered = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\s*[-*•]\s+/.test(line)) {
      flushNumbered();
      bullets.push(line.replace(/^\s*[-*•]\s+/, ""));
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      flushBullets();
      numbered.push(line.replace(/^\s*\d+\.\s+/, ""));
      continue;
    }
    flushBullets();
    flushNumbered();
    if (!line.trim()) {
      blocks.push(<div key={`sp-${blocks.length}`} className="h-1.5" />);
      continue;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const Tag = (level === 1 ? "h2" : level === 2 ? "h3" : "h4") as "h2" | "h3" | "h4";
      blocks.push(<Tag key={`h-${blocks.length}`}>{inline(heading[2])}</Tag>);
      continue;
    }
    blocks.push(<p key={`p-${blocks.length}`}>{inline(line)}</p>);
  }
  flushBullets();
  flushNumbered();

  return <div className="answer-md text-[14.5px] text-ink-700">{blocks}</div>;
}
