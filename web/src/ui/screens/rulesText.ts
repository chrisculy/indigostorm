// Quick reference and glossary text for the Rulebook (summarizes ../Indigo Storm.md and the Rule Cards).

import type { RuleCard } from '../../data/types.ts';

/**
 * The day whose Rule Cards introduce a mechanic. Entries tagged with a day stay hidden (no spoilers)
 * until the player has read a Rule Card of that day: 1 = base rules (always shown), 6 Gear & Allies,
 * 11 Encrypted Threats, 16 Flashbacks, 21 Pursuers, 26 Two-Phase Threats & Countermeasures,
 * 'PROTO' = Clearance Perks.
 */
export type RuleDay = RuleCard['day'];

export interface RefItem {
  text: string;
  day: RuleDay;
}

export interface RefSection {
  id: string;
  title: string;
  /** Plain strings are base rules. */
  items: (string | RefItem)[];
}

export interface GlossaryEntry {
  term: string;
  def: string;
  day: RuleDay;
}

/** Days whose mechanics may be described: base rules plus every day with a Rule Card the player read. */
export function unlockedRuleDays(rulesSeen: readonly string[], rules: readonly RuleCard[]): Set<RuleDay> {
  const days = new Set<RuleDay>([1]);
  for (const r of rules) if (rulesSeen.includes(r.id)) days.add(r.day);
  return days;
}

/** The quick reference with only the unlocked entries (sections left empty are dropped). */
export function visibleQuickReference(days: ReadonlySet<RuleDay>): { id: string; title: string; items: string[] }[] {
  return QUICK_REFERENCE.map((sec) => ({
    id: sec.id,
    title: sec.title,
    items: sec.items.flatMap((i) => (typeof i === 'string' ? [i] : days.has(i.day) ? [i.text] : [])),
  })).filter((sec) => sec.items.length > 0);
}

/** The glossary with only the unlocked entries. */
export function visibleGlossary(days: ReadonlySet<RuleDay>): GlossaryEntry[] {
  return GLOSSARY.filter((g) => days.has(g.day));
}

export const QUICK_REFERENCE: RefSection[] = [
  {
    id: 'turn',
    title: 'A turn',
    items: [
      'Play exactly 2 cards (1 if you hold only 1).',
      { day: 'PROTO', text: 'Perks are free actions: using one does not count as a play.' },
      'End plays: the Pressure step resolves slot by slot, left to right.',
      { day: 21, text: 'The Pursuer’s slot resolves last in the Pressure step.' },
      'Draw 2 cards (or as many as remain). An episode lasts about 8 turns.',
    ],
  },
  {
    id: 'play',
    title: 'Playing a card',
    items: [
      'Tuck: put a Training card under a face-up Threat whose preferred or alternate suit matches its suit. It adds 1 symbol and its Power. Cards stay under a Threat across turns.',
      'Ability: play a Training card for its ability instead, then discard it. A card with no useful target can still be played for no effect.',
      { day: 6, text: 'Deploy: Gear and Allies stay in play for the rest of the episode. Each costs one play.' },
      { day: 11, text: 'Decrypt: play a Recon card on a face-down Encrypted Threat to flip it.' },
    ],
  },
  {
    id: 'clear',
    title: 'Clearing a Threat',
    items: [
      'A Threat clears the moment its symbol count and its Power are both met.',
      { day: 6, text: 'Ally symbols of a matching suit count toward a Threat too.' },
      'Claim its Reward, then its Clean bonus if the clear was Clean, then refill the slot from the Threat Deck.',
      'Clean Clear: every tucked card is the preferred suit and the preferred-suit symbols alone meet the requirement.',
      {
        day: 26,
        text: 'Two-Phase Threat: clearing it claims its Reward, then its Countermeasure enters the same slot.',
      },
    ],
  },
  {
    id: 'pressure',
    title: 'Pressure',
    items: [
      'Each face-up Threat applies its Pressure (unless cancelled), then its timer ticks down by 1.',
      'At 0 a Threat escapes: apply its Expiry effect and discard it with the cards under it.',
      { day: 21, text: 'A Pursuer never escapes: at 0 it Strikes instead and its Hunt die resets.' },
      { day: 11, text: 'A face-down Encrypted Threat has no Pressure and no timer.' },
      {
        day: 6,
        text: 'Ally Cover: before a Pressure or Expiry effect applies, you may defeat an Ally to cancel it.',
      },
      'Blockers: while a face-up Blocker is in the Scene Row, Lead cannot increase.',
    ],
  },
  {
    id: 'end',
    title: 'The episode ends when…',
    items: [
      'Objective Secured: Lead reaches the target.',
      'Cover Blown: Exposure reaches the redline.',
      'Out of Time: your draw pile and hand are both empty after your plays.',
      'Scene Cleared: the Scene Row and the Threat Deck are empty (+1 Lead).',
    ],
  },
  {
    id: 'stars',
    title: 'Stars',
    items: [
      'Objective Star: you reached the Lead target.',
      "Cover Star: your final Exposure is at or below the day's threshold (and your cover wasn't blown).",
      "Bonus Star: you completed the day's Bonus Objective.",
    ],
  },
  {
    id: 'after',
    title: 'After the episode',
    items: [
      { day: 16, text: 'A Conditioned card that did not awaken during play awakens now (read the flashback).' },
      'Gather your 15 cards and retire 3 of them: your deck goes back down to 12.',
    ],
  },
];

