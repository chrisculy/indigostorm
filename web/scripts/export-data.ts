// Export the Indigo Storm workbooks to src/data/game-data.json.
//
//   npm run data
//
// Reads ../Indigo Storm - Cards.xlsx and ../Indigo Storm - Episode Plan.xlsx (the same
// source of truth used by indigo_sim.py and make_print.py). Story text comes from
// ../spoilers/Indigo Storm - Story.xlsx when it exists, otherwise from the placeholder
// "Story Cards" sheet. Fails loudly on anything the engine could not understand.
//
// Runs with Node's built-in TypeScript type stripping (Node >= 22.18), so only
// erasable TypeScript syntax is allowed in this file.

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSheet } from 'read-excel-file/node';
import type {
  CardDay,
  DayPlan,
  Delta,
  Effect,
  GameData,
  JumpIn,
  PerkId,
  PerkInfo,
  PlayerCard,
  PlayerClass,
  RuleCard,
  StoryCard,
  Suit,
  ThreatCard,
  ThreatEffect,
  ThreatType,
  Trigger,
} from '../src/data/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const CARDS = join(ROOT, 'Indigo Storm - Cards.xlsx');
const PLAN = join(ROOT, 'Indigo Storm - Episode Plan.xlsx');
const STORY = join(ROOT, 'spoilers', 'Indigo Storm - Story.xlsx');
const OUT = join(HERE, '..', 'src', 'data', 'game-data.json');

const SUITS: readonly Suit[] = ['Recon', 'Stealth', 'Force'];
const CLASSES: readonly PlayerClass[] = ['Training', 'Gear', 'Ally', 'Conditioned', 'Awakened'];
const THREAT_TYPES: readonly ThreatType[] = [
  'Threat',
  'Encrypted Threat',
  'Pursuer',
  'Two-Phase Threat',
  'Countermeasure',
];

// Perk text mirrors the design doc (Section 4) and make_print.py's campaign sheet.
const PERKS: PerkInfo[] = [
  {
    id: 'vanish',
    name: 'Vanish',
    branch: 'GHOST',
    text: 'Discard any Threat from the Scene Row (unless its card says otherwise) without clearing it.',
  },
  {
    id: 'clonedCredentials',
    name: 'Cloned Credentials',
    branch: 'GHOST',
    text: 'During setup, put 1 card of your choice from your deck into your opening hand.',
  },
  {
    id: 'falseTrail',
    name: 'False Trail',
    branch: 'GHOST',
    text: 'This turn, ignore up to 2 Exposure you would gain, and gain +1 Lead.',
  },
  {
    id: 'sleeperInstinct',
    name: 'Sleeper Instinct',
    branch: 'GHOST',
    text: 'When you play a Stealth card for its ability, also tuck it under a Threat.',
  },
  {
    id: 'satelliteOverwrite',
    name: 'Satellite Overwrite',
    branch: 'ANALYST',
    text: 'Look at the top 4 Threats, discard up to 2, put the rest back in any order.',
  },
  { id: 'contingencyPlan', name: 'Contingency Plan', branch: 'ANALYST', text: 'Draw 2 extra cards.' },
  {
    id: 'patternRecognition',
    name: 'Pattern Recognition',
    branch: 'ANALYST',
    text: 'When you clear a Threat with 3+ excess Power, draw 1 card.',
  },
  {
    id: 'masterDecryptor',
    name: 'Master Decryptor',
    branch: 'ANALYST',
    text: 'For one turn, all cards in your hand count as any suit.',
  },
  {
    id: 'adrenalineSurge',
    name: 'Adrenaline Surge',
    branch: 'OPERATIVE',
    text: "Skip one Pressure step (timers don't tick, no Pressure resolves).",
  },
  {
    id: 'improvisedWeapon',
    name: 'Improvised Weapon',
    branch: 'OPERATIVE',
    text: 'When you tuck a card, it counts as any suit and its Power is doubled.',
  },
  {
    id: 'hardenedResolve',
    name: 'Hardened Resolve',
    branch: 'OPERATIVE',
    text: 'When you would reach the Exposure redline, stop 1 below it instead.',
  },
  {
    id: 'kineticMomentum',
    name: 'Kinetic Momentum',
    branch: 'OPERATIVE',
    text: 'When you clear a Threat using Force, carry excess Power onto another Threat.',
  },
];

