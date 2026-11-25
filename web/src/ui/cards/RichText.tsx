import { pretty } from './format.ts';

/**
 * Card body text from the workbook's plain text: keeps line breaks, turns short ALL-CAPS lines into
 * headings (same rule as make_print.py), "1." lines into numbered steps and "- " lines into bullets.
 * Renders spans only, so it is valid inside an interactive (button) card.
 */
export function RichText({ text, className }: { text: string; className?: string | undefined }) {
  const lines = pretty(text).split('\n');
  let blank = 0;
  return (
    <span className={className ? `rt ${className}` : 'rt'}>
      {lines.map((raw, i) => {
        const line = raw.trim();
        const key = `${i}-${line.slice(0, 12)}`;
        if (!line) {
          blank++;
          return <span key={`gap${blank}`} className="rt-gap" />;
        }
        const letters = line.replace(/[^A-Za-z]/g, '');
        if (letters && line === line.toUpperCase() && line.length < 40) {
          return (
            <span key={key} className="rt-h">
              {line}
            </span>
          );
        }
        const num = /^(\d+)\.\s+(.*)$/.exec(line);
        if (num) {
          return (
            <span key={key} className="rt-li rt-num">
              <span className="rt-marker">{num[1]}</span>
              <span>{num[2]}</span>
            </span>
          );
        }
        const bullet = /^[-•]\s+(.*)$/.exec(line);
        if (bullet) {
          return (
            <span key={key} className="rt-li rt-bullet">
              <span className="rt-marker" aria-hidden="true" />
              <span>{bullet[1]}</span>
            </span>
          );
        }
        const lead = /^([A-Z][A-Z' -]{2,}):\s*(.*)$/.exec(line);
        if (lead) {
          return (
            <span key={key} className="rt-p">
              <strong>{lead[1]}:</strong> {lead[2]}
            </span>
          );
        }
        return (
          <span key={key} className="rt-p">
            {line}
          </span>
        );
      })}
    </span>
  );
}
