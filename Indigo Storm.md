# Indigo Storm — Game Design Overview Document

**Genre:** Solo Episodic Conspiracy Thriller Card Game **Player Count:** 1 Player **Campaign Length:** 30 Episodes (Played 1/day over a month, or binged in multi-episode sessions) **Target Session Length:** 10 Minutes (Range: 5–15 minutes) **Theme:** Modern espionage conspiracy thriller with grounded near-future sci-fi elements (memory conditioning, black-budget neuro-programs, off-grid wetwork teams—modeled after *The Bourne Identity* and *24*).

## 1. High-Level Concept & Physical Architecture

**Indigo Storm** is a 30-episode, zero-setup serial card game packaged like an interactive season of television, told in three 10-episode acts. The narrative is strictly linear—players cannot branch or break the plot—but each 10-minute session presents a tight tactical puzzle where performance earns **0 to 3 Stars**, and scripted milestones unlock permanent, rule-breaking operative perks across the month.

### Physical Components

- **Operative Deck:** Your personal deck, stored in the box between sessions. It begins as the **12-card Core Operative Deck** (the protagonist's baseline training and instincts). Each day adds exactly **3 new player cards** for a 15-card deck, and each day ends by discarding back down to **12**.
- **30 Sealed Episode Packs (Day 1 – Day 30):** Each pack includes a **numbered storage divider** so packs can be re-sorted for long-term storage or passed along to a friend. Every pack contains **everything that day needs**—nothing is pulled from elsewhere in the box:
  - *Intro Card(s):* Narrative briefing, setup notes, today's starting track positions, and today's three Star conditions (the **Lead target**, the **Exposure threshold**, and a one-off **Bonus Objective**), and sometimes an **Episode Twist**—a one-line rule that applies to that day only (e.g., *"Night op: the Scene Row has 4 slots today"*). A day may have more than one Intro Card.
  - *Rule Card(s):* Standard-sized, double-sided cards that teach new rules or serve as reference. Only on rule-injection days (see Section 5); a day may have several.
  - *Player Cards (exactly 3):* Training, Gear, or Ally cards stamped with `[DAY X]`, added to your deck for today.
  - *Threat Cards (today's full Threat Deck, typically 8–10):* Recurring enemies are simply reprinted in each pack they appear in.
  - *Outro Card(s):* Narrative resolution, cliffhanger teaser, permanent unlock prompts, and (on Days 10, 20, and 30) tiered Act Debrief or Epilogue text. A day may have more than one.
  - *Replacement cards (some days only):* **Awakened Cards** on flashback days and **Countermeasure Cards** on Two-Phase Threat days (see Section 5).
  - *Rough size:* about 13–15 cards on a normal day, a few more on rule-injection days (final counts once each day's contents are specified).
- **Dry-Erase Campaign Sheet & Marker:** A single durable board used across all 30 days to track **Exposure** (Heat), **Lead** (Progress), **Clearance Upgrades**, and the **30-Day Star Grid**.
- **2 Tracking Tokens (or Dry-Erase Pips):** One for the **Lead Track** and one for the **Exposure Track**.
- **4 Timer Dice (six-sided):** Placed on timed Threats to count down their turns.
- **Card backs:** Player cards share one back and Threat cards share another, so each can be shuffled. Encrypted Threats have their own *Encrypted* back (so you can see an Encrypted Threat coming, but not what it is). Story and replacement cards have distinct backs: Intro and Rule Cards (*Briefing*), Outro Cards (*Read after the episode*—packed face-down at the back of the pack), Awakened Cards (*Flashback—read only when awakened*), and Countermeasure Cards (*Countermeasure*). No card is double-sided except Rule Cards, which are never shuffled.

## 2. Core Gameplay Loop (The 10-Minute Session)

### Pre-Session Setup (~45 Seconds)

1. Open today's Episode Pack and read the **Intro Card(s)** (and any **Rule Cards**).
2. **Prepare Your Deck:** Shuffle today's **3 player cards** into your 12-card Operative Deck (15 cards total). Draw an opening hand of **4 cards**.
3. **Prepare the Scene Row:** Set aside any Awakened or Countermeasure Cards without reading them. Shuffle all of today's **Threat Cards** into the **Threat Deck** and deal **3** face-up in a horizontal line—this is the active **Scene Row**. Whenever a Threat with a timer enters the Scene Row, place a **Timer Die** on it showing its timer value.
   - *Design note:* The total Lead rewards in a day's Threat Deck should exceed that day's Lead target by at least 2–3, so the objective is reachable without clearing every Threat.
4. **Set the Tracks:** Set the **Lead** and **Exposure** markers to the starting values listed on today's Intro Card.

### Card Anatomy (Operative Deck)

Every player card shows its class and a stamp (`CORE` or `[DAY X]`) that tells you where it is stored if it leaves your deck.

The three suits / approaches:

- 👁️ **Recon** (Surveillance, hacking, decryption, social engineering)
- 🥷 **Stealth** (Infiltration, disguises, misdirection, lockpicking)
- ⚡ **Force** (Close-quarters combat, breaching, parkour, driving)

#### Player Card Classes

*(Gear and Allies first appear on Day 6.)*

- **Training** (all Core cards are Training): Shows **1 Suit icon**, a **Power Value (`1` to `4`)**, and a **Tactical Ability** (a single-line effect, e.g., *"Stall 1 Timer," "Reduce Exposure by 1," "Draw 1 card," "Swap a Scene card"*). Played to a Threat for its Suit and Power, or for its Tactical Ability instead, then discarded.
- **Gear:** Equipment. When played, it stays on the table for the rest of the session and provides an **ongoing ability**. No Power.
- **Ally:** Contacts and assets. When played, it stays on the table and shows **1–2 suit symbols** that count toward every Threat you engage while it is in play. No Power. An Ally can be defeated to cancel a Pressure effect (see Step 2).

Playing a Gear or Ally card counts as one of your 2 card plays for the turn.

*Design note — no in-play caps:* There is no rule limiting how many Gear or Allies can be in play. The design keeps them in check instead: each one costs a play and carries no Power (so it's tempo spent now for value later), Allies leave play when spent to cancel Pressure, the end-of-day cut to 12 limits how many a deck can carry, and pack distribution controls how many exist at all.

### Turn Structure (~35 Seconds Per Turn)

Players cycle through their 15-card deck **once**. Because you play exactly 2 cards and draw 2 cards each turn, every episode lasts **exactly 8 turns** (15 cards ÷ 2, with 1 card on the last turn) unless it ends early. Each turn has three steps:

#### Step 1: Play 2 Cards

Play **exactly 2 cards** from your hand (if you have only 1 card left, play it). Each card can be used in one of three ways:

- **Engage the Scene Row:** Each Threat shows a **requirement**—a number of suit symbols plus a Power total (e.g., `🥷🥷 + 5`)—in its **preferred suit**, and may list an **alternate suit**. Play Training cards to a Threat by tucking them under it: each provides **1 symbol of its suit** and its **Power**. Symbols on your Allies in play also count. Cards and symbols of either the preferred or the alternate suit count toward the requirement; when both the symbols and the Power are met, the Threat is cleared.
  - *Progress carries over:* Cards stay under a Threat across turns until it is cleared, so a big Threat can be worn down over several turns. If a Threat leaves the Scene Row without being cleared (it escapes, is Vanished, or is swapped), the cards under it are discarded.
  - *Clean Clear:* If everything that counted toward the Threat (cards under it and Ally symbols) was the **preferred suit**, also gain the Threat's **Clean bonus** (typically −1 Exposure).
  - *Clearing a Threat:* Discard the cleared Threat Card and the cards under it, immediately claim its **Reward** (typically advancing the **Lead Track**, reducing **Exposure**, or drawing a card), and slide a new card from the Threat Deck into the empty Scene Row slot. If the Threat Deck is empty, the slot stays empty.
- **Use a Tactical Ability:** Play a Training card for its ability text instead of to a Threat, then discard it.
- **Deploy Gear or Allies:** Place them on the table, where they stay for the rest of the session.

#### Step 2: Resolve Scene Pressure & Tracks

Any Threat Card still remaining in the Scene Row is "live" and triggers its **End-of-Turn Pressure**:

- **Timers tick down:** Turn each Timer Die down by 1 (e.g., *"Encrypted Laptop: timer 3"*). When a timer reaches 0, the Threat **escapes**: apply its printed **Expiry effect** (typically +1 or +2 Exposure), then discard it and refill its slot from the Threat Deck.
- **Active Hazards escalate Exposure** (e.g., *"+1 Exposure"* or *"-1 Lead"*).
- **Blockers restrict options** (e.g., *"Armed Overwatch: You cannot advance Lead until this card is cleared"*).
- **Ally Cover:** Before any one Pressure effect (including an Expiry effect) resolves, you may **defeat one of your Allies** in play (move it to your discard pile) to cancel that effect. Defeat lasts only for the session—the card returns to your deck afterward.

#### Step 3: Refresh Hand

- Draw **2 cards** from your Operative Deck (or as many as remain). Your hand stays at 4 cards until the deck runs out.

### Session End & Tiered Scoring (No Hard Failure)

An episode ends immediately when any of the following occur:

1. **Objective Secured:** Your **Lead Track** reaches today's **Lead target** (set on the Intro Card, e.g., `+8 Lead`).
2. **Cover Blown:** Your **Exposure Track** hits the maximum redline (e.g., `6 Exposure`).
3. **Out of Time:** Your 15-card Operative Deck is empty and you have no cards left in hand.
4. **Scene Cleared:** The Scene Row (including any Pursuer) and the Threat Deck are both empty. Gain a **+1 Lead bonus** (tunable), then score.

**Episode Rating (0–3 Stars):** Players **always** advance to the next day's story regardless of how the session ended. Score each Star independently and record the total on the campaign sheet:

- ★ **Objective Star:** You reached today's Lead target.
- ★ **Cover Star:** Your final Exposure is at or below today's Exposure threshold.
- ★ **Bonus Star:** You completed today's Bonus Objective (e.g., *"Clean Clear the Courier"*).

All three conditions are listed on the Intro Card.

No Stars is a possible result.

### Post-Session Cleanup (~30 Seconds) — Deck Construction

1. **Flashbacks:** If today's Conditioned Card didn't awaken during play, it awakens now (see Section 5).
2. **Gather your 15 player cards:** hand, discard pile, draw pile, and any Gear/Allies in play.
3. **Discard down to 12:** Choose **3** cards to retire (any cards, including today's new ones). Each retired card goes back to the place its stamp names—its day's pack, or the Core slot in the box—and is out of the campaign. This is the game's only deck-construction step.
4. **Pack up:** Return today's Intro, Rule, Threat, and Outro Cards to today's pack behind its storage divider, store your 12-card deck in the box, and erase any perk "used" marks on the sheet.

## 3. Dual-Track Tension System (Lead vs. Exposure)

Rather than a static scoreboard, every session is a push-pull race between two opposing tracks on the dry-erase sheet:

| Track                         | Thematic Role                                                | How It Moves                                                 | Mechanical Impact                                            |
| ----------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| **LEAD TRACK** *(0 to the day's target, up to 8)* | Measures how close you are to cracking the day's objective, extracting data, or escaping a tail. | **Advances (+):** Threat rewards and the Scene Cleared bonus. **Retreats (-):** Pressure effects (e.g., ambushes). | Reaching today's Lead target immediately ends the episode and earns the Objective Star. |
| **EXPOSURE TRACK** *(0 to 6)* | Measures tactical heat, blown cover, physical injury, and enemy alert status. | **Increases (+):** Leaving active Guards/Cameras uncleared at end of turn; Threat timers running out. **Decreases (-):** Clean Clears, playing tactical misdirection cards, or clearing "Clean Sweep" Threats. | Hitting the redline (`6`) immediately ends the episode (you barely escape alive). Ending at or below today's Exposure threshold earns the Cover Star. |

## 4. Campaign Progression & High-Impact Permanent Checkboxes

### Design Guardrails

- **Fast Setup & Teardown:** The game is built for 10 minutes once a day. Everything a day needs is in its pack, and deck construction is a single 3-card cut at the end of each day.
- **Simple Rules Over Restrictions:** Avoid easy-to-forget limit rules (e.g., "only 2 of X in play"). Let card costs, card counts, and natural churn keep things in check instead.
- **Bonuses Over Penalties:** When a design choice could go either way, prefer the reward. Penalties are still fine where they're the natural consequence (e.g., a Threat's timer running out raises Exposure).
- **Zero Story Gating:** Permanent upgrades never lock or unlock specific narrative branches. All players experience the exact same 30-day story arc, with Star totals choosing a tier of flavor text in each **Act Debrief** (Days 10 and 20) and the final **Epilogue** (Day 30).
- **Aggregate 30-Day Balance:** Every player unlocks the **exact same total number of checkboxes (7 unlocks)** over the 30-day campaign. Individual episodes will favor different branches (10 Stealth-heavy days, 10 Recon-heavy days, 10 Force-heavy days), allowing players to feel overpowered on their signature days while keeping total 30-day Star potential balanced across all perk loadouts.

### The Conditioning & Tradecraft Matrix (Dry-Erase Sheet)

At the top of the sheet are **7 Clearance Slots**. The Outros of **Days 3, 7, 10, 13, 17, 20, and 24** each say *"Unlock 1 Clearance Perk"*: fill a slot and check any open box in one of three asymmetric branches. Unlocks stop after Day 24, so the final stretch is played with the full kit.

**Every perk can be used once per session.** Each perk has a "used" box on the sheet: mark it when you use the perk, and erase the marks during cleanup.

#### Branch 1: GHOST (Stealth & Misdirection)

- `[ ] Vanish:` Immediately discard any Threat Card from the Scene Row (unless its card says otherwise) without clearing it (claim no reward).
- `[ ] Cloned Credentials:` During setup, search your 15-card deck for **1 specific card** and place it in your opening hand before shuffling.
- `[ ] False Trail:` This turn, ignore up to **2 Exposure** you would gain, and gain **+1 Lead**.
- `[ ] Sleeper Instinct:` When you play a 🥷 Stealth card for its Tactical Ability, **also** tuck it under a Threat afterward, where it counts for its symbol and Power.

#### Branch 2: ANALYST (Recon & Preparation)

- `[ ] Satellite Overwrite:` Look at the top 4 cards of the Threat Deck, discard up to 2 of them, and arrange the rest in any order.
- `[ ] Contingency Plan:` Draw **2 extra cards**.
- `[ ] Pattern Recognition:` When you clear a Threat Card with **3 or more excess Power**, draw 1 card.
- `[ ] Master Decryptor:` Treat **all cards in your hand as any Suit** for an entire turn.

#### Branch 3: OPERATIVE (Force & Improvisation)

- `[ ] Adrenaline Surge:` Skip **Step 2: Resolve Scene Pressure** for one turn (timers don't tick and no Pressure resolves).
- `[ ] Improvised Weapon:` When you tuck a card under a Threat, it counts as **any suit** and its **Power is doubled**.
- `[ ] Hardened Resolve:` When you would reach the Exposure redline, stop **1 below it** instead.
- `[ ] Kinetic Momentum:` When you clear a Threat Card using ⚡ Force, carry any excess Power directly onto another Threat in the Scene Row.

## 5. Story Structure & Rule-Injection Days

The campaign is a three-act season with **10 episodes per act**. There is **no separate rulebook**: rules are taught progressively on standard-sized, double-sided Rule Cards inside specific Episode Packs (a day may include several). New rules arrive **every 5 days**: a major mechanic at the start of each act and a smaller twist at each act's midpoint. Between rule days, freshness comes from new player cards, each day's Bonus Objective, and occasional one-day Episode Twists on Intro Cards.

**Act I — Amnesia & Extraction (Days 1–10)**

1. **Day 1 — Base Rules:** Teaches the 15-card deck, 3-card Scene Row, symbol/Power requirements (including cards staying on Threats), Tactical Abilities, the Lead/Exposure tracks, and the three Star conditions. Day 1's Outro walks through the first end-of-day cut to 12 cards.
2. **Day 6 — Gear & Allies:** Introduces the Gear and Ally card classes and Ally Cover. (Days 1–5 hand out Training cards only.)
- **Day 10 — Act I Debrief.**

**Act II — Inside the Program (Days 11–20)**

3. **Day 11 — Encrypted Threats:** Some Threat cards have an **Encrypted** back.
   - *Face-down:* When an Encrypted Threat enters the Scene Row, it goes in **face-down**. While face-down it has no Pressure and no timer, and you can't tuck cards under it—it just occupies its slot.
   - *Decrypt:* Play any 👁️ Recon card to it (one of your 2 plays) and flip it face-up, placing a Timer Die if it has a timer. If Recon is its preferred or alternate suit, the card stays under it and counts; otherwise discard the card.
   - *Worth cracking:* Encrypted Threats carry richer Rewards than normal Threats (typically +1 Lead).
   - Master Decryptor's "any suit" counts as Recon for decrypting.
4. **Day 16 — Memory Flashbacks (midpoint twist):** Introduces **Conditioned Cards**. Three flashbacks arrive on **Days 16, 19, and 22**, and each one happens **the same day it arrives**, so every player sees every flashback, in story order:
   - The Conditioned Card is one of the day's 3 player cards. Its matching **Awakened Card**—the stronger version, carrying the flashback scene—waits in the same pack behind a *Flashback* back.
   - *Awaken during play (bonus):* The Conditioned Card prints a trigger checked when you play it (e.g., *"If you play this at 4+ Exposure..."*). If the trigger is met, swap in the Awakened Card and play it instead, gain its printed **Awakening bonus** (e.g., +1 Lead), and read the flashback.
   - *Awaken at the end:* If it hasn't awakened by the end of the episode, for any reason, it awakens during cleanup: read the flashback and swap in the Awakened Card (no bonus).
   - The dormant card goes back in the pack. From then on, the Awakened Card is an ordinary player card that can be retired in the cut like any other.
- **Day 20 — Act II Debrief.**

**Act III — Burn Notice (Days 21–30)**

5. **Day 21 — Hunter-Killer Operatives:** Introduces **Pursuers**.
   - *Setup:* The Intro Card places a Pursuer in a **4th Scene Row slot** at the start of the episode. It isn't part of the Threat Deck.
   - *Neutralize:* It's cleared like any Threat (symbols + Power, cards stay under it) but needs far more—a multi-turn project. Clearing it claims its Reward, and its slot stays empty.
   - *Hunt and Strike:* Instead of a timer, it shows a **Hunt** number. Place a Timer Die on it set to that number and turn it down by 1 each Pressure step. At 0 the Pursuer **Strikes** (apply its printed Strike effect, e.g., +2 Exposure) and the die resets to its Hunt number. Pursuers never escape.
   - Ally Cover can cancel a Strike, and Stall and Adrenaline Surge work on its die like any timer. Pursuer cards say *"Cannot be Vanished."* Some Pursuers also print an ongoing effect that counters a suit (e.g., *"Your Stealth cards get −1 Power"*).
   - *Scene Cleared* requires the Pursuer to be neutralized too.
6. **Day 26 — Black-Site Lockdown:** Introduces **Two-Phase Threats** for the final 5-episode climax. When you clear one, claim its Reward as usual, then put its matching **Countermeasure Card** (set aside during setup) into the same Scene Row slot—an internal security response you must clear in turn.
- **Day 30 — Epilogue.**

**Act Debriefs & Epilogue:** The Outros of Days 10 and 20 each include three tiers of short debrief text; read the one matching your Star total for that act (0–30). The Day 30 Epilogue works the same way using your total for the whole campaign (0–90). Tiers are flavor only and never change the story that follows.

## 6. Recommended Next Steps for Prototyping

1. **Prototype the six rule days (Days 1, 6, 11, 16, 21, 26).** Each day after Day 1 comes with a **Jump-In Card**: a preset 12-card deck typical for that point in the campaign (including stand-in cards marked `PROTO`, which represent cards from days not yet written) and the Clearance Perks to treat as unlocked. Day cards and Threats are tuned with the simulator before printing, and the stand-ins are retired once the full 30 days are written. Run any prototype day with `python3 indigo_sim.py --day 11` (add `--log` to watch one episode). Build printable cards with `python3 make_print.py`: one PDF per day's pack (fronts and mirrored backs for long-edge duplex), plus the Core deck, prototype extras and the campaign sheet, in `print/`. Record sessions in `Indigo Storm - Playtest Log.md`.

   *First tuning pass (simulated player, jump-in deck and perks):*

   | Day | Mechanic | Target Objective / Cover | Simulated | Avg. turns | Notes |
   | --- | --- | --- | --- | --- | --- |
   | 1 | Base rules | ~85% / ~90% | 81% / 100% | 6.4 | |
   | 6 | Gear & Allies | ~75% / ~85% | 71% / 94% | 6.8 | |
   | 11 | Encrypted Threats | ~65% / ~75% | 73% / 84% | 6.1 | ~1.5 decrypts per episode |
   | 16 | Memory Flashbacks | ~65% / ~75% | 63% / 70% | 6.7 | Awakens during play ~60% of the time |
   | 21 | Pursuers | ~50% / ~70% | 59% / 72% | 6.7 | Pursuer neutralized ~20% of the time |
   | 26 | Two-Phase Threats | ~50% / ~70% | 50% / 89% | 7.0 | |

   *Tuning lessons:* (1) Every Threat needed about +1 Power over the generator's guide, and later days more, because jump-in decks and perks are strong. (2) Exposure only builds when some Lead-reward Threats also apply Pressure ("guarded" targets); hazards alone get cleared too fast. (3) False Trail originally converted *all* incoming Exposure into Lead, which took Day 6 from 33% to 90% Objective; it is now capped. (4) Cover runs high on Days 1, 6 and 26, partly because the simulated player avoids Exposure more carefully than people do. (5) No timed Threat escaped on any day: timers may be too gentle. Watch for this in playtests.
2. **Calibrate the Math:** Verify that an average 15-card deck generates roughly **28–35 total Power** across a single pass through the deck, and tune Threat requirements so each Star feels earned on its own and getting all 3 requires tight ability sequencing.
   - *Early numbers (15 Training cards at 5 per suit with Power 1/1/2/3/4):* every episode is exactly **8 turns**, so up to **8 Pressure steps**—tune Pressure and timers (3–5 turns) for that. Two cards average about **4.4 Power**. A 4-card hand holds 2+ cards of a given suit only about **40%** of the time, so Threats that need **1–2 symbols** can usually be cleared in one turn. Because cards stay on a Threat across turns, Threats with 3+ symbols or 7+ Power work as **multi-turn projects**, balanced by their timers and Pressure. Typical one-turn Power totals: **3–6**. (Needs a proper simulation with symbol requirements, Gear, and Allies.)
   - *Simulator:* `indigo_sim.py` in this folder plays thousands of episodes with a greedy player, reading the deck from the Cards workbook's **Sim Effect** column. First findings with the Day 1 deck and generated Threats (8 per day, ~55% one-symbol / ~40% two-symbol): at **2.2 Power per symbol** the Objective Star lands ~89% of the time in ~4.5 turns (far too easy); **3.4 Power per symbol** gives ~60% Objective / ~74% Cover in ~6 turns. Raising the share of hazard Threats (Exposure Pressure, no Lead reward) from 35% to 50% drops Objective to ~34%. Not yet simulated: Conditioned Cards, Face-Down Threats, Pursuers, Two-Phase Threats, perks, Episode Twists.
3. **Difficulty Curve (first tuning pass):** Target Star rates for the simulator's greedy player using the Day 1 deck, no perks. Real players should do somewhat better: they plan ahead, their decks improve, and they gain perks, while later rule additions push the other way. Re-run once those are simulated.

   | Days | Lead target | Start Exposure | Cover threshold | Threats | Power per symbol | Hazard share | Target Objective / Cover | Simulated | Avg. turns |
   | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
   | 1–3 (tutorial) | 7 | 0 | ≤3 | 9 | 2.4 | 25% | ~85% / ~90% | 87% / 94% | 4.9 |
   | 4–10 (Act I) | 8 | 0 | ≤2 | 9 | 2.4 | 25% | ~75% / ~85% | 79% / 89% | 5.6 |
   | 11–20 (Act II) | 8 | 0 | ≤2 | 9 | 2.6 | 30% | ~65% / ~75% | 64% / 80% | 6.2 |
   | 21–30 (Act III) | 8 | 1 | ≤2 | 9 | 3.0 | 30% | ~50% / ~70% | 46% / 73% | 6.7 |

   Episodes run longer as the campaign goes on (about 5 turns while learning, nearly 7 by Act III), since the Objective is reached later or not at all. At ~35 seconds per turn plus ~45 seconds of setup, ~30 seconds of cleanup, and story reading, sessions should run about 6–8 minutes. Turn speed itself can only be measured in playtests. The settings for each band are saved as `sim_days1-3.json`, `sim_act1.json`, `sim_act2.json`, and `sim_act3.json` (run with `python3 indigo_sim.py --config sim_act2.json`). *Power per symbol* and *hazard share* are guides for writing each day's Threats.
4. **Outline the 30-Day Story Beat Sheet:** All story material lives in the `spoilers/` folder (see its README) so the first full playthrough stays a surprise. Map the three 10-episode acts (Section 5) with key beats on Day 1 (inciting incident), Day 10 (Act I break), Days 15–16 (midpoint reveal, paired with Memory Flashbacks), Day 20 (Act II break), and Days 26–30 (climax: *Redact the Source*), so every day ends on a crisp narrative hook.

## 7. Open Design Questions

**Perk balance**
- All perks are now once per session; playtest their relative strength. Decide whether Master Decryptor counts as Recon for decrypting Face-Down Threats.

**Physical components**
- Layout for a 4th Scene Row slot (Pursuers, some Episode Twists).
- Total card count: roughly 30 packs × ~14 cards plus Rule Cards and the Core deck ≈ 450 cards—worth checking against manufacturing cost.
