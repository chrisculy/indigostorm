// Quick reference and glossary text for the Rulebook (summarizes ../Indigo Storm.md and the Rule Cards).

export interface RefSection {
  id: string;
  title: string;
  items: string[];
}

export const QUICK_REFERENCE: RefSection[] = [
  {
    id: 'turn',
    title: 'A turn',
    items: [
      'Play exactly 2 cards (1 if you hold only 1). Free perk actions do not count as plays.',
      'End plays: the Pressure step resolves slot by slot, left to right, the Pursuer last.',
      'Draw 2 cards (or as many as remain). An episode lasts about 8 turns.',
    ],
  },
  {
    id: 'play',
    title: 'Playing a card',
    items: [
      'Tuck: put a Training card under a face-up Threat whose preferred or alternate suit matches its suit. It adds 1 symbol and its Power. Cards stay under a Threat across turns.',
      'Ability: play a Training card for its ability instead, then discard it. A card with no useful target can still be played for no effect.',
      'Deploy: Gear and Allies stay in play for the rest of the episode. Each costs one play.',
      'Decrypt: play a Recon card on a face-down Encrypted Threat to flip it.',
    ],
  },
  {
    id: 'clear',
    title: 'Clearing a Threat',
    items: [
      'A Threat clears the moment its symbol count and its Power are both met. Ally symbols of a matching suit count too.',
      'Claim its Reward, then its Clean bonus if the clear was Clean, then refill the slot from the Threat Deck.',
      'Clean Clear: every tucked card is the preferred suit and the preferred-suit symbols alone meet the requirement.',
    ],
  },
  {
    id: 'pressure',
    title: 'Pressure',
    items: [
      'Each face-up Threat applies its Pressure (unless cancelled), then its timer ticks down by 1.',
      'At 0 a Threat escapes: apply its Expiry effect and discard it with the cards under it. A Pursuer Strikes instead and its Hunt die resets.',
      'Ally Cover: before a Pressure, Expiry or Strike effect applies, you may defeat an Ally to cancel it.',
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
      'A Conditioned card that did not awaken during play awakens now (read the flashback).',
      'Gather your 15 cards and retire 3 of them: your deck goes back down to 12.',
    ],
  },
];

export const GLOSSARY: [string, string][] = [
  ['Lead', 'How close you are to the objective. Reaching the target ends the episode with the Objective Star.'],
  ['Exposure', 'Heat on you. Reaching the redline ends the episode (Cover Blown).'],
  ['Cover threshold', 'Finish at or below this Exposure to earn the Cover Star.'],
  ['Redline', 'The Exposure value that blows your cover.'],
  ['Scene Row', 'The face-up Threats you are dealing with (3 slots, plus a Pursuer slot on some days).'],
  ['Threat Deck', "Today's remaining Threats. Refills empty Scene Row slots from the top."],
  ['Preferred suit', 'The suit printed on the Threat’s symbols. Only preferred-suit symbols make a Clean Clear.'],
  ['Alternate suit', 'A second suit that also counts toward a Threat (but not for Clean Clears).'],
  ['Symbol', 'Each tucked card adds 1 symbol of its suit; Allies add their printed symbols to every matching Threat.'],
  ['Power', 'The total Power of tucked cards plus bonuses must reach the Threat’s Power number.'],
  ['Tuck', 'Place a card under a Threat to add its symbol and Power.'],
  ['Clean Clear', 'A clear where everything that counted was the preferred suit. Grants the Clean bonus.'],
  ['Reward', 'What you gain when you clear a Threat (usually Lead).'],
  ['Pressure', 'What a live Threat does to you at the end of each turn.'],
  ['Timer die', 'Counts down each Pressure step. At 0 the Threat escapes and its Expiry effect applies.'],
  ['Expiry', 'The effect applied when a timed Threat escapes.'],
  ['Blocker', 'While it is face-up, Lead cannot increase.'],
  ['Training card', 'A suited card with Power and a Tactical Ability.'],
  ['Gear', 'Stays in play; gives an ongoing bonus such as +1 Power for each card of a suit you tuck.'],
  ['Ally', 'Stays in play; its symbols count toward every matching Threat. Can be defeated for Ally Cover.'],
  ['Ally Cover', 'Defeat an Ally (discard it) to cancel one Pressure, Expiry or Strike effect.'],
  ['Encrypted Threat', 'Enters face-down: no Pressure, no timer, nothing can be tucked under it until decrypted.'],
  ['Decrypt', 'Play a Recon card on a face-down Threat to flip it. The card stays under it if Recon matches.'],
  ['Conditioned card', 'Awakens into a stronger Awakened card when its trigger is met as you play it, or at the end.'],
  ['Awakened card', 'The stronger version of a Conditioned card, with an Awakening bonus and a flashback.'],
  ['Flashback', 'The story scene on an Awakened card, read when it awakens.'],
  ['Pursuer', 'A Hunter-Killer in its own slot. Needs a lot to neutralize; never escapes.'],
  ['Hunt die', 'A Pursuer’s die. At 0 it Strikes and resets to its Hunt number.'],
  ['Strike', 'The Pursuer’s effect when its Hunt die reaches 0.'],
  ['Two-Phase Threat', 'When cleared, its Countermeasure enters the same slot.'],
  ['Countermeasure', 'A follow-up Threat set aside at setup; enters when its Two-Phase Threat is cleared.'],
  ['Stall', 'Turn a Timer or Hunt die up.'],
  ['Breach', 'Clear outright a Threat needing 1 symbol and little Power (no Clean bonus).'],
  ['Swap', 'Send a Scene Row Threat to the bottom of the Threat Deck; the top card enters.'],
  ['Clearance Perks', 'Once-per-episode abilities you unlock during the campaign.'],
  ['Episode Twist', 'A one-day rule change printed on the Intro card.'],
  ['Cut', 'After each episode, retire 3 of your 15 cards to keep a 12-card deck.'],
];
