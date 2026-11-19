#!/usr/bin/env python3
"""
Indigo Storm — episode simulator (v2)

Plays thousands of single episodes with a simple greedy player and reports how
often each Star is earned, how long episodes run, and where Exposure lands.

Rules simulated (from the design doc)
  * 15-card Operative Deck, opening hand 4, play exactly 2 cards a turn, draw 2.
  * Threats need N symbols + P Power in their preferred suit (alternate suit
    also counts). Cards tucked under a Threat stay there across turns.
  * Clean Clear bonus, Gear (passive power_bonus), Allies (ongoing symbols,
    Ally Cover), Pressure, Blockers, timers and Expiry effects.
  * Encrypted Threats (enter face-down, decrypted with a Recon card).
  * Pursuers (4th slot, Hunt die, Strike, never escape, suit penalties).
  * Two-Phase Threats (replaced by their Countermeasure when cleared).
  * Conditioned Cards (awaken when played if their trigger is met).
  * All 12 Clearance Perks, used once per session by simple heuristics.
  * Ends on Lead target, Exposure redline, Out of Time, or Scene Cleared.
    Objective Star and Cover Star are scored; Bonus Objectives and Episode
    Twists are not simulated.

Usage
  python3 indigo_sim.py --day 11              # a prototype day: jump-in deck, perks,
                                              # Threats and track settings from the workbooks
  python3 indigo_sim.py --day 11 --log        # print one full episode
  python3 indigo_sim.py --day 21 --set perks=[]          # same day with no perks
  python3 indigo_sim.py --day 6 --sweep episode.lead_target=7,8,9
  python3 indigo_sim.py --config sim_act2.json           # generated Threats (tuning bands)
  python3 indigo_sim.py --threats-day 1                  # Day 1 deck, workbook Threats

Workbooks read from this folder:
  "Indigo Storm - Cards.xlsx"         Player Cards, Threat Cards, Jump-In Setups
  "Indigo Storm - Episode Plan.xlsx"  Lead target, starting tracks, Cover threshold
Requires: pip install openpyxl
"""
import argparse
import copy
import json
import os
import random
import re
import statistics
import sys

SUITS = ("Recon", "Stealth", "Force")
HERE = os.path.dirname(os.path.abspath(__file__))
PERKS = ("vanish", "cloned_credentials", "false_trail", "sleeper_instinct", "satellite_overwrite",
         "contingency_plan", "pattern_recognition", "master_decryptor", "adrenaline_surge",
         "improvised_weapon", "hardened_resolve", "kinetic_momentum")

DEFAULT_CONFIG = {
    "episodes": 2000,
    "seed": None,
    "workbook": "Indigo Storm - Cards.xlsx",
    "plan": "Indigo Storm - Episode Plan.xlsx",
    "deck": {"days": [1], "ids": []},          # CORE + listed days' player cards, or explicit ids
    "perks": [],
    "episode": {
        "start_lead": 0, "lead_target": 6,
        "start_exposure": 0, "redline": 6, "cover_threshold": 3,
        "scene_slots": 3, "opening_hand": 4, "draw_per_turn": 2, "plays_per_turn": 2,
        "scene_cleared_bonus": 1,
    },
    "threats": {
        "source": "generate",                    # "generate" or "workbook"
        "day": None,
        "count": 8,
        "profile": {
            "focus_suit": None, "focus_weight": 0.5,
            "symbol_weights": {"1": 0.55, "2": 0.40, "3": 0.05},
            "power_per_symbol": 2.2, "power_jitter": [-1, 1],
            "alt_suit_chance": 0.5,
            "hazard_chance": 0.35, "hazard_exposure": 1,
            "timer_chance": 0.25, "timer_range": [3, 4], "timer_expiry_exposure": 2,
            "blocker_chance": 0.0,
            "lead_per_symbol": 1, "timer_lead_bonus": 1,
            "hazard_lead_reward": 0, "hazard_exposure_reward": -1,
            "clean_bonus_exposure": -1,
        },
    },
    "ai": {
        "lead": 12, "exposure": 9, "over_threshold": 10, "progress": 0.6,
        "pressure": 6, "hand_card": 2, "ally_symbol": 4, "gear": 4, "phantom_draw": 3,
        "face_down": 4, "wild_margin": 15,
    },
}


# ----------------------------------------------------------------------------- data

class PCard:
    __slots__ = ("id", "name", "cls", "suit", "power", "symbols", "effects", "trigger", "awakened", "bonus")

    def __init__(self, id, name, cls, suit, power, symbols, effects, trigger=None, awakened=None, bonus=None):
        self.id, self.name, self.cls, self.suit = id, name, cls, suit
        self.power, self.symbols, self.effects = power, symbols, effects
        self.trigger, self.awakened, self.bonus = trigger, awakened, bonus or {}

    def as_suit(self, suit, power_mult=1):
        c = copy.copy(self)
        c.suit, c.power = suit, self.power * power_mult
        return c

    def __repr__(self):
        if self.cls == "Ally":
            return f"{self.name}[Ally {'+'.join(self.symbols)}]"
        if self.cls == "Gear":
            return f"{self.name}[Gear]"
        tag = "*" if self.cls == "Conditioned" else ""
        return f"{self.name}[{self.suit[:1]}{self.power}{tag}]"


