import { type CSSProperties, useId, useMemo, useState } from 'react';
import { gameData } from '../../data/index.ts';
import { useGame } from '../../state/store.ts';
import { RuleCardView } from '../cards/index.ts';
import { Button } from '../components/index.ts';
import { GLOSSARY, QUICK_REFERENCE } from './rulesText.ts';
import { ScreenFrame } from './ScreenFrame.tsx';

const norm = (s: string) => s.toLowerCase();

/** Rule Cards seen so far, the quick reference and the glossary, filtered by one search box. */
export function RulebookContent({ autoFocus }: { autoFocus?: boolean }) {
  const seen = useGame((s) => s.rulesSeen);
  const [q, setQ] = useState('');
  const id = useId();
  const query = norm(q.trim());
  const rules = useMemo(() => gameData.rules.filter((r) => seen.includes(r.id)), [seen]);
  const match = (...texts: string[]) => !query || texts.some((t) => norm(t).includes(query));
  const shownRules = rules.filter((r) => match(r.title, r.front, r.back));
  const shownRef = QUICK_REFERENCE.map((s) => ({
    ...s,
    items: match(s.title) ? s.items : s.items.filter((i) => match(i)),
  })).filter((s) => s.items.length > 0);
  const shownGloss = GLOSSARY.filter(([term, def]) => match(term, def));
  const nothing = shownRules.length === 0 && shownRef.length === 0 && shownGloss.length === 0;
  return (
    <div className="rulebook">
      <div className="rulebook__search">
        <label htmlFor={id} className="field-label">
          Search the rules
        </label>
        <input
          id={id}
          type="search"
          className="text-input"
          placeholder="e.g. Clean, Pursuer, Ally Cover"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          // biome-ignore lint/a11y/noAutofocus: the Rulebook dialog is opened to search
          autoFocus={autoFocus}
        />
        {q && (
          <Button size="sm" variant="ghost" onClick={() => setQ('')}>
            Clear
          </Button>
        )}
      </div>
      {nothing && <p className="muted">Nothing matches “{q}”.</p>}
      {shownRef.length > 0 && (
        <section className="rulebook__sec" aria-labelledby={`${id}-qr`}>
          <h2 id={`${id}-qr`} className="sec-title">
            Quick reference
          </h2>
          <div className="qr-grid">
            {shownRef.map((s) => (
              <article key={s.id} className="qr-card">
                <h3>{s.title}</h3>
                <ul>
                  {s.items.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      )}
      {(shownRules.length > 0 || !query) && (
        <section className="rulebook__sec" aria-labelledby={`${id}-rc`}>
          <h2 id={`${id}-rc`} className="sec-title">
            Rule Cards{' '}
            <span className="muted">
              ({rules.length} of {gameData.rules.length} read)
            </span>
          </h2>
          {rules.length === 0 ? (
            <p className="muted">Rule Cards appear here once you have read them in a Briefing.</p>
          ) : (
            <ul className="rule-grid" style={{ '--card-w': '300px' } as CSSProperties}>
              {shownRules.map((r) => (
                <li key={r.id}>
                  <RuleCardView rule={r} size="fluid" />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {shownGloss.length > 0 && (
        <section className="rulebook__sec" aria-labelledby={`${id}-gl`}>
          <h2 id={`${id}-gl`} className="sec-title">
            Glossary
          </h2>
          <dl className="glossary">
            {shownGloss.map(([term, def]) => (
              <div key={term} className="glossary__row">
                <dt>{term}</dt>
                <dd>{def}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}

export function RulebookScreen() {
  return (
    <ScreenFrame title="Rulebook" subtitle="Rule Cards you have read, a quick reference and a glossary.">
      <RulebookContent />
    </ScreenFrame>
  );
}