export const GLOSSARY: GlossaryEntry[] = [
  {
    term: 'Lead',
    day: 1,
    def: 'How close you are to the objective. Reaching the target ends the episode with the Objective Star.',
  },
  { term: 'Exposure', day: 1, def: 'Heat on you. Reaching the redline ends the episode (Cover Blown).' },
  { term: 'Cover threshold', day: 1, def: 'Finish at or below this Exposure to earn the Cover Star.' },
  { term: 'Redline', day: 1, def: 'The Exposure value that blows your cover.' },
  { term: 'Scene Row', day: 1, def: 'The face-up Threats you are dealing with (usually 3 slots).' },
  { term: 'Threat Deck', day: 1, def: "Today's remaining Threats. Refills empty Scene Row slots from the top." },
  {
    term: 'Preferred suit',
    day: 1,
    def: 'The suit printed on the Threat’s symbols. Only preferred-suit symbols make a Clean Clear.',
  },
  { term: 'Alternate suit', day: 1, def: 'A second suit that also counts toward a Threat (but not for Clean Clears).' },
  {
    term: 'Symbol',
    day: 1,
    def: 'Each tucked card adds 1 symbol of its suit.',
  },
  { term: 'Power', day: 1, def: 'The total Power of tucked cards plus bonuses must reach the Threat’s Power number.' },
  { term: 'Tuck', day: 1, def: 'Place a card under a Threat to add its symbol and Power.' },
  {
    term: 'Clean Clear',
    day: 1,
    def: 'A clear where everything that counted was the preferred suit. Grants the Clean bonus.',
  },
  { term: 'Reward', day: 1, def: 'What you gain when you clear a Threat (usually Lead).' },
  { term: 'Pressure', day: 1, def: 'What a live Threat does to you at the end of each turn.' },
  {
    term: 'Timer die',
    day: 1,
    def: 'Counts down each Pressure step. At 0 the Threat escapes and its Expiry effect applies.',
  },
  { term: 'Expiry', day: 1, def: 'The effect applied when a timed Threat escapes.' },
  { term: 'Blocker', day: 1, def: 'While it is face-up, Lead cannot increase.' },
  { term: 'Training card', day: 1, def: 'A suited card with Power and a Tactical Ability.' },
  {
    term: 'Gear',
    day: 6,
    def: 'Stays in play; gives an ongoing bonus such as +1 Power for each card of a suit you tuck.',
  },
  {
    term: 'Ally',
    day: 6,
    def: 'Stays in play; its symbols count toward every matching Threat. Can be defeated for Ally Cover.',
  },
  { term: 'Ally Cover', day: 6, def: 'Defeat an Ally (discard it) to cancel one Pressure or Expiry effect.' },
  {
    term: 'Encrypted Threat',
    day: 11,
    def: 'Enters face-down: no Pressure, no timer, nothing can be tucked under it until decrypted.',
  },
  {
    term: 'Decrypt',
    day: 11,
    def: 'Play a Recon card on a face-down Threat to flip it. The card stays under it if Recon matches.',
  },
  {
    term: 'Conditioned card',
    day: 16,
    def: 'Awakens into a stronger Awakened card when its trigger is met as you play it, or at the end.',
  },
  {
    term: 'Awakened card',
    day: 16,
    def: 'The stronger version of a Conditioned card, with an Awakening bonus and a flashback.',
  },
  { term: 'Flashback', day: 16, def: 'The story scene on an Awakened card, read when it awakens.' },
  { term: 'Pursuer', day: 21, def: 'A Hunter-Killer in its own slot. Needs a lot to neutralize; never escapes.' },
  { term: 'Hunt die', day: 21, def: 'A Pursuer’s die. At 0 it Strikes and resets to its Hunt number.' },
  { term: 'Strike', day: 21, def: 'The Pursuer’s effect when its Hunt die reaches 0. Ally Cover can cancel it too.' },
  { term: 'Two-Phase Threat', day: 26, def: 'When cleared, its Countermeasure enters the same slot.' },
  {
    term: 'Countermeasure',
    day: 26,
    def: 'A follow-up Threat set aside at setup; enters when its Two-Phase Threat is cleared.',
  },
  { term: 'Stall', day: 1, def: 'Turn a Threat’s die up (more time before it runs out).' },
  { term: 'Breach', day: 1, def: 'Clear outright a Threat needing 1 symbol and little Power (no Clean bonus).' },
  { term: 'Swap', day: 1, def: 'Send a Scene Row Threat to the bottom of the Threat Deck; the top card enters.' },
  { term: 'Clearance Perks', day: 'PROTO', def: 'Once-per-episode abilities you unlock during the campaign.' },
  { term: 'Episode Twist', day: 1, def: 'A one-day rule change printed on the Intro card.' },
  { term: 'Cut', day: 1, def: 'After each episode, retire 3 of your 15 cards to keep a 12-card deck.' },
];