class Threat:
    __slots__ = ("id", "name", "kind", "pref", "alt", "sym", "pw", "timer", "reward", "clean",
                 "pressure", "expiry", "blocker", "pairs", "effects", "no_vanish")

    def __init__(self, **kw):
        for k in self.__slots__:
            setattr(self, k, kw.get(k))
        self.kind = self.kind or "Threat"
        self.effects = self.effects or []
        for d in ("reward", "clean", "pressure", "expiry"):
            if getattr(self, d) is None:
                setattr(self, d, {})

    @property
    def encrypted(self):
        return self.kind == "Encrypted Threat"

    @property
    def pursuer(self):
        return self.kind == "Pursuer"

    def __repr__(self):
        alt = f"/{self.alt[0]}" if self.alt else ""
        t = f" {'Hunt' if self.pursuer else 'T'}{self.timer}" if self.timer else ""
        tag = {"Encrypted Threat": "ENC ", "Pursuer": "PURSUER ", "Two-Phase Threat": "2P ", "Countermeasure": "CM "}.get(self.kind, "")
        return f"{tag}{self.name}<{self.pref[0]}{alt} {self.sym}sym {self.pw}pw{t}>"


class Live:
    __slots__ = ("t", "under", "bonus", "die", "cancel", "face_down")

    def __init__(self, t):
        self.t, self.under, self.bonus, self.cancel = t, [], 0, False
        self.face_down = t.encrypted
        self.die = None if self.face_down else t.timer

    def clone(self):
        n = Live.__new__(Live)
        n.t, n.under, n.bonus, n.die, n.cancel, n.face_down = self.t, list(self.under), self.bonus, self.die, self.cancel, self.face_down
        return n


def parse_effects(text):
    out = []
    for tok in (text or "").replace(",", ";").split(";"):
        tok = tok.strip()
        if tok:
            parts = tok.split(":")
            out.append((parts[0].strip().lower(), [p.strip() for p in parts[1:]]))
    return out


def parse_delta(text):
    """'+2 Lead; -1 Exposure; Draw 1' -> {'lead':2,'exposure':-1,'draw':1}"""
    d = {}
    t = (text or "").lower().replace("−", "-")
    for m in re.finditer(r"([+-]?\d+)\s*(lead|exposure)", t):
        d[m.group(2)] = d.get(m.group(2), 0) + int(m.group(1))
    m = re.search(r"draw\s*(\d+)", t)
    if m:
        d["draw"] = int(m.group(1))
    return d


def parse_trigger(text):
    t = (text or "").lower()
    m = re.search(r"(\d+)\+?\s*exposure", t)
    if m:
        return ("exposure", int(m.group(1)))
    m = re.search(r"(\d+)\+?\s*lead", t)
    if m:
        return ("lead", int(m.group(1)))
    if "ally" in t:
        return ("allies", 1)
    if "gear" in t:
        return ("gear", 1)
    return None


# ----------------------------------------------------------------------------- loading

_WB_CACHE = {}


def wb_rows(path, sheet):
    key = (path, sheet)
    if key not in _WB_CACHE:
        try:
            from openpyxl import load_workbook
        except ImportError as e:
            sys.exit(f"Couldn't import {e.name!r} ({e}).\nThis Python is {sys.executable}\n"
                     "Install the requirements into it with:  python3 -m pip install -r requirements.txt")
        wb = load_workbook(path, data_only=True)
        if sheet not in wb.sheetnames:
            _WB_CACHE[key] = []
        else:
            rows = list(wb[sheet].iter_rows(values_only=True))
            head = [str(h).strip() if h is not None else "" for h in rows[0]]
            _WB_CACHE[key] = [dict(zip(head, r)) for r in rows[1:] if r and r[0]]
    return _WB_CACHE[key]


def day_str(v):
    if v is None:
        return ""
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    return str(v).strip()


def card_from_row(r):
    sym = [s.strip() for s in re.split(r"[+/,]", str(r.get("Ally Symbols") or "")) if s.strip()]
    return PCard(r["ID"], r.get("Name") or r["ID"], r.get("Class") or "Training", r.get("Suit") or "",
                 int(r.get("Power") or 0), sym, parse_effects(r.get("Sim Effect")),
                 trigger=parse_trigger(r.get("Awakening Trigger")), bonus=parse_delta(r.get("Awakening Bonus")))


def load_deck(cfg):
    rows = wb_rows(os.path.join(HERE, cfg["workbook"]), "Player Cards")
    by_id = {r["ID"]: r for r in rows}
    ids = cfg["deck"].get("ids") or []
    if ids:
        missing = [i for i in ids if i not in by_id]
        if missing:
            sys.exit(f"Deck card IDs not found in the workbook: {missing}")
        picked = [by_id[i] for i in ids]
    else:
        days = {str(d) for d in cfg["deck"].get("days") or []}
        picked = [r for r in rows if day_str(r.get("Day")) == "CORE" or day_str(r.get("Day")) in days]
    deck = []
    for r in picked:
        c = card_from_row(r)
        if c.cls == "Conditioned":
            pair = by_id.get(r.get("Pairs With"))
            if pair:
                c.awakened = card_from_row(pair)
        deck.append(c)
    if len(deck) != 15:
        print(f"Warning: deck has {len(deck)} cards (expected 15).", file=sys.stderr)
    return deck