type Cell = string | number | boolean | Date | null | undefined;
type Row = Record<string, Cell>;

const problems: string[] = [];
function fail(msg: string): void {
  problems.push(msg);
}

async function rows(path: string, sheet: string): Promise<Row[]> {
  const data = (await readSheet(path, sheet)) as Cell[][];
  const [head, ...body] = data;
  if (!head) throw new Error(`${sheet}: empty sheet`);
  const keys = head.map((h) => String(h ?? '').trim());
  return body
    .filter((r) => r[0] !== null && r[0] !== undefined && String(r[0]).trim() !== '')
    .map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i] ?? null])));
}

const str = (v: Cell): string => (v === null || v === undefined ? '' : String(v).replace(/−/g, '-').trim());
const num = (v: Cell, fallback = 0): number => {
  if (v === null || v === undefined || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

function suit(v: Cell, where: string, optional = false): Suit | null {
  const s = str(v);
  if (!s) {
    if (!optional) fail(`${where}: missing suit`);
    return null;
  }
  if (!SUITS.includes(s as Suit)) {
    fail(`${where}: unknown suit "${s}"`);
    return null;
  }
  return s as Suit;
}

function cardDay(v: Cell): CardDay {
  const s = str(v);
  if (s === 'CORE' || s === 'PROTO') return s;
  return num(v);
}

/** "+2 Lead, -1 Exposure; Draw 1" -> { lead: 2, exposure: -1, draw: 1 } */
function delta(text: Cell): Delta {
  const t = str(text).toLowerCase();
  const d: Delta = { lead: 0, exposure: 0, draw: 0 };
  for (const m of t.matchAll(/([+-]?\d+)\s*(lead|exposure)/g)) {
    const key = m[2] as 'lead' | 'exposure';
    d[key] += Number(m[1]);
  }
  const draw = t.match(/draw\s*(\d+)/);
  if (draw) d.draw = Number(draw[1]);
  return d;
}

function effects(text: Cell, where: string): Effect[] {
  const out: Effect[] = [];
  for (const tok of str(text)
    .split(/[;,]/)
    .map((t) => t.trim())
    .filter(Boolean)) {
    const [opRaw, ...args] = tok.split(':').map((p) => p.trim());
    const op = (opRaw ?? '').toLowerCase();
    const n = (i: number, d = 1): number => (args[i] !== undefined ? Number(args[i]) : d);
    switch (op) {
      case 'draw':
      case 'exposure':
      case 'lead':
      case 'stall':
      case 'peek':
        out.push({ op, n: n(0) });
        break;
      case 'cancel_pressure':
      case 'clean_next':
      case 'swap':
      case 'move_card':
        out.push({ op });
        break;
      case 'add_power':
        out.push({ op, n: n(0, 1), suit: args[1] ? suit(args[1], where) : null });
        break;
      case 'breach':
        out.push({ op, max: n(0, 3) });
        break;
      case 'power_bonus': {
        const s = suit(args[0] ?? null, where);
        if (s) out.push({ op, suit: s, n: n(1, 1) });
        break;
      }
      default:
        fail(`${where}: unknown Sim Effect "${tok}"`);
    }
  }
  return out;
}

function threatEffects(text: Cell, where: string): ThreatEffect[] {
  const out: ThreatEffect[] = [];
  for (const tok of str(text)
    .split(/[;,]/)
    .map((t) => t.trim())
    .filter(Boolean)) {
    const [op, s, n] = tok.split(':').map((p) => p.trim());
    if (op === 'suit_penalty') {
      const su = suit(s ?? null, where);
      if (su) out.push({ op: 'suit_penalty', suit: su, n: Number(n ?? 1) });
    } else fail(`${where}: unknown Threat Sim Effect "${tok}"`);
  }
  return out;
}

function trigger(text: Cell): Trigger | null {
  const t = str(text).toLowerCase();
  if (!t) return null;
  const exp = t.match(/(\d+)\+?\s*exposure/);
  if (exp) return { kind: 'exposure', n: Number(exp[1]) };
  const lead = t.match(/(\d+)\+?\s*lead/);
  if (lead) return { kind: 'lead', n: Number(lead[1]) };
  if (t.includes('ally')) return { kind: 'allies', n: 1 };
  if (t.includes('gear')) return { kind: 'gear', n: 1 };
  fail(`Awakening Trigger not understood: "${t}"`);
  return null;
}

const perkByName = new Map(PERKS.map((p) => [p.name.toLowerCase(), p.id]));

async function main(): Promise<void> {
  const playerRows = await rows(CARDS, 'Player Cards');
  const playerCards: PlayerCard[] = playerRows.map((r) => {
    const id = str(r.ID);
    const cls = str(r.Class) as PlayerClass;
    if (!CLASSES.includes(cls)) fail(`${id}: unknown class "${cls}"`);
    const hasSuit = cls !== 'Gear' && cls !== 'Ally';
    return {
      id,
      name: str(r.Name),
      day: cardDay(r.Day),
      cls,
      suit: hasSuit ? suit(r.Suit, id) : null,
      power: hasSuit ? num(r.Power) : 0,
      allySymbols: str(r['Ally Symbols'])
        .split(/[+/,]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => suit(s, id))
        .filter((s): s is Suit => s !== null),
      text: str(r['Ability / Effect']),
      effects: effects(r['Sim Effect'], id),
      trigger: trigger(r['Awakening Trigger']),
      triggerText: str(r['Awakening Trigger']),
      awakeningBonus: cls === 'Awakened' ? delta(r['Awakening Bonus']) : null,
      pairsWith: str(r['Pairs With']) || null,
      flavor: str(r['Flavor / Flashback Text']),
    };
  });

  const threatRows = await rows(CARDS, 'Threat Cards');
  const threats: ThreatCard[] = threatRows.map((r) => {
    const id = str(r.ID);
    const type = str(r.Type) as ThreatType;
    if (!THREAT_TYPES.includes(type)) fail(`${id}: unknown type "${type}"`);
    const pressureText = str(r['End-of-Turn Pressure']);
    const rulesText = str(r['Rules Text']);
    return {
      id,
      name: str(r.Name),
      day: num(r.Day),
      type,
      pref: suit(r['Preferred Suit'], id) ?? 'Recon',
      alt: suit(r['Alternate Suit'], id, true),
      symbols: num(r['Symbols Required'], 1),
      power: num(r['Power Required']),
      timer: r['Timer (Hunt for Pursuers)'] === null ? null : num(r['Timer (Hunt for Pursuers)']),
      reward: delta(r.Reward),
      rewardText: str(r.Reward),
      clean: delta(r['Clean Bonus']),
      cleanText: str(r['Clean Bonus']),
      pressure: delta(pressureText),
      pressureText,
      blocker: pressureText.toLowerCase().includes('blocker'),
      expiry: delta(r['Expiry Effect (Strike for Pursuers)']),
      expiryText: str(r['Expiry Effect (Strike for Pursuers)']),
      pairsWith: str(r['Pairs With']) || null,
      rulesText,
      noVanish: rulesText.toLowerCase().includes('cannot be vanished'),
      effects: threatEffects(r['Sim Effect'], id),
      flavor: str(r.Flavor),
    };
  });

  const jumpIns: JumpIn[] = (await rows(CARDS, 'Jump-In Setups')).map((r) => ({
    day: num(r.Day),
    deck: str(r['Deck (12 cards)'])
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    perks: str(r.Perks)
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
      .map((name) => {
        const id = perkByName.get(name);
        if (!id) fail(`Jump-In Day ${str(r.Day)}: unknown perk "${name}"`);
        return id;
      })
      .filter((p): p is PerkId => p !== undefined),
    notes: str(r.Notes),
  }));

  const rules: RuleCard[] = (await rows(CARDS, 'Rule Cards')).map((r) => ({
    id: str(r.ID),
    day: str(r.Day) === 'PROTO' ? 'PROTO' : num(r.Day),
    title: str(r.Title),
    front: str(r.Front),
    back: str(r.Back),
  }));

  const storyFromSpoilers = existsSync(STORY);
  const story: StoryCard[] = (await rows(storyFromSpoilers ? STORY : CARDS, 'Story Cards')).map((r) => ({
    id: str(r.ID),
    day: num(r.Day),
    type: str(r.Type) === 'Outro' ? 'Outro' : 'Intro',
    title: str(r.Title),
    text: str(r.Text),
  }));

  const contentDays = new Set(playerCards.filter((c) => typeof c.day === 'number').map((c) => c.day as number));
  const threatDays = new Set(threats.map((t) => t.day));
  const days: DayPlan[] = (await rows(PLAN, 'Episode Plan')).map((r) => {
    const day = num(r.Day);
    const act = num(r.Act === 'I' ? 1 : r.Act === 'II' ? 2 : r.Act === 'III' ? 3 : r.Act, 1);
    return {
      day,
      act: (act === 2 ? 2 : act === 3 ? 3 : 1) as 1 | 2 | 3,
      actTitle: str(r['Act Title']),
      focusSuit: suit(r['Focus Suit'], `Day ${day}`) ?? 'Recon',
      newRules: str(r['New Rules']),
      episodeTitle: str(r['Episode Title']),
      startLead: num(r['Start Lead']),
      leadTarget: num(r['Lead Target'], 8),
      startExposure: num(r['Start Exposure']),
      redline: num(r['Exposure Redline'], 6),
      coverThreshold: num(r['Cover Star Threshold'], 2),
      threatCount: num(r['Threat Cards']),
      pursuers: num(r.Pursuers),
      countermeasures: num(r.Countermeasures),
      bonusObjective: str(r['Bonus Objective']),
      episodeTwist: str(r['Episode Twist']),
      perkUnlock: str(r['Perk Unlock']).toLowerCase() === 'yes',
      debrief: str(r['Debrief / Epilogue']),
      hasContent: contentDays.has(day) && threatDays.has(day),
    };
  });

  // ------------------------------------------------------------- integrity checks
  const ids = new Set(playerCards.map((c) => c.id));
  const threatIds = new Set(threats.map((t) => t.id));
  for (const j of jumpIns) {
    if (j.deck.length !== 12) fail(`Jump-In Day ${j.day}: deck has ${j.deck.length} cards (expected 12)`);
    for (const id of j.deck) if (!ids.has(id)) fail(`Jump-In Day ${j.day}: unknown card ${id}`);
  }
  for (const c of playerCards) {
    if (c.pairsWith && !ids.has(c.pairsWith)) fail(`${c.id}: Pairs With unknown card ${c.pairsWith}`);
    if (c.cls === 'Conditioned' && !c.trigger) fail(`${c.id}: Conditioned card without a trigger`);
  }
  for (const t of threats) {
    if (t.pairsWith && !threatIds.has(t.pairsWith)) fail(`${t.id}: Pairs With unknown Threat ${t.pairsWith}`);
    if (t.type === 'Pursuer' && !t.timer) fail(`${t.id}: Pursuer without a Hunt number`);
  }
  for (const d of days.filter((x) => x.hasContent)) {
    const mine = playerCards.filter((c) => c.day === d.day && c.cls !== 'Awakened');
    if (mine.length !== 3) fail(`Day ${d.day}: ${mine.length} player cards (expected 3)`);
    if (d.day !== 1 && !jumpIns.some((j) => j.day === d.day)) fail(`Day ${d.day}: no Jump-In setup`);
    if (!story.some((s) => s.day === d.day && s.type === 'Intro')) fail(`Day ${d.day}: no Intro story card`);
  }
  if (playerCards.filter((c) => c.day === 'CORE').length !== 12) fail('Core deck must have 12 cards');

  if (problems.length) {
    console.error(`Export failed with ${problems.length} problem(s):\n  - ${problems.join('\n  - ')}`);
    process.exit(1);
  }

  const body = {
    storySource: storyFromSpoilers ? 'spoilers' : 'placeholder',
    playerCards,
    threats,
    jumpIns,
    rules,
    story,
    days,
    perks: PERKS,
  } as const;
  const version = createHash('sha256').update(JSON.stringify(body)).digest('hex').slice(0, 12);
  const data: GameData = { version, ...body };
  await writeFile(OUT, `${JSON.stringify(data, null, 2)}\n`);
  const contentDayList = days.filter((d) => d.hasContent).map((d) => d.day);
  console.log(
    `Wrote ${OUT.replace(`${ROOT}/`, '')} (version ${version}): ${playerCards.length} player cards, ${threats.length} Threats, ` +
      `${rules.length} Rule Cards, ${story.length} story cards (${data.storySource}), days with content: ${contentDayList.join(', ')}`,
  );
}

await main();
