import { describe, expect, it } from 'vitest';
import { gameData } from './index.ts';
import { dayTwists, TWIST_CODES, twistForDay } from './twists.ts';

describe('Episode Twist mapping', () => {
  it.each(gameData.days.map((d) => [d.day, d.episodeTwist] as const))(
    'day %i: twist code matches the plan text',
    (day, text) => {
      // If this fails, the workbook text changed: update src/data/twists.ts (code AND text).
      if (text) expect(dayTwists[day]?.text).toBe(text);
      else expect(twistForDay(day)).toBeNull();
    },
  );

  it('uses each of the six drafted twist codes exactly once', () => {
    expect(
      Object.values(dayTwists)
        .map((t) => t.code)
        .sort(),
    ).toEqual([...TWIST_CODES].sort());
  });
});
