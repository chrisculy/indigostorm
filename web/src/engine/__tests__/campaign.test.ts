// @vitest-environment node
// Campaign flow: awakening at cleanup, Stars, perk unlocks, the cut, advancing days.
import { describe, expect, it } from 'vitest';
import { coreDeck } from '../../data/index.ts';
import {
  apply,
  campaignSetup,
  completeDay,
  createEpisode,
  debriefEpisode,
  newCampaign,
  nextContentDay,
  perkUnlockOptions,
  skipDay,
  skipToNextContentDay,
  suggestAction,
} from '../index.ts';
import type { CampaignState, GameState } from '../types.ts';
import { C } from './helpers.ts';

function playOut(s0: GameState): GameState {
  let s = s0;
  for (let i = 0; i < 400 && s.phase !== 'over'; i++) {
    const a = suggestAction(s);
    if (!a) break;
    s = apply(s, a).state;
  }
  return s;
}

describe('campaign', () => {
  it('starts on Day 1 with the Core deck', () => {
    const c = newCampaign();
    expect(c.day).toBe(1);
    expect(c.deck).toEqual(coreDeck().map((x) => x.id));
    expect(campaignSetup(c, 1).deck).toHaveLength(15);
  });

  it('Day 1 → debrief → cut 3 → Day 2', () => {
    const c = newCampaign();
    const end = playOut(createEpisode(campaignSetup(c, 11)));
    const d = debriefEpisode(c, end);
    expect(d.cards).toHaveLength(15);
    expect(d.retireCount).toBe(3);
    expect(d.perkOptions).toEqual([]);
    expect(() => completeDay(c, d, { retire: [C.overwatch, C.signal] })).toThrow();
    expect(() => completeDay(c, d, { retire: [C.overwatch, C.overwatch, C.signal] })).toThrow();
    expect(() => completeDay(c, d, { retire: [C.overwatch, C.signal, 'D06-P1'] })).toThrow();
    const next = completeDay(c, d, { retire: [C.overwatch, C.signal, C.patternRead] });
    expect(next.day).toBe(2);
    expect(next.deck).toHaveLength(12);
    expect(next.retired).toEqual([C.overwatch, C.signal, C.patternRead]);
    expect(next.stars[1]).toEqual(d.stars);
  });

  it('skips days without content; perk days may still unlock a perk', () => {
    const c: CampaignState = { ...newCampaign(), day: 2 };
    expect(nextContentDay(1)).toBe(6);
    const c3 = skipDay(c);
    expect(c3.day).toBe(3);
    expect(perkUnlockOptions(c3)).toHaveLength(12);
    const c4 = skipDay(c3, 'vanish');
    expect(c4.perks).toEqual(['vanish']);
    expect(() => skipDay({ ...c4, day: 6 })).toThrow();
    expect(skipToNextContentDay(c4).day).toBe(6);
    const to11 = skipToNextContentDay({ ...c4, day: 7 }, (_c, options) => options[0] ?? null);
    expect(to11.day).toBe(11);
    expect(to11.perks).toHaveLength(3); // vanish + Days 7 and 10
    expect(() => campaignSetup({ ...c4, day: 2 }, 1)).toThrow();
  });

  it('a Conditioned card that did not awaken during play awakens at cleanup', () => {
    const c: CampaignState = {
      ...newCampaign(),
      day: 16,
      deck: [
        'CORE-04',
        'CORE-08',
        'D01-P2',
        'D06-P1',
        'D11-P1',
        'PROTO-02',
        'PROTO-03',
        'PROTO-04',
        'PROTO-05',
        'PROTO-07',
        'CORE-01',
        'CORE-02',
      ],
    };
    // No Allies in this deck, so Recurring Dream can never awaken during play.
    const end = playOut(createEpisode(campaignSetup(c, 5)));
    const d = debriefEpisode(c, end);
    expect(d.flashbacks).toEqual([
      expect.objectContaining({ conditioned: C.dream, awakened: C.remembered, duringPlay: false }),
    ]);
    expect(d.cards).toContain(C.remembered);
    expect(d.cards).not.toContain(C.dream);
    const next = completeDay(c, d, { retire: ['CORE-01', 'CORE-02', 'CORE-04'] });
    expect(next.flashbacksSeen).toEqual([C.remembered]);
    expect(next.deck).toContain(C.remembered);
  });

  it('perk days require choosing one locked perk', () => {
    const c: CampaignState = {
      ...newCampaign(),
      day: 6,
      deck: [
        'CORE-02',
        'CORE-03',
        'CORE-04',
        'CORE-06',
        'CORE-08',
        'CORE-10',
        'CORE-11',
        'CORE-12',
        'D01-P1',
        'D01-P2',
        'PROTO-01',
        'PROTO-02',
      ],
    };
    const end = playOut(createEpisode(campaignSetup(c, 5)));
    // Day 6 has no perk unlock; pretend it is a perk day by checking Day 10's options instead.
    expect(debriefEpisode(c, end).perkOptions).toEqual([]);
    expect(perkUnlockOptions({ ...c, perks: ['vanish'] }, 10)).not.toContain('vanish');
    const d = { ...debriefEpisode(c, end), perkOptions: perkUnlockOptions(c, 10) };
    const retire = d.cards.slice(0, 3);
    expect(() => completeDay(c, d, { retire })).toThrow();
    expect(completeDay(c, d, { retire, perk: 'falseTrail' }).perks).toEqual(['falseTrail']);
  });
});