def threat_from_row(r):
    press = str(r.get("End-of-Turn Pressure") or "")
    rules = str(r.get("Rules Text") or "")
    return Threat(id=r["ID"], name=r.get("Name") or r["ID"], kind=r.get("Type") or "Threat",
                  pref=r.get("Preferred Suit"), alt=r.get("Alternate Suit") or None,
                  sym=int(r.get("Symbols Required") or 1), pw=int(r.get("Power Required") or 0),
                  timer=int(r["Timer"]) if r.get("Timer") not in (None, "") else None,
                  reward=parse_delta(r.get("Reward")), clean=parse_delta(r.get("Clean Bonus")),
                  pressure=parse_delta(press), expiry=parse_delta(r.get("Expiry Effect")),
                  blocker="blocker" in press.lower(), pairs=r.get("Pairs With"),
                  effects=parse_effects(r.get("Sim Effect")), no_vanish="cannot be vanished" in rules.lower())


def load_threats_from_workbook(cfg, day):
    rows = wb_rows(os.path.join(HERE, cfg["workbook"]), "Threat Cards")
    out = [threat_from_row(r) for r in rows if day_str(r.get("Day")) == str(day)]
    if not out:
        sys.exit(f"No Threat Cards found for Day {day} in the workbook.")
    return out


def apply_day(cfg, day):
    """Fill cfg from the workbooks for a prototype day: jump-in deck, perks, Threats, tracks."""
    cards = os.path.join(HERE, cfg["workbook"])
    jumps = {day_str(r.get("Day")): r for r in wb_rows(cards, "Jump-In Setups")}
    day = str(day)
    j = jumps.get(day)
    base = [s.strip() for s in str(j["Deck (12 cards)"]).split(",") if s.strip()] if j else \
        [r["ID"] for r in wb_rows(cards, "Player Cards") if day_str(r.get("Day")) == "CORE"]
    todays = [r["ID"] for r in wb_rows(cards, "Player Cards")
              if day_str(r.get("Day")) == day and r.get("Class") != "Awakened"]
    cfg["deck"] = {"ids": base + todays}
    cfg["perks"] = [p.strip().lower().replace(" ", "_") for p in str(j.get("Perks") or "").split(",") if p.strip()] if j else []
    cfg["threats"]["source"], cfg["threats"]["day"] = "workbook", day
    plan = {day_str(r.get("Day")): r for r in wb_rows(os.path.join(HERE, cfg["plan"]), "Episode Plan")}
    p = plan.get(day)
    if p:
        e = cfg["episode"]
        for col, key in (("Start Lead", "start_lead"), ("Lead Target", "lead_target"), ("Start Exposure", "start_exposure"),
                         ("Exposure Redline", "redline"), ("Cover Star Threshold", "cover_threshold")):
            if p.get(col) is not None:
                e[key] = int(p[col])
    return cfg


def generate_threats(cfg, rng):
    p, n = cfg["threats"]["profile"], cfg["threats"]["count"]
    weights = {int(k): v for k, v in p["symbol_weights"].items()}
    out = []
    for i in range(n):
        pref = p["focus_suit"] if p["focus_suit"] and rng.random() < p["focus_weight"] else rng.choice(SUITS)
        alt = rng.choice([s for s in SUITS if s != pref]) if rng.random() < p["alt_suit_chance"] else None
        sym = rng.choices(list(weights), list(weights.values()))[0]
        pw = max(1, round(sym * p["power_per_symbol"] + rng.uniform(*p["power_jitter"])))
        hazard = rng.random() < p["hazard_chance"]
        timed = (not hazard) and rng.random() < p["timer_chance"]
        blocker = (not hazard) and (not timed) and rng.random() < p["blocker_chance"]
        if hazard:
            reward = {"lead": p["hazard_lead_reward"], "exposure": p["hazard_exposure_reward"]}
            pressure = {"exposure": p["hazard_exposure"]}
        else:
            reward = {"lead": sym * p["lead_per_symbol"] + (p["timer_lead_bonus"] if timed else 0)}
            pressure = {}
        out.append(Threat(id=f"G{i+1}", name=("Hazard" if hazard else "Timed" if timed else "Blocker" if blocker else "Target") + str(i + 1),
                          pref=pref, alt=alt, sym=sym, pw=pw, timer=rng.randint(*p["timer_range"]) if timed else None,
                          reward={k: v for k, v in reward.items() if v}, clean={"exposure": p["clean_bonus_exposure"]},
                          pressure=pressure, expiry={"exposure": p["timer_expiry_exposure"]} if timed else {}, blocker=blocker))
    return out


# ----------------------------------------------------------------------------- game

