#!/usr/bin/env python3
"""
Indigo Storm — episode simulator (v1)

Plays thousands of single episodes with a simple greedy player and reports how
often each Star is earned, how long episodes run, and where Exposure lands.
Use it to tune Threat requirements, Lead targets and Cover Star thresholds
before writing real cards.

Rules simulated (from the design doc)
  * 15-card Operative Deck, opening hand 4, play exactly 2 cards a turn, draw 2.
  * Threats need N symbols + P Power in their preferred suit (alternate suit
    also counts). Cards tucked under a Threat stay there across turns.
  * Clean Clear bonus when only the preferred suit counted.
  * Gear (passive power_bonus) and Allies (ongoing symbols, Ally Cover).
  * End-of-Turn Pressure (+Exposure, -Lead, Blockers), timers on Timer Dice,
    Expiry effects when a timer hits 0.
  * Episode ends on Lead target, Exposure redline, Out of Time, or Scene Cleared
    (+Scene Cleared Lead bonus). Objective Star and Cover Star are scored;
    the Bonus Objective is not simulated.

Not simulated yet: Conditioned/Awakened cards, Face-Down Threats, Pursuers,
Two-Phase Threats, Clearance Perks, Episode Twists, move_card.

Usage
  python3 indigo_sim.py                          # Day 1 deck, generated Threats
  python3 indigo_sim.py --episodes 5000
  python3 indigo_sim.py --log                    # print one full episode
  python3 indigo_sim.py --set episode.lead_target=5 --set threats.count=9
  python3 indigo_sim.py --sweep threats.profile.power_per_symbol=1.8,2.2,2.6
  python3 indigo_sim.py --config my_scenario.json
  python3 indigo_sim.py --threats-day 1          # use Day 1 Threats from the workbook

The player deck is read from "Indigo Storm - Cards.xlsx" (Player Cards sheet,
"Sim Effect" column) in the same folder. Requires: pip install openpyxl
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

DEFAULT_CONFIG = {
    "episodes": 2000,
    "seed": None,
    "workbook": "Indigo Storm - Cards.xlsx",
    "deck": {"days": [1], "ids": []},          # CORE + listed days' player cards, or explicit ids
    "episode": {
        "start_lead": 0, "lead_target": 6,
        "start_exposure": 0, "redline": 6, "cover_threshold": 3,
        "scene_slots": 3, "opening_hand": 4, "draw_per_turn": 2, "plays_per_turn": 2,
        "scene_cleared_bonus": 1,
    },
    "threats": {
        "source": "generate",                    # "generate" or "workbook"
        "day": None,                             # workbook day to read when source=workbook
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
    },
}


# ----------------------------------------------------------------------------- data

class PCard:
    __slots__ = ("id", "name", "cls", "suit", "power", "symbols", "effects")

    def __init__(self, id, name, cls, suit, power, symbols, effects):
        self.id, self.name, self.cls, self.suit = id, name, cls, suit
        self.power, self.symbols, self.effects = power, symbols, effects

    def __repr__(self):
        if self.cls == "Ally":
            return f"{self.name}[Ally {'+'.join(self.symbols)}]"
        if self.cls == "Gear":
            return f"{self.name}[Gear]"
        return f"{self.name}[{self.suit[0]}{self.power}]"


class Threat:
    __slots__ = ("id", "name", "pref", "alt", "sym", "pw", "timer", "reward", "clean", "pressure", "expiry", "blocker")

    def __init__(self, **kw):
        for k in self.__slots__:
            setattr(self, k, kw.get(k))

    def __repr__(self):
        alt = f"/{self.alt[0]}" if self.alt else ""
        t = f" T{self.timer}" if self.timer else ""
        return f"{self.name}<{self.pref[0]}{alt} {self.sym}sym {self.pw}pw{t}>"


class Live:
    __slots__ = ("t", "under", "bonus", "die", "cancel")

    def __init__(self, t):
        self.t, self.under, self.bonus, self.die, self.cancel = t, [], 0, t.timer, False

    def clone(self):
        n = Live.__new__(Live)
        n.t, n.under, n.bonus, n.die, n.cancel = self.t, list(self.under), self.bonus, self.die, self.cancel
        return n


def parse_effects(text):
    out = []
    for tok in (text or "").replace(",", ";").split(";"):
        tok = tok.strip()
        if not tok:
            continue
        parts = tok.split(":")
        op, args = parts[0].strip().lower(), [p.strip() for p in parts[1:]]
        out.append((op, args))
    return out


def parse_delta(text):
    """'+2 Lead; -1 Exposure; Draw 1' -> {'lead':2,'exposure':-1,'draw':1}"""
    d = {}
    for m in re.finditer(r"([+-]?\d+)\s*(lead|exposure)", (text or "").lower()):
        d[m.group(2)] = d.get(m.group(2), 0) + int(m.group(1))
    m = re.search(r"draw\s*(\d+)", (text or "").lower())
    if m:
        d["draw"] = int(m.group(1))
    return d


# ----------------------------------------------------------------------------- loading

def load_workbook_rows(path, sheet):
    try:
        from openpyxl import load_workbook
    except ImportError:
        sys.exit("openpyxl is required: pip install openpyxl")
    ws = load_workbook(path, data_only=True)[sheet]
    rows = list(ws.iter_rows(values_only=True))
    head = [str(h).strip() if h is not None else "" for h in rows[0]]
    return [dict(zip(head, r)) for r in rows[1:] if r and r[0]]


def load_deck(cfg):
    rows = load_workbook_rows(os.path.join(HERE, cfg["workbook"]), "Player Cards")
    ids = cfg["deck"].get("ids") or []
    days = {str(d) for d in cfg["deck"].get("days") or []}
    deck = []
    for r in rows:
        day = str(r.get("Day") or "").strip()
        if ids:
            if r["ID"] not in ids:
                continue
        elif not (day == "CORE" or day in days):
            continue
        sym = [s.strip() for s in re.split(r"[+/,]", str(r.get("Ally Symbols") or "")) if s.strip()]
        deck.append(PCard(r["ID"], r.get("Name") or r["ID"], r.get("Class") or "Training",
                          r.get("Suit") or "", int(r.get("Power") or 0), sym, parse_effects(r.get("Sim Effect"))))
    if len(deck) != 15:
        print(f"Warning: deck has {len(deck)} cards (expected 15).", file=sys.stderr)
    return deck


def load_threats_from_workbook(cfg, day):
    rows = load_workbook_rows(os.path.join(HERE, cfg["workbook"]), "Threat Cards")
    out = []
    for r in rows:
        if str(r.get("Day") or "").strip() != str(day):
            continue
        press = str(r.get("End-of-Turn Pressure") or "")
        out.append(Threat(id=r["ID"], name=r.get("Name") or r["ID"], pref=r.get("Preferred Suit"),
                          alt=r.get("Alternate Suit") or None, sym=int(r.get("Symbols Required") or 1),
                          pw=int(r.get("Power Required") or 0), timer=int(r["Timer"]) if r.get("Timer") else None,
                          reward=parse_delta(r.get("Reward")), clean=parse_delta(r.get("Clean Bonus")),
                          pressure=parse_delta(press), expiry=parse_delta(r.get("Expiry Effect")),
                          blocker="blocker" in press.lower()))
    if not out:
        sys.exit(f"No Threat Cards found for Day {day} in the workbook.")
    return out


def generate_threats(cfg, rng):
    p, n = cfg["threats"]["profile"], cfg["threats"]["count"]
    weights = {int(k): v for k, v in p["symbol_weights"].items()}
    out = []
    for i in range(n):
        if p["focus_suit"] and rng.random() < p["focus_weight"]:
            pref = p["focus_suit"]
        else:
            pref = rng.choice(SUITS)
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
                          pref=pref, alt=alt, sym=sym, pw=pw,
                          timer=rng.randint(*p["timer_range"]) if timed else None,
                          reward={k: v for k, v in reward.items() if v}, clean={"exposure": p["clean_bonus_exposure"]},
                          pressure=pressure, expiry={"exposure": p["timer_expiry_exposure"]} if timed else {},
                          blocker=blocker))
    return out


# ----------------------------------------------------------------------------- game state

class Game:
    def __init__(self, cfg, deck, threats, rng, log=None):
        e = cfg["episode"]
        self.cfg, self.e, self.rng, self.w = cfg, e, rng, cfg["ai"]
        self.log = log
        self.deck = list(deck); rng.shuffle(self.deck)
        self.hand = [self.deck.pop() for _ in range(min(e["opening_hand"], len(self.deck)))]
        self.tdeck = list(threats); rng.shuffle(self.tdeck)
        self.row = [Live(self.tdeck.pop()) if self.tdeck else None for _ in range(e["scene_slots"])]
        self.gear, self.allies = [], []
        self.lead, self.exp = e["start_lead"], e["start_exposure"]
        self.turn, self.over, self.end_reason = 0, False, None
        self.clean_next, self.phantom, self.hypo = False, 0, False
        self.st = {"clears": 0, "clean": 0, "escapes": 0, "covers": 0, "lead_budget": sum(t.reward.get("lead", 0) for t in threats)}

    # -- copying for look-ahead (hidden decks are not consulted in hypothetical mode)
    def clone(self):
        g = Game.__new__(Game)
        g.cfg, g.e, g.rng, g.w, g.log = self.cfg, self.e, self.rng, self.w, None
        g.deck, g.hand, g.tdeck = self.deck, list(self.hand), self.tdeck
        g.row = [l.clone() if l else None for l in self.row]
        g.gear, g.allies = list(self.gear), list(self.allies)
        g.lead, g.exp, g.turn, g.over, g.end_reason = self.lead, self.exp, self.turn, self.over, self.end_reason
        g.clean_next, g.phantom, g.hypo = self.clean_next, self.phantom, True
        g.st = dict(self.st)
        return g

    def say(self, msg):
        if self.log is not None:
            self.log.append(f"  {msg}")

    def blocked(self):
        return any(l and l.t.blocker for l in self.row)

    # -- track changes
    def gain_lead(self, n):
        if n > 0 and self.blocked():
            return
        self.lead = max(0, self.lead + n)
        if self.lead >= self.e["lead_target"]:
            self.finish("Objective Secured")

    def gain_exp(self, n):
        self.exp = max(0, self.exp + n)
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
        if d.get("draw"):
            self.draw(d["draw"])

    # -- threats
    def counts(self, l):
        t = l.t
        suits = {t.pref, t.alt} - {None}
        sym = len(l.under) + sum(1 for a in self.allies for s in a.symbols if s in suits)
        pw = sum(c.power for c in l.under) + l.bonus
        pref_sym = sum(1 for c in l.under if c.suit == t.pref) + sum(1 for a in self.allies for s in a.symbols if s == t.pref)
        clean = all(c.suit == t.pref for c in l.under) and pref_sym >= t.sym
        return sym, pw, clean

    def refill(self, i):
        if self.hypo or not self.tdeck:
            self.row[i] = None
        else:
            self.row[i] = Live(self.tdeck.pop())
            self.say(f"New Threat: {self.row[i].t}")

    def check_clears(self):
        for i, l in enumerate(self.row):
            if self.over or not l:
                continue
            sym, pw, clean = self.counts(l)
            if sym >= l.t.sym and pw >= l.t.pw:
                clean = clean or self.clean_next
                self.clean_next = False
                self.st["clears"] += 1
                self.say(f"CLEAR {l.t}{' (Clean)' if clean else ''} -> {l.t.reward}")
                self.row[i] = None
                if clean:
                    self.st["clean"] += 1
                self.apply_delta(l.t.reward)
                if clean and not self.over:
                    self.apply_delta(l.t.clean)
                if not self.over:
                    self.refill(i)
        if not self.over and all(l is None for l in self.row) and (self.hypo is False and not self.tdeck):
            self.say("Scene Cleared")
            self.gain_lead(self.e["scene_cleared_bonus"])
            self.finish("Scene Cleared")

    # -- actions
    def actions(self):
        acts = []
        for ci, c in enumerate(self.hand):
            if c.cls in ("Gear", "Ally"):
                acts.append((ci, "deploy", None))
                continue
            for ti, l in enumerate(self.row):
                if l and c.suit in (l.t.pref, l.t.alt):
                    acts.append((ci, "tuck", ti))
            targets = self.ability_targets(c)
            if targets:
                acts.extend((ci, "ability", t) for t in targets)
            else:
                acts.append((ci, "dump", None))
        return acts

    def ability_targets(self, c):
        ops = [op for op, _ in c.effects]
        if not ops:
            return []
        live = [i for i, l in enumerate(self.row) if l]
        for op, args in c.effects:
            if op == "stall":
                return [i for i in live if self.row[i].die] or [None]
            if op == "cancel_pressure":
                return [i for i in live if self.row[i].t.pressure or self.row[i].die] or [None]
            if op == "add_power":
                suit = args[1] if len(args) > 1 else None
                return [i for i in live if suit is None or suit in (self.row[i].t.pref, self.row[i].t.alt)] or [None]
            if op == "breach":
                cap = int(args[0])
                return [i for i in live if self.row[i].t.sym <= 1 and self.row[i].t.pw <= cap] or [None]
            if op == "swap":
                return live or [None]
        return [None]

    def play(self, act):
        ci, kind, ti = act
        c = self.hand.pop(ci)
        if kind == "deploy":
            (self.gear if c.cls == "Gear" else self.allies).append(c)
            self.say(f"Deploy {c}")
            self.check_clears()
        elif kind == "tuck":
            l = self.row[ti]
            l.under.append(c)
            for g in self.gear:
                for op, args in g.effects:
                    if op == "power_bonus" and args and args[0] == c.suit:
                        l.bonus += int(args[1]) if len(args) > 1 else 1
            self.say(f"Tuck {c} under {l.t}")
            self.check_clears()
        elif kind == "dump":
            self.say(f"Play {c} for no effect")
        else:
            self.say(f"Ability {c}: {c.effects}" + (f" on {self.row[ti].t}" if ti is not None and self.row[ti] else ""))
            for op, args in c.effects:
                if self.over:
                    break
                n = int(args[0]) if args and args[0].lstrip("+-").isdigit() else 1
                if op == "draw":
                    self.draw(n)
                elif op == "exposure":
                    self.gain_exp(n)
                elif op == "lead":
                    self.gain_lead(n)
                elif op == "stall" and ti is not None and self.row[ti] and self.row[ti].die:
                    self.row[ti].die += n
                elif op == "cancel_pressure" and ti is not None and self.row[ti]:
                    self.row[ti].cancel = True
                elif op == "add_power" and ti is not None and self.row[ti]:
                    self.row[ti].bonus += n
                    self.check_clears()
                elif op == "clean_next":
                    self.clean_next = True
                elif op == "breach" and ti is not None and self.row[ti]:
                    l = self.row[ti]
                    self.st["clears"] += 1
                    self.say(f"BREACH clears {l.t}")
                    self.row[ti] = None
                    self.apply_delta(l.t.reward)
                    if not self.over:
                        self.refill(ti)
                        self.check_clears()
                elif op == "swap" and ti is not None and self.row[ti]:
                    old = self.row[ti]
                    if not self.hypo:
                        self.tdeck.insert(0, old.t)
                    self.refill(ti)
                # peek / move_card: not simulated (no effect)

    # -- pressure
    def use_cover(self, exp_gain, lead_loss):
        if not self.allies:
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
        for i, l in enumerate(self.row):
            if self.over or not l:
                continue
            if l.cancel:
                l.cancel = False
            elif l.t.pressure:
                ex, ld = l.t.pressure.get("exposure", 0), -l.t.pressure.get("lead", 0)
                if (ex > 0 or ld > 0) and not self.use_cover(ex, ld):
                    self.say(f"Pressure from {l.t}: {l.t.pressure}")
                    self.apply_delta(l.t.pressure)
            if self.over:
                break
            if l.die:
                l.die -= 1
                if l.die <= 0:
                    self.st["escapes"] += 1
                    self.say(f"ESCAPE {l.t}: {l.t.expiry}")
                    self.row[i] = None
                    ex = l.t.expiry.get("exposure", 0)
                    if not self.use_cover(ex, 0):
                        self.apply_delta(l.t.expiry)
                    if not self.over:
                        self.refill(i)

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
            t = l.t
            sym, pw, _ = self.counts(l)
            prog = 0.5 * min(1, sym / max(1, t.sym)) + 0.5 * min(1, pw / max(1, t.pw))
            value = w["lead"] * t.reward.get("lead", 0) - w["exposure"] * t.reward.get("exposure", 0) + 4
            s += w["progress"] * prog * value
            s -= w["pressure"] * t.pressure.get("exposure", 0) + w["lead"] * -t.pressure.get("lead", 0) * 0.5
            if t.blocker:
                s -= 5
            if l.die:
                s -= (w["exposure"] * t.expiry.get("exposure", 0)) * (1 - prog) / l.die
        s += w["ally_symbol"] * sum(len(a.symbols) for a in self.allies) + w["gear"] * len(self.gear)
        s += w["hand_card"] * len(self.hand) + w["phantom_draw"] * self.phantom
        return s

    def best_action(self, plays_left):
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
        return best

    # -- main loop
    def run(self):
        e = self.e
        while not self.over and (self.hand or self.deck):
            self.turn += 1
            self.say(f"--- Turn {self.turn} | Lead {self.lead}/{e['lead_target']} Exposure {self.exp}/{e['redline']} | Hand {self.hand}")
            self.say(f"Scene: {[str(l.t) + (f' [{len(l.under)} under, die {l.die}]' if l.die else f' [{len(l.under)} under]') if l else '-' for l in self.row]}")
            for k in range(min(e["plays_per_turn"], len(self.hand))):
                if self.over or not self.hand:
                    break
                self.play(self.best_action(min(e["plays_per_turn"], len(self.hand)) - k))
            if self.over:
                break
            if not self.hand and not self.deck:
                self.finish("Out of Time")
                break
            self.pressure()
            if self.over:
                break
            self.draw(e["draw_per_turn"])
        if not self.over:
            self.finish("Out of Time")
        return {
            "turns": self.turn, "lead": self.lead, "exposure": self.exp, "end": self.end_reason,
            "obj": self.lead >= e["lead_target"], "cover": self.exp <= e["cover_threshold"] and self.end_reason != "Cover Blown",
            **self.st,
        }


# ----------------------------------------------------------------------------- runner

def run_batch(cfg, deck, quiet=False):
    rng = random.Random(cfg["seed"])
    res = []
    fixed = load_threats_from_workbook(cfg, cfg["threats"]["day"]) if cfg["threats"]["source"] == "workbook" else None
    for _ in range(cfg["episodes"]):
        threats = fixed if fixed else generate_threats(cfg, rng)
        res.append(Game(cfg, deck, threats, rng).run())
    return res


def summarize(res):
    n = len(res)
    pct = lambda k: 100 * sum(1 for r in res if r[k]) / n
    stars = [int(r["obj"]) + int(r["cover"]) for r in res]
    ends = {}
    for r in res:
        ends[r["end"]] = ends.get(r["end"], 0) + 1
    return {
        "episodes": n,
        "objective_star_%": round(pct("obj"), 1),
        "cover_star_%": round(pct("cover"), 1),
        "stars_0/1/2_%": "/".join(str(round(100 * stars.count(k) / n)) for k in (0, 1, 2)),
        "avg_stars_(of_2)": round(statistics.mean(stars), 2),
        "avg_turns": round(statistics.mean(r["turns"] for r in res), 1),
        "avg_final_lead": round(statistics.mean(r["lead"] for r in res), 1),
        "avg_final_exposure": round(statistics.mean(r["exposure"] for r in res), 1),
        "avg_clears": round(statistics.mean(r["clears"] for r in res), 1),
        "avg_clean_clears": round(statistics.mean(r["clean"] for r in res), 1),
        "avg_escapes": round(statistics.mean(r["escapes"] for r in res), 2),
        "avg_lead_budget": round(statistics.mean(r["lead_budget"] for r in res), 1),
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


def main():
    ap = argparse.ArgumentParser(description="Indigo Storm episode simulator")
    ap.add_argument("--config", help="JSON file with settings to override the defaults")
    ap.add_argument("--set", action="append", default=[], metavar="KEY=VALUE", help="override a setting, e.g. episode.lead_target=5")
    ap.add_argument("--sweep", metavar="KEY=V1,V2,...", help="run once per value and print a comparison table")
    ap.add_argument("--episodes", type=int)
    ap.add_argument("--seed", type=int)
    ap.add_argument("--threats-day", help="use this day's Threat Cards from the workbook instead of generating them")
    ap.add_argument("--log", action="store_true", help="print a turn-by-turn log of one episode")
    ap.add_argument("--show-config", action="store_true")
    a = ap.parse_args()

    cfg = copy.deepcopy(DEFAULT_CONFIG)
    if a.config:
        with open(a.config) as f:
            deep_merge(cfg, json.load(f))
    for s in a.set:
        k, v = s.split("=", 1); set_path(cfg, k, v)
    if a.episodes:
        cfg["episodes"] = a.episodes
    if a.seed is not None:
        cfg["seed"] = a.seed
    if a.threats_day:
        cfg["threats"]["source"], cfg["threats"]["day"] = "workbook", a.threats_day
    if a.show_config:
        print(json.dumps(cfg, indent=2))

    deck = load_deck(cfg)

    if a.log:
        rng = random.Random(cfg["seed"])
        threats = load_threats_from_workbook(cfg, cfg["threats"]["day"]) if cfg["threats"]["source"] == "workbook" else generate_threats(cfg, rng)
        log = []
        print("Threat Deck:", threats)
        r = Game(cfg, deck, threats, rng, log=log).run()
        print("\n".join(log))
        print("Result:", r)
        return

    if a.sweep:
        key, vals = a.sweep.split("=", 1)
        rows = []
        for v in vals.split(","):
            c = copy.deepcopy(cfg); set_path(c, key, v)
            s = summarize(run_batch(c, deck))
            rows.append((v, s))
        cols = ["objective_star_%", "cover_star_%", "stars_0/1/2_%", "avg_stars_(of_2)", "avg_turns", "avg_final_exposure", "avg_clears", "avg_escapes"]
        print(f"{key:>28} | " + " | ".join(f"{c:>17}" for c in cols))
        for v, s in rows:
            print(f"{v:>28} | " + " | ".join(f"{str(s[c]):>17}" for c in cols))
        return

    s = summarize(run_batch(cfg, deck))
    for k, v in s.items():
        print(f"{k:>22}: {v}")


if __name__ == "__main__":
    main()
