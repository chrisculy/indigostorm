// @vitest-environment node
// Bot sanity: the greedy bot plays every content day. Rates are printed for comparison with
// indigo_sim.py (Indigo Storm.md, Section 6); only loose bounds are asserted.
// BOT_GAMES (default 200) sets the number of games per day.
import { describe, expect, it } from 'vitest';
import { contentDays } from '../../data/index.ts';
import { apply, createEpisode, prototypeSetup, suggestAction } from '../index.ts';
import type { GameState } from '../types.ts';

const GAMES = Number(process.env.BOT_GAMES ?? 200);

/** Simulator numbers from the design doc (Objective %, Cover %, avg turns). */
const SIM: Record<number, [number, number, number]> = {
  1: [81, 100, 6.4],
  6: [71, 94, 6.8],
  11: [73, 84, 6.1],
  16: [63, 70, 6.7],
  21: [59, 72, 6.7],
  26: [50, 89, 7.0],
};

function botGame(day: number, seed: number): GameState {
  let s = createEpisode(prototypeSetup(day, seed));
  for (let i = 0; i < 400 && s.phase !== 'over'; i++) {
    const a = suggestAction(s);
    if (!a) break;
    s = apply(s, a).state;
  }
  return s;
}

describe('bot', () => {
  it.each(contentDays.map((d) => [d]))(
    'day %i: plays to the end with sensible Star rates',
    (day) => {
      let obj = 0;
      let cover = 0;
      let bonus = 0;
      let turns = 0;
      for (let seed = 1; seed <= GAMES; seed++) {
        const s = botGame(day, seed);
        expect(s.phase).toBe('over');
        const st = s.result?.stars;
        if (st?.objective) obj++;
        if (st?.cover) cover++;
        if (st?.bonus) bonus++;
        turns += s.turn;
      }
      const pct = (n: number) => Math.round((100 * n) / GAMES);
      const sim = SIM[day];
      // process.stdout (not console) so the line shows in a normal `vitest run`.
      process.stdout.write(
        `Day ${day}: Objective ${pct(obj)}% · Cover ${pct(cover)}% · Bonus ${pct(bonus)}% · avg turns ${(turns / GAMES).toFixed(1)}` +
          (sim ? `   (simulator: ${sim[0]}% / ${sim[1]}%, ${sim[2]} turns)` : '') +
          '\n',
      );
      expect(pct(obj)).toBeGreaterThanOrEqual(20);
      expect(pct(obj)).toBeLessThanOrEqual(99);
      expect(pct(cover)).toBeGreaterThanOrEqual(20);
    },
    300_000,
  );
});