class Game:
    def __init__(self, cfg, deck, threats, rng, log=None):
        e = self.e = cfg["episode"]
        self.cfg, self.rng, self.w, self.log = cfg, rng, cfg["ai"], log
        self.perks = {p: True for p in cfg.get("perks", []) if p in PERKS}   # True = still unused
        unknown = [p for p in cfg.get("perks", []) if p not in PERKS]
        if unknown and log is not None:
            log.append(f"  (unknown perks ignored: {unknown})")
        self.st = {"clears": 0, "clean": 0, "escapes": 0, "covers": 0, "decrypts": 0, "strikes": 0,
                   "awakened": 0, "pursuer_down": 0, "perks_used": 0,
                   "lead_budget": sum(t.reward.get("lead", 0) for t in threats if t.kind != "Countermeasure")}
        self.hypo, self.over, self.end_reason = False, False, None
        self.turn, self.clean_next, self.phantom, self.wild = 0, False, 0, False
        self.false_trail_on, self.has_pursuer = False, False
        self.ft_absorb, self.ft_lead_given = 0, False
        self.gear, self.allies = [], []
        self.lead, self.exp = e["start_lead"], e["start_exposure"]
        self.counter = {t.id: t for t in threats if t.kind == "Countermeasure"}
        pursuers = [t for t in threats if t.pursuer]
        self.tdeck = [t for t in threats if t.kind not in ("Countermeasure", "Pursuer")]
        rng.shuffle(self.tdeck)
        self.deck = list(deck)
        rng.shuffle(self.deck)
        self.hand = []
        if self.use_perk("cloned_credentials"):
            best = max((c for c in self.deck if c.cls in ("Training", "Conditioned")), key=lambda c: c.power, default=None)
            if best:
                self.deck.remove(best); self.hand.append(best)
                self.say(f"Cloned Credentials: start with {best}")
        while len(self.hand) < e["opening_hand"] and self.deck:
            self.hand.append(self.deck.pop())
        self.row = [None] * e["scene_slots"]
        if pursuers:
            self.row.append(Live(pursuers[0])); self.has_pursuer = True
        if self.use_perk("satellite_overwrite"):
            self.satellite()
        for i in range(e["scene_slots"]):
            self.refill(i)

    # -- helpers
    def say(self, msg):
        if self.log is not None:
            self.log.append(f"  {msg}")

    def use_perk(self, name):
        if self.perks.get(name):
            self.perks[name] = False
            self.st["perks_used"] += 1
            return True
        return False

    def clone(self):
        g = Game.__new__(Game)
        g.__dict__.update({k: v for k, v in self.__dict__.items()})
        g.log, g.hypo = None, True
        g.hand, g.gear, g.allies = list(self.hand), list(self.gear), list(self.allies)
        g.row = [l.clone() if l else None for l in self.row]
        g.perks, g.st = dict(self.perks), dict(self.st)
        return g

    def pursuer_slot(self, i):
        return self.has_pursuer and i == len(self.row) - 1

    def blocked(self):
        return any(l and not l.face_down and l.t.blocker for l in self.row)

    def suit_penalty(self, suit):
        pen = 0
        for l in self.row:
            if l and not l.face_down:
                for op, args in l.t.effects:
                    if op == "suit_penalty" and args and args[0] == suit:
                        pen += int(args[1]) if len(args) > 1 else 1
        return pen

    # -- tracks
    def gain_lead(self, n):
        if n > 0 and self.blocked():
            return
        self.lead = max(0, self.lead + n)
        if self.lead >= self.e["lead_target"]:
            self.finish("Objective Secured")

    def gain_exp(self, n):
        if n > 0 and self.false_trail_on and self.ft_absorb > 0:
            absorbed = min(n, self.ft_absorb)
            self.ft_absorb -= absorbed
            n -= absorbed
            self.say(f"False Trail ignores {absorbed} Exposure")
            if not self.ft_lead_given:
                self.ft_lead_given = True
                self.gain_lead(1)
            if n <= 0 or self.over:
                return
        new = max(0, self.exp + n)
        if new >= self.e["redline"] and self.use_perk("hardened_resolve"):
            new = self.e["redline"] - 1
            self.say("Hardened Resolve: stop 1 below the redline")
        self.exp = new
        if self.exp >= self.e["redline"]:
            self.finish("Cover Blown")

    def finish(self, why):
        if not self.over:
            self.over, self.end_reason = True, why
            self.say(f"** Episode ends: {why}")

    def draw(self, n):
        if self.hypo:
            self.phantom += n
            return
        for _ in range(n):
            if self.deck:
                self.hand.append(self.deck.pop())

    def apply_delta(self, d):
        if d.get("lead"):
            self.gain_lead(d["lead"])
        if d.get("exposure") and not self.over:
            self.gain_exp(d["exposure"])
        if d.get("draw") and not self.over:
            self.draw(d["draw"])

    # -- threats
    def counts(self, l):
        t = l.t
        suits = {t.pref, t.alt} - {None}
        sym = len(l.under) + sum(1 for a in self.allies for s in a.symbols if s in suits)
        pw = sum(max(0, c.power - self.suit_penalty(c.suit)) for c in l.under) + l.bonus
        pref_sym = sum(1 for c in l.under if c.suit == t.pref) + sum(1 for a in self.allies for s in a.symbols if s == t.pref)
        clean = all(c.suit == t.pref for c in l.under) and pref_sym >= t.sym
        return sym, pw, clean

    def enter(self, i, t):
        self.row[i] = Live(t)
        self.say(f"Enters: {t}" + (" (face-down)" if self.row[i].face_down else ""))

    def refill(self, i):
        if self.pursuer_slot(i) or self.hypo or not self.tdeck:
            self.row[i] = None
        else:
            self.enter(i, self.tdeck.pop())

    def check_scene_cleared(self):
        if not self.over and not self.hypo and not self.tdeck and all(l is None for l in self.row):
            self.say("Scene Cleared")
            self.gain_lead(self.e["scene_cleared_bonus"])
            self.finish("Scene Cleared")

    def resolve_clear(self, i, l, clean, excess):
        t = l.t
        self.st["clears"] += 1
        if clean:
            self.st["clean"] += 1
        if t.pursuer:
            self.st["pursuer_down"] += 1
        self.say(f"CLEAR {t}{' (Clean)' if clean else ''} -> {t.reward}")
        self.row[i] = None
        self.apply_delta(t.reward)
        if clean and not self.over:
            self.apply_delta(t.clean)
        if self.over:
            return
        if excess >= 3 and self.use_perk("pattern_recognition"):
            self.say("Pattern Recognition: draw 1"); self.draw(1)
        if excess > 0 and any(c.suit == "Force" for c in l.under) and self.perks.get("kinetic_momentum"):
            targets = [x for x in self.row if x and not x.face_down]
            if targets and self.use_perk("kinetic_momentum"):
                tgt = max(targets, key=lambda x: self.counts(x)[1] / max(1, x.t.pw))
                tgt.bonus += excess
                self.say(f"Kinetic Momentum: +{excess} Power carried to {tgt.t}")
        if t.kind == "Two-Phase Threat" and t.pairs in self.counter:
            self.enter(i, self.counter[t.pairs])
        else:
            self.refill(i)

    def check_clears(self):
        changed = True
        while changed and not self.over:
            changed = False
            for i, l in enumerate(self.row):
                if self.over or not l or l.face_down:
                    continue
                sym, pw, clean = self.counts(l)
                if sym >= l.t.sym and pw >= l.t.pw:
                    clean = clean or self.clean_next
                    self.clean_next = False
                    self.resolve_clear(i, l, clean, pw - l.t.pw)
                    changed = True
        self.check_scene_cleared()

    # -- actions: (card_index, kind, target, extra)
    def actions(self):
        acts = []
        wild = self.wild
        for ci, c in enumerate(self.hand):
            if c.cls in ("Gear", "Ally"):
                acts.append((ci, "deploy", None, None))
                continue
            for ti, l in enumerate(self.row):
                if not l:
                    continue
                if l.face_down:
                    if c.suit == "Recon" or wild:
                        acts.append((ci, "decrypt", ti, None))
                    continue
                if wild or c.suit in (l.t.pref, l.t.alt):
                    acts.append((ci, "tuck", ti, None))
                if self.perks.get("improvised_weapon"):
                    acts.append((ci, "weapon", ti, None))
            targets = self.ability_targets(c)
            if targets:
                acts.extend((ci, "ability", t, None) for t in targets)
                if c.suit == "Stealth" and self.perks.get("sleeper_instinct"):
                    for ti, l in enumerate(self.row):
                        if l and not l.face_down and c.suit in (l.t.pref, l.t.alt):
                            acts.append((ci, "sleeper", targets[0], ti))
            else:
                acts.append((ci, "dump", None, None))
        return acts

    def ability_targets(self, c):
        if not c.effects:
            return []
        live = [i for i, l in enumerate(self.row) if l and not l.face_down]
        for op, args in c.effects:
            if op == "stall":
                return [i for i in live if self.row[i].die] or [None]
            if op == "cancel_pressure":
                return [i for i in live if self.row[i].t.pressure] or [None]
            if op == "add_power":
                suit = args[1] if len(args) > 1 else None
                return [i for i in live if suit is None or suit in (self.row[i].t.pref, self.row[i].t.alt)] or [None]
            if op == "breach":
                cap = int(args[0])
                return [i for i in live if not self.row[i].t.pursuer and self.row[i].t.sym <= 1 and self.row[i].t.pw <= cap] or [None]
            if op == "swap":
                return [i for i, l in enumerate(self.row) if l and not self.pursuer_slot(i)] or [None]
        return [None]

    def tuck(self, c, ti):
        l = self.row[ti]
        l.under.append(c)
        for g in self.gear:
            for op, args in g.effects:
                if op == "power_bonus" and args and args[0] == c.suit:
                    l.bonus += int(args[1]) if len(args) > 1 else 1
        self.say(f"Tuck {c} under {l.t}")
        self.check_clears()

    def play(self, act):
        ci, kind, ti, extra = act
        c = self.hand.pop(ci)
        if c.cls == "Conditioned" and c.awakened and c.trigger:
            k, n = c.trigger
            val = {"exposure": self.exp, "lead": self.lead, "allies": len(self.allies), "gear": len(self.gear)}[k]
            if val >= n:
                self.st["awakened"] += 1
                self.say(f"AWAKEN {c} -> {c.awakened} (bonus {c.bonus})")
                bonus = c.bonus
                c = c.awakened
                self.apply_delta(bonus)
                if self.over:
                    return
        if kind == "deploy":
            (self.gear if c.cls == "Gear" else self.allies).append(c)
            self.say(f"Deploy {c}")
            self.check_clears()
        elif kind == "tuck":
            l = self.row[ti]
            if self.wild and c.suit not in (l.t.pref, l.t.alt):
                c = c.as_suit(l.t.pref)
            self.tuck(c, ti)
        elif kind == "weapon":
            self.use_perk("improvised_weapon")
            self.say("Improvised Weapon:")
            self.tuck(c.as_suit(self.row[ti].t.pref, 2), ti)
        elif kind == "decrypt":
            l = self.row[ti]
            l.face_down, l.die = False, l.t.timer
            self.st["decrypts"] += 1
            self.say(f"DECRYPT with {c}: {l.t}")
            if "Recon" in (l.t.pref, l.t.alt) or (self.wild and True):
                self.tuck(c if c.suit in (l.t.pref, l.t.alt) else c.as_suit(l.t.pref), ti)
        elif kind == "dump":
            self.say(f"Play {c} for no effect")
        else:
            self.ability(c, ti)
            if kind == "sleeper" and not self.over and self.row[extra] and self.use_perk("sleeper_instinct"):
                self.say("Sleeper Instinct:")
                self.tuck(c, extra)

    def ability(self, c, ti):
        self.say(f"Ability {c}: {c.effects}" + (f" on {self.row[ti].t}" if ti is not None and self.row[ti] else ""))
        for op, args in c.effects:
            if self.over:
                break
            n = int(args[0]) if args and args[0].lstrip("+-").isdigit() else 1
            l = self.row[ti] if ti is not None else None
            if op == "draw":
                self.draw(n)
            elif op == "exposure":
                self.gain_exp(n)
            elif op == "lead":
                self.gain_lead(n)
            elif op == "stall" and l and l.die:
                l.die += n
            elif op == "cancel_pressure" and l:
                l.cancel = True
            elif op == "add_power" and l:
                l.bonus += n
                self.check_clears()
            elif op == "clean_next":
                self.clean_next = True
            elif op == "breach" and l:
                self.say(f"BREACH clears {l.t}")
                self.resolve_clear(ti, l, False, 0)
                self.check_clears()
            elif op == "swap" and l:
                if not self.hypo:
                    self.tdeck.insert(0, l.t)
                self.refill(ti)

    # -- perks used outside actions
    def satellite(self):
        top = self.tdeck[-4:]
        del self.tdeck[-4:]
        val = lambda t: 12 * t.reward.get("lead", 0) - 9 * t.pressure.get("exposure", 0) - 2 * t.pw
        hazards = sorted([t for t in top if not t.reward.get("lead")], key=val)[:2]
        keep = [t for t in top if t not in hazards]
        keep.sort(key=val)                     # best ends up on top (end of list)
        self.tdeck.extend(keep)
        self.say(f"Satellite Overwrite: discard {hazards}, top now {list(reversed(keep))}")

    def incoming(self):
        """Exposure the coming Pressure step would add, and whether a timer/Strike would fire."""
        exp, fire = 0, False
        for l in self.row:
            if not l or l.face_down:
                continue
            if not l.cancel:
                exp += max(0, l.t.pressure.get("exposure", 0))
            if l.die == 1:
                fire = True
                exp += max(0, l.t.expiry.get("exposure", 0))
        return exp, fire

    # -- pressure
    def use_cover(self, exp_gain, lead_loss):
        if not self.allies or self.false_trail_on:
            return False
        turns_left = max(0, 8 - self.turn)
        if (exp_gain >= 2 or self.exp + exp_gain >= self.e["redline"] or lead_loss >= 1
                or (self.exp + exp_gain > self.e["cover_threshold"] and turns_left <= 2)):
            a = min(self.allies, key=lambda x: len(x.symbols))
            self.allies.remove(a)
            self.st["covers"] += 1
            self.say(f"Ally Cover: {a} cancels the effect")
            return True
        return False

    def pressure(self):
        exp_in, fire = self.incoming()
        if not self.hypo:
            if (exp_in >= 2 or fire) and self.use_perk("adrenaline_surge"):
                self.say("Adrenaline Surge: skip Pressure this turn")
                for l in self.row:
                    if l:
                        l.cancel = False
                return
            if self.perks.get("vanish"):
                cands = [(i, l) for i, l in enumerate(self.row) if l and not l.face_down and not l.t.pursuer and not l.t.no_vanish
                         and (l.t.pressure.get("exposure", 0) >= 1 or (l.die == 1 and l.t.expiry))
                         and self.counts(l)[1] < l.t.pw / 2]
                if cands and (exp_in >= 2 or self.exp + exp_in > self.e["cover_threshold"]) and self.use_perk("vanish"):
                    i, l = cands[0]
                    self.say(f"Vanish: discard {l.t}")
                    self.refill(i)
                    exp_in, fire = self.incoming()
            if exp_in >= 2 and self.use_perk("false_trail"):
                self.false_trail_on, self.ft_absorb, self.ft_lead_given = True, 2, False
        for i, l in enumerate(self.row):
            if self.over:
                break
            if not l or l.face_down:
                continue
            if l.cancel:
                l.cancel = False
            elif l.t.pressure:
                ex, ld = l.t.pressure.get("exposure", 0), -l.t.pressure.get("lead", 0)
                if (ex > 0 or ld > 0) and not self.use_cover(ex, ld):
                    self.say(f"Pressure from {l.t}: {l.t.pressure}")
                    self.apply_delta(l.t.pressure)
            if self.over or not l.die:
                continue
            l.die -= 1
            if l.die > 0:
                continue
            if l.t.pursuer:
                self.st["strikes"] += 1
                self.say(f"STRIKE {l.t}: {l.t.expiry}")
                if not self.use_cover(l.t.expiry.get("exposure", 0), -l.t.expiry.get("lead", 0)):
                    self.apply_delta(l.t.expiry)
                l.die = l.t.timer
            else:
                self.st["escapes"] += 1
                self.say(f"ESCAPE {l.t}: {l.t.expiry}")
                self.row[i] = None
                if not self.use_cover(l.t.expiry.get("exposure", 0), -l.t.expiry.get("lead", 0)):
                    self.apply_delta(l.t.expiry)
                if not self.over:
                    self.refill(i)
        self.false_trail_on = False
        self.check_scene_cleared()

    # -- evaluation
    def score(self):
        w, e = self.w, self.e
        if self.over and self.end_reason == "Cover Blown":
            return -1e6 + self.lead
        if self.lead >= e["lead_target"]:
            return 1e6 - self.exp * 10
        s = w["lead"] * self.lead - w["exposure"] * self.exp - w["over_threshold"] * max(0, self.exp - e["cover_threshold"])
        for l in self.row:
            if not l:
                continue
            if l.face_down:
                s += w["face_down"]
                continue
            t = l.t
            sym, pw, _ = self.counts(l)
            prog = 0.5 * min(1, sym / max(1, t.sym)) + 0.5 * min(1, pw / max(1, t.pw))
            value = w["lead"] * t.reward.get("lead", 0) - w["exposure"] * t.reward.get("exposure", 0) + 4
            s += w["progress"] * prog * value
            s -= w["pressure"] * t.pressure.get("exposure", 0) + w["lead"] * -t.pressure.get("lead", 0) * 0.5
            if t.blocker:
                s -= 5
            if l.die:
                hit = w["exposure"] * t.expiry.get("exposure", 0) + w["lead"] * -t.expiry.get("lead", 0)
                s -= hit * (1 - prog) / l.die
        s += w["ally_symbol"] * sum(len(a.symbols) for a in self.allies) + w["gear"] * len(self.gear)
        s += w["hand_card"] * len(self.hand) + w["phantom_draw"] * self.phantom
        return s

    def plan(self, plays_left):
        best, best_s = None, -float("inf")
        for a in self.actions():
            g = self.clone(); g.play(a)
            if plays_left > 1 and not g.over and g.hand:
                inner = -float("inf")
                for b in g.actions():
                    h = g.clone(); h.play(b)
                    if not h.over:
                        h.pressure()
                    inner = max(inner, h.score())
                s = inner
            else:
                if not g.over:
                    g.pressure()
                s = g.score()
            if s > best_s:
                best, best_s = a, s
        return best, best_s

    def best_action(self, plays_left):
        a, s = self.plan(plays_left)
        if self.perks.get("master_decryptor") and plays_left == min(self.e["plays_per_turn"], len(self.hand)) and not self.wild:
            g = self.clone(); g.wild = True
            wa, ws = g.plan(plays_left)
            if ws - s >= self.w["wild_margin"] and self.use_perk("master_decryptor"):
                self.wild = True
                self.say("Master Decryptor: all cards count as any suit this turn")
                return wa
        return a

    # -- main loop
    def run(self):
        e = self.e
        while not self.over and (self.hand or self.deck):
            self.turn += 1
            self.say(f"--- Turn {self.turn} | Lead {self.lead}/{e['lead_target']} Exposure {self.exp}/{e['redline']} | Hand {self.hand}")
            self.say("Scene: " + " | ".join(
                ("-" if not l else ("[face-down]" if l.face_down else f"{l.t} [{len(l.under)} under" + (f", die {l.die}" if l.die else "") + "]"))
                for l in self.row))
            plays = min(e["plays_per_turn"], len(self.hand))
            for k in range(plays):
                if self.over or not self.hand:
                    break
                self.play(self.best_action(plays - k))
            self.wild = False
            if self.over:
                break
            if not self.hand and not self.deck:
                self.finish("Out of Time")
                break
            self.pressure()
            if self.over:
                break
            self.draw(e["draw_per_turn"])
            if self.turn == 1 and self.use_perk("contingency_plan"):
                self.say("Contingency Plan: draw 2 extra")
                self.draw(2)
        if not self.over:
            self.finish("Out of Time")
        return {"turns": self.turn, "lead": self.lead, "exposure": self.exp, "end": self.end_reason,
                "obj": self.lead >= e["lead_target"],
                "cover": self.exp <= e["cover_threshold"] and self.end_reason != "Cover Blown", **self.st}


