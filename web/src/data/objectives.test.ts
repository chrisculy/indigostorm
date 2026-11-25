import { describe, expect, it } from 'vitest';
import { gameData } from './index.ts';
import { dayObjectives, objectiveForDay } from './objectives.ts';

describe('Bonus Objective mapping', () => {
  it('maps every day of the Episode Plan', () => {
    expect(
      Object.keys(dayObjectives)
        .map(Number)
        .sort((a, b) => a - b),
    ).toEqual(gameData.days.map((d) => d.day));
  });

  it.each(gameData.days.map((d) => [d.day, d.bonusObjective] as const))(
    'day %i: the code was written for the current plan text',
    (day, text) => {
      // If this fails, the workbook text changed: update src/data/objectives.ts (code AND text).
      expect(objectiveForDay(day).text).toBe(text);
    },
  );
});