# ----------------------------------------------------------------------------- runner

def make_threats(cfg, rng, fixed):
    return fixed if fixed else generate_threats(cfg, rng)


def run_batch(cfg, deck):
    rng = random.Random(cfg["seed"])
    fixed = load_threats_from_workbook(cfg, cfg["threats"]["day"]) if cfg["threats"]["source"] == "workbook" else None
    return [Game(cfg, deck, make_threats(cfg, rng, fixed), rng).run() for _ in range(cfg["episodes"])]


def summarize(res):
    n = len(res)
    pct = lambda k: round(100 * sum(1 for r in res if r[k]) / n, 1)
    avg = lambda k, d=1: round(statistics.mean(r[k] for r in res), d)
    stars = [int(r["obj"]) + int(r["cover"]) for r in res]
    ends = {}
    for r in res:
        ends[r["end"]] = ends.get(r["end"], 0) + 1
    return {
        "episodes": n,
        "objective_star_%": pct("obj"),
        "cover_star_%": pct("cover"),
        "stars_0/1/2_%": "/".join(str(round(100 * stars.count(k) / n)) for k in (0, 1, 2)),
        "avg_stars_(of_2)": round(statistics.mean(stars), 2),
        "avg_turns": avg("turns"),
        "avg_final_lead": avg("lead"),
        "avg_final_exposure": avg("exposure"),
        "avg_clears": avg("clears"),
        "avg_clean_clears": avg("clean"),
        "avg_escapes": avg("escapes", 2),
        "avg_decrypts": avg("decrypts", 2),
        "avg_strikes": avg("strikes", 2),
        "pursuer_neutralized_%": pct("pursuer_down"),
        "awakened_in_play_%": pct("awakened"),
        "avg_ally_covers": avg("covers", 2),
        "avg_perks_used": avg("perks_used", 2),
        "avg_lead_budget": avg("lead_budget"),
        "end_reasons_%": {k: round(100 * v / n, 1) for k, v in sorted(ends.items())},
    }


def set_path(cfg, dotted, raw):
    keys = dotted.split(".")
    d = cfg
    for k in keys[:-1]:
        d = d.setdefault(k, {})
    try:
        val = json.loads(raw)
    except json.JSONDecodeError:
        val = raw
    d[keys[-1]] = val


def deep_merge(base, over):
    for k, v in over.items():
        if isinstance(v, dict) and isinstance(base.get(k), dict):
            deep_merge(base[k], v)
        else:
            base[k] = v
    return base


def build_config(a):
    cfg = copy.deepcopy(DEFAULT_CONFIG)
    if a.config:
        with open(a.config) as f:
            deep_merge(cfg, json.load(f))
    if a.day:
        apply_day(cfg, a.day)
    if a.threats_day:
        cfg["threats"]["source"], cfg["threats"]["day"] = "workbook", a.threats_day
    for s in a.set:
        k, v = s.split("=", 1)
        set_path(cfg, k, v)
    if a.episodes:
        cfg["episodes"] = a.episodes
    if a.seed is not None:
        cfg["seed"] = a.seed
    return cfg


def main():
    ap = argparse.ArgumentParser(description="Indigo Storm episode simulator")
    ap.add_argument("--day", help="simulate a written day: jump-in deck + perks + that day's cards, Threats and tracks")
    ap.add_argument("--config", help="JSON file with settings to override the defaults")
    ap.add_argument("--set", action="append", default=[], metavar="KEY=VALUE", help="override a setting, e.g. episode.lead_target=5 or perks=[]")
    ap.add_argument("--sweep", metavar="KEY=V1,V2,...", help="run once per value and print a comparison table")
    ap.add_argument("--episodes", type=int)
    ap.add_argument("--seed", type=int)
    ap.add_argument("--threats-day", help="use this day's Threat Cards from the workbook instead of generating them")
    ap.add_argument("--log", action="store_true", help="print a turn-by-turn log of one episode")
    ap.add_argument("--show-config", action="store_true")
    a = ap.parse_args()

    cfg = build_config(a)
    if a.show_config:
        print(json.dumps(cfg, indent=2))
    deck = load_deck(cfg)

    if a.log:
        rng = random.Random(cfg["seed"])
        fixed = load_threats_from_workbook(cfg, cfg["threats"]["day"]) if cfg["threats"]["source"] == "workbook" else None
        threats = make_threats(cfg, rng, fixed)
        log = []
        print("Deck:", deck)
        print("Perks:", cfg.get("perks"))
        print("Threats:", threats)
        r = Game(cfg, deck, threats, rng, log=log).run()
        print("\n".join(log))
        print("Result:", r)
        return

    if a.sweep:
        key, vals = a.sweep.split("=", 1)
        cols = ["objective_star_%", "cover_star_%", "stars_0/1/2_%", "avg_turns", "avg_final_exposure", "avg_clears", "avg_escapes"]
        print(f"{key:>28} | " + " | ".join(f"{c:>17}" for c in cols))
        for v in vals.split(","):
            c = copy.deepcopy(cfg); set_path(c, key, v)
            s = summarize(run_batch(c, load_deck(c)))
            print(f"{v:>28} | " + " | ".join(f"{str(s[k]):>17}" for k in cols))
        return

    for k, v in summarize(run_batch(cfg, deck)).items():
        print(f"{k:>22}: {v}")


if __name__ == "__main__":
    main()
