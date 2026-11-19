#!/usr/bin/env python3
"""
Indigo Storm — print-and-play generator

Builds printable card sheets from the workbooks so the prototype (and later
the full 30-day game) can be rebuilt with one command after any change.

  python3 make_print.py                 # every day with cards, plus Core deck, extras, campaign sheet
  python3 make_print.py --days 1,6      # only these packs
  python3 make_print.py --fronts-only   # skip back pages (single-sided printing)

Output goes to print/ (ignored by git):
  Day 01 Pack.pdf …     one pack per day, in the order a player opens it
  Core Deck.pdf         the 12-card Core Operative Deck
  Prototype Extras.pdf  PROTO stand-in cards and the prototype rules card
  Campaign Sheet.pdf    tracks, Clearance Perks and the 30-day Star grid

Printing: US Letter, 9 poker-size cards (63 x 88 mm) per page with cut marks.
For double-sided printing, print with "flip on long edge": every fronts page
is followed by its backs page, mirrored so each back lands behind its front.

Story text comes from spoilers/Indigo Storm - Story.xlsx ("Story Cards" sheet)
when that file exists, otherwise from the placeholder Story Cards sheet in the
Cards workbook. Requires: pip install openpyxl reportlab
"""
import argparse
import os
import re
import sys
from xml.sax.saxutils import escape

try:
    from openpyxl import load_workbook
    from reportlab.lib.colors import HexColor, white
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas
    from reportlab.platypus import Paragraph
except ImportError as e:
    sys.exit(f"Couldn't import {e.name!r} ({e}).\nThis Python is {sys.executable}\n"
             "Install the requirements into it with:  python3 -m pip install -r requirements.txt")

HERE = os.path.dirname(os.path.abspath(__file__))
CARDS = os.path.join(HERE, "Indigo Storm - Cards.xlsx")
PLAN = os.path.join(HERE, "Indigo Storm - Episode Plan.xlsx")
STORY = os.path.join(HERE, "spoilers", "Indigo Storm - Story.xlsx")
OUT = os.path.join(HERE, "print")

CW, CH = 63 * mm, 88 * mm
COLS, ROWS = 3, 3
PW, PH = letter
MX, MY = (PW - COLS * CW) / 2, (PH - ROWS * CH) / 2

INK = HexColor("#1D2433")
MUTED = HexColor("#5B6170")
PAPER = HexColor("#FFFFFF")
SUIT = {"Recon": HexColor("#1F7A8C"), "Stealth": HexColor("#4B3B9A"), "Force": HexColor("#B83227")}
BAND = {
    "Gear": HexColor("#4E5563"), "Ally": HexColor("#2F7D4F"),
    "Threat": HexColor("#2B2F3A"), "Encrypted Threat": HexColor("#0E5A6E"), "Pursuer": HexColor("#7A1E1E"),
    "Two-Phase Threat": HexColor("#6B4E0F"), "Countermeasure": HexColor("#8A5A00"),
    "Rule": HexColor("#4B3B9A"), "Intro": HexColor("#1D2433"), "Outro": HexColor("#1D2433"), "Jump-In": HexColor("#6A6F7A"),
}
BACKS = {
    "player": ("OPERATIVE", "#1D2433", "#4B3B9A"),
    "threat": ("THREAT", "#2B2F3A", "#7A808C"),
    "encrypted": ("ENCRYPTED", "#0E5A6E", "#7FC4D1"),
    "briefing": ("BRIEFING", "#2D2560", "#9C90E0"),
    "outro": ("READ AFTER THE EPISODE", "#1D2433", "#C9A227"),
    "flashback": ("FLASHBACK", "#3B1F4E", "#D9A6F2"),
    "countermeasure": ("COUNTERMEASURE", "#5C3B00", "#F2C063"),
    "jumpin": ("PROTOTYPE JUMP-IN", "#4A4F5A", "#C7CCD6"),
}
BACK_NOTES = {
    "outro": "Don't read until today's episode is over.",
    "flashback": "Set aside. Read only when its Conditioned Card awakens.",
    "countermeasure": "Set aside during setup. Enters when its Two-Phase Threat is cleared.",
    "encrypted": "Enters the Scene Row face-down.",
}

PERK_SHEET = [
    ("GHOST — Stealth & Misdirection", [
        ("Vanish", "Discard any Threat from the Scene Row (unless its card says otherwise) without clearing it."),
        ("Cloned Credentials", "During setup, put 1 card of your choice from your deck into your opening hand."),
        ("False Trail", "This turn, ignore up to 2 Exposure you would gain, and gain +1 Lead."),
        ("Sleeper Instinct", "When you play a Stealth card for its ability, also tuck it under a Threat."),
    ]),
    ("ANALYST — Recon & Preparation", [
        ("Satellite Overwrite", "Look at the top 4 Threats, discard up to 2, put the rest back in any order."),
        ("Contingency Plan", "Draw 2 extra cards."),
        ("Pattern Recognition", "When you clear a Threat with 3+ excess Power, draw 1 card."),
        ("Master Decryptor", "For one turn, all cards in your hand count as any suit."),
    ]),
    ("OPERATIVE — Force & Improvisation", [
        ("Adrenaline Surge", "Skip one Pressure step (timers don't tick, no Pressure resolves)."),
        ("Improvised Weapon", "When you tuck a card, it counts as any suit and its Power is doubled."),
        ("Hardened Resolve", "When you would reach the Exposure redline, stop 1 below it instead."),
        ("Kinetic Momentum", "When you clear a Threat using Force, carry excess Power onto another Threat."),
    ]),
]

# ----------------------------------------------------------------------------- data

def day_str(v):
    if v is None:
        return ""
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    return str(v).strip()


def rows(path, sheet):
    if not os.path.exists(path):
        return []
    wb = load_workbook(path, data_only=True)
    if sheet not in wb.sheetnames:
        return []
    data = list(wb[sheet].iter_rows(values_only=True))
    head = [str(h).strip() if h is not None else "" for h in data[0]]
    return [dict(zip(head, r)) for r in data[1:] if r and r[0]]


def clean(text):
    t = "" if text is None else str(text)
    for a, b in (("−", "-"), ("★", "*"), ("≤", "<="), ("≥", ">="), ("→", "->"), (" ", " ")):
        t = t.replace(a, b)
    return t


def markup(text):
    """Plain text -> Paragraph markup: line breaks kept, short ALL-CAPS lines bold."""
    out = []
    for line in clean(text).split("\n"):
        s = escape(line)
        bare = re.sub(r"[^A-Za-z]", "", line)
        if bare and line.strip() == line.strip().upper() and len(line) < 40:
            s = f"<b>{s}</b>"
        out.append(s)
    return "<br/>".join(out)


class Data:
    def __init__(self):
        self.player = rows(CARDS, "Player Cards")
        self.threats = rows(CARDS, "Threat Cards")
        self.rules = rows(CARDS, "Rule Cards")
        self.jump = {day_str(r["Day"]): r for r in rows(CARDS, "Jump-In Setups")}
        story = rows(STORY, "Story Cards") if os.path.exists(STORY) else []
        self.story_source = "spoilers" if story else "placeholder"
        self.story = story or rows(CARDS, "Story Cards")
        self.plan = {day_str(r["Day"]): r for r in rows(PLAN, "Episode Plan")}
        self.by_id = {r["ID"]: r for r in self.player}

    def days(self):
        ds = {day_str(r["Day"]) for r in self.player + self.threats}
        return sorted((d for d in ds if d.isdigit()), key=int)


# ----------------------------------------------------------------------------- drawing helpers

def style(size, color=INK, bold=False, align=0, leading=1.2, italic=False):
    font = "Helvetica-BoldOblique" if bold and italic else "Helvetica-Bold" if bold else "Helvetica-Oblique" if italic else "Helvetica"
    return ParagraphStyle("s", fontName=font, fontSize=size, leading=size * leading, textColor=color, alignment=align)


def fit(c, text, x, top, w, h, size=8.0, min_size=5.0, **kw):
    """Draw markup text in the box (x, top-h, w, h), shrinking the font until it fits. Returns height used."""
    s = size
    while True:
        p = Paragraph(text, style(s, **kw))
        _, ph = p.wrap(w, h)
        if ph <= h or s <= min_size:
            p.drawOn(c, x, top - ph)
            return ph
        s -= 0.25


def frame(c, x, y, color=INK):
    c.setStrokeColor(color)
    c.setLineWidth(0.6)
    c.roundRect(x + 1.2 * mm, y + 1.2 * mm, CW - 2.4 * mm, CH - 2.4 * mm, 2.5 * mm, stroke=1, fill=0)


def band(c, x, y, color, height=11 * mm):
    c.setFillColor(color)
    c.roundRect(x + 1.2 * mm, y + CH - 1.2 * mm - height, CW - 2.4 * mm, height, 2.5 * mm, stroke=0, fill=1)
    c.rect(x + 1.2 * mm, y + CH - 1.2 * mm - height, CW - 2.4 * mm, height / 2, stroke=0, fill=1)


def suit_icon(c, suit, cx, cy, r, color, bg):
    c.setFillColor(color)
    c.setStrokeColor(color)
    if suit == "Recon":                      # eye
        c.setLineWidth(r * 0.22)
        c.ellipse(cx - r, cy - r * 0.62, cx + r, cy + r * 0.62, stroke=1, fill=0)
        c.circle(cx, cy, r * 0.34, stroke=0, fill=1)
    elif suit == "Stealth":                  # crescent
        c.circle(cx, cy, r, stroke=0, fill=1)
        c.setFillColor(bg)
        c.circle(cx + r * 0.45, cy + r * 0.25, r * 0.85, stroke=0, fill=1)
    elif suit == "Force":                    # lightning bolt
        p = c.beginPath()
        pts = [(0.15, 1), (-0.55, -0.05), (-0.05, -0.05), (-0.25, -1), (0.55, 0.15), (0.05, 0.15), (0.3, 1)]
        p.moveTo(cx + pts[0][0] * r, cy + pts[0][1] * r)
        for px, py in pts[1:]:
            p.lineTo(cx + px * r, cy + py * r)
        p.close()
        c.drawPath(p, stroke=0, fill=1)


def footer(c, x, y, left, right):
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 5.5)
    c.drawString(x + 4 * mm, y + 3.6 * mm, clean(left))
    c.drawRightString(x + CW - 4 * mm, y + 3.6 * mm, clean(right))


def stamp(day):
    d = day_str(day)
    return "CORE" if d == "CORE" else "PROTOTYPE STAND-IN" if d == "PROTO" else f"DAY {d}"


def header(c, x, y, title, color, label=None, title_size=9.5):
    band(c, x, y, color)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", title_size)
    tw = c.stringWidth(clean(title), "Helvetica-Bold", title_size)
    while tw > CW - 26 * mm and title_size > 6.5:
        title_size -= 0.25
        tw = c.stringWidth(clean(title), "Helvetica-Bold", title_size)
    c.setFont("Helvetica-Bold", title_size)
    c.drawString(x + 4.5 * mm, y + CH - 7.6 * mm, clean(title))
    if label:
        c.setFont("Helvetica-Bold", 5.5)
        c.drawRightString(x + CW - 4.5 * mm, y + CH - 4.6 * mm, clean(label))


# ----------------------------------------------------------------------------- card faces

def draw_player(c, x, y, r):
    cls = r.get("Class") or "Training"
    suit = r.get("Suit") or ""
    color = SUIT.get(suit) or BAND.get(cls, INK)
    frame(c, x, y, color)
    header(c, x, y, r["Name"], color, cls.upper())
    body_top = y + CH - 14 * mm
    if cls in ("Training", "Conditioned", "Awakened"):
        c.setFillColor(color)
        c.circle(x + 11 * mm, body_top - 6.5 * mm, 6 * mm, stroke=0, fill=1)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 16)
        c.drawCentredString(x + 11 * mm, body_top - 9.2 * mm, str(r.get("Power") or 0))
        suit_icon(c, suit, x + CW - 13 * mm, body_top - 6.5 * mm, 4.3 * mm, color, PAPER)
        c.setFillColor(color)
        c.setFont("Helvetica-Bold", 7)
        c.drawCentredString(x + CW - 13 * mm, body_top - 14.5 * mm, suit.upper())
        top = body_top - 17 * mm
        c.setStrokeColor(color); c.setLineWidth(0.4)
        c.line(x + 5 * mm, top + 1 * mm, x + CW - 5 * mm, top + 1 * mm)
        fit(c, "<b>ABILITY</b> (instead of tucking)<br/>" + markup(r.get("Ability / Effect")), x + 5 * mm, top - 1 * mm, CW - 10 * mm, 22 * mm, size=8)
        extra_top = top - 25 * mm
        if cls == "Conditioned":
            fit(c, "<b>CONDITIONED</b><br/>" + markup(r.get("Awakening Trigger")) + "<br/>If it hasn't awakened by the end of the episode, it awakens then.",
                x + 5 * mm, extra_top, CW - 10 * mm, 22 * mm, size=6.8, color=color)
        elif cls == "Awakened":
            txt = f"<b>AWAKENING BONUS:</b> {escape(clean(r.get('Awakening Bonus')))}<br/>"
            if r.get("Flavor / Flashback Text"):
                txt += f"<i>{markup(r.get('Flavor / Flashback Text'))}</i>"
            fit(c, txt, x + 5 * mm, extra_top, CW - 10 * mm, 22 * mm, size=6.8, color=color)
        elif r.get("Flavor / Flashback Text"):
            fit(c, f"<i>{markup(r.get('Flavor / Flashback Text'))}</i>", x + 5 * mm, extra_top, CW - 10 * mm, 16 * mm, size=6.5, color=MUTED)
    elif cls == "Ally":
        syms = [s.strip() for s in re.split(r"[+/,]", str(r.get("Ally Symbols") or "")) if s.strip()]
        n = len(syms)
        for i, s in enumerate(syms):
            cx = x + CW / 2 + (i - (n - 1) / 2) * 15 * mm
            c.setFillColor(SUIT.get(s, INK))
            c.circle(cx, body_top - 9 * mm, 6.2 * mm, stroke=0, fill=1)
            suit_icon(c, s, cx, body_top - 9 * mm, 3.8 * mm, white, SUIT.get(s, INK))
        fit(c, "<b>ALLY</b> — stays in play. Its symbols count toward every Threat you engage.<br/><br/>"
               "<b>ALLY COVER:</b> defeat it during Pressure to cancel one Pressure, Expiry or Strike effect.<br/><br/>" + markup(r.get("Ability / Effect")),
            x + 5 * mm, body_top - 19 * mm, CW - 10 * mm, 42 * mm, size=7)
    else:  # Gear
        fit(c, "<b>GEAR</b> — stays in play for the rest of the episode.<br/><br/>" + markup(r.get("Ability / Effect")),
            x + 5 * mm, body_top - 3 * mm, CW - 10 * mm, 55 * mm, size=8.5)
    footer(c, x, y, r["ID"], stamp(r.get("Day")))


def delta_text(v):
    return escape(clean(v)) if v else "—"


def draw_threat(c, x, y, r):
    kind = r.get("Type") or "Threat"
    color = BAND.get(kind, BAND["Threat"])
    pref, alt = r.get("Preferred Suit"), r.get("Alternate Suit")
    frame(c, x, y, color)
    label = {"Encrypted Threat": "ENCRYPTED", "Pursuer": "PURSUER", "Two-Phase Threat": "TWO-PHASE  [LOCK]",
             "Countermeasure": "COUNTERMEASURE"}.get(kind, "THREAT")
    header(c, x, y, r["Name"], color, label)
    top = y + CH - 14 * mm
    sym = int(r.get("Symbols Required") or 1)
    pc = SUIT.get(pref, INK)
    c.setFillColor(HexColor("#F3F4F7"))
    c.roundRect(x + 4 * mm, top - 17 * mm, CW - 8 * mm, 16 * mm, 2 * mm, stroke=0, fill=1)
    for i in range(sym):
        cx = x + 9.5 * mm + i * 9.5 * mm
        c.setFillColor(pc)
        c.circle(cx, top - 7.5 * mm, 4 * mm, stroke=0, fill=1)
        suit_icon(c, pref, cx, top - 7.5 * mm, 2.4 * mm, white, pc)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 17)
    c.drawRightString(x + CW - 6 * mm, top - 10.5 * mm, f"+{int(r.get('Power Required') or 0)}")
    c.setFont("Helvetica", 5.5)
    c.drawRightString(x + CW - 6 * mm, top - 14.5 * mm, "POWER")
    c.setFont("Helvetica-Bold", 6)
    c.setFillColor(pc)
    c.drawString(x + 5.5 * mm, top - 15.3 * mm, (pref or "").upper() + (f"   ALSO: {alt.upper()}" if alt else ""))
    lines = []
    if kind == "Pursuer":
        lines.append(f"<b>HUNT {int(r['Timer (Hunt for Pursuers)'])}</b> — STRIKE: {delta_text(r.get('Expiry Effect (Strike for Pursuers)'))}")
    elif r.get("Timer (Hunt for Pursuers)"):
        lines.append(f"<b>TIMER {int(r['Timer (Hunt for Pursuers)'])}</b> — EXPIRY: {delta_text(r.get('Expiry Effect (Strike for Pursuers)'))}")
    lines.append(f"<b>REWARD:</b> {delta_text(r.get('Reward'))}")
    if r.get("Clean Bonus"):
        lines.append(f"<b>CLEAN BONUS:</b> {delta_text(r.get('Clean Bonus'))}")
    if r.get("End-of-Turn Pressure"):
        lines.append(f"<b>PRESSURE:</b> {delta_text(r.get('End-of-Turn Pressure'))}")
    if kind == "Two-Phase Threat":
        lines.append(f"<b>WHEN CLEARED:</b> put Countermeasure {escape(str(r.get('Pairs With') or ''))} in this slot.")
    if kind == "Countermeasure":
        lines.append(f"<i>Follows {escape(str(r.get('Pairs With') or ''))} into the same slot.</i>")
    if r.get("Rules Text"):
        lines.append(markup(r.get("Rules Text")))
    fit(c, "<br/>".join(lines), x + 5 * mm, top - 20 * mm, CW - 10 * mm, 38 * mm, size=7.6)
    if r.get("Flavor"):
        fit(c, f"<i>{markup(r.get('Flavor'))}</i>", x + 5 * mm, y + 14 * mm, CW - 10 * mm, 8 * mm, size=6, color=MUTED)
    footer(c, x, y, r["ID"], stamp(r.get("Day")))


def draw_text_card(c, x, y, title, label, text, color, ident, day, size=7.4):
    frame(c, x, y, color)
    header(c, x, y, title, color, label)
    fit(c, text, x + 5 * mm, y + CH - 15 * mm, CW - 10 * mm, CH - 23 * mm, size=size)
    footer(c, x, y, ident, stamp(day))


def draw_back(c, x, y, kind):
    label, bg, accent = BACKS[kind]
    c.setFillColor(HexColor(bg))
    c.roundRect(x + 1.2 * mm, y + 1.2 * mm, CW - 2.4 * mm, CH - 2.4 * mm, 2.5 * mm, stroke=0, fill=1)
    c.setStrokeColor(HexColor(accent)); c.setLineWidth(0.8)
    c.roundRect(x + 4 * mm, y + 4 * mm, CW - 8 * mm, CH - 8 * mm, 1.8 * mm, stroke=1, fill=0)
    c.setFillColor(HexColor(accent))
    c.setFont("Helvetica-Bold", 7)
    c.drawCentredString(x + CW / 2, y + CH - 14 * mm, "INDIGO STORM")
    size = 11 if len(label) < 14 else 8.5
    c.setFont("Helvetica-Bold", size)
    c.setFillColor(white)
    words = label.split(" ")
    lines = [label] if c.stringWidth(label, "Helvetica-Bold", size) < CW - 14 * mm else [" ".join(words[:len(words) // 2]), " ".join(words[len(words) // 2:])]
    for i, ln in enumerate(lines):
        c.drawCentredString(x + CW / 2, y + CH / 2 + (len(lines) / 2 - i - 0.7) * (size + 2), ln)
    note = BACK_NOTES.get(kind)
    if note:
        fit(c, f"<i>{escape(note)}</i>", x + 9 * mm, y + 24 * mm, CW - 18 * mm, 14 * mm, size=6.5, color=HexColor(accent), align=1)


# ----------------------------------------------------------------------------- packs

class Card:
    def __init__(self, front, back):
        self.front, self.back = front, back      # back: kind name or a callable for double-sided cards


def build_pack(D, day):
    cards = []
    plan = D.plan.get(day, {})
    for s in [s for s in D.story if day_str(s["Day"]) == day and s.get("Type") == "Intro"]:
        def f(c, x, y, s=s):
            txt = markup(s.get("Text"))
            setup = [f"<b>LEAD TARGET:</b> {plan.get('Lead Target', '?')}  (start at {plan.get('Start Lead', 0)})",
                     f"<b>START EXPOSURE:</b> {plan.get('Start Exposure', 0)}   <b>REDLINE:</b> {plan.get('Exposure Redline', 6)}",
                     "<b>TODAY'S STARS</b>",
                     f"[ ] Reach the Lead target",
                     f"[ ] Finish at Exposure {plan.get('Cover Star Threshold', '?')} or less",
                     f"[ ] {escape(clean(plan.get('Bonus Objective') or 'Bonus Objective'))}"]
            if plan.get("Episode Twist"):
                setup.append(f"<b>TWIST:</b> {escape(clean(plan.get('Episode Twist')))}")
            if any(day_str(t["Day"]) == day and t.get("Type") == "Pursuer" for t in D.threats):
                setup.append("<b>SETUP:</b> place today's Pursuer in a 4th Scene Row slot.")
            draw_text_card(c, x, y, s.get("Title") or f"Day {day}", "INTRO", txt + "<br/><br/>" + "<br/>".join(setup), BAND["Intro"], s["ID"], day, size=7.2)
        cards.append(Card(f, "briefing"))
    j = D.jump.get(day)
    if j:
        ids = [i.strip() for i in str(j["Deck (12 cards)"]).split(",") if i.strip()]
        lst = "<br/>".join(f"{escape(i)}  {escape(clean(D.by_id.get(i, {}).get('Name', '?')))}" for i in ids)
        perks = escape(clean(j.get("Perks") or "none"))
        def f(c, x, y, lst=lst, perks=perks):
            draw_text_card(c, x, y, f"Jump-In: Day {day}", "PROTOTYPE",
                           f"Set up as if you'd played Days 1–{int(day) - 1}.<br/><b>YOUR 12-CARD DECK</b><br/>{lst}<br/><b>UNLOCKED PERKS</b><br/>{perks}",
                           BAND["Jump-In"], f"JUMP-{day}", day, size=6.6)
        cards.append(Card(f, "jumpin"))
    for r in [r for r in D.rules if day_str(r["Day"]) == day]:
        cards.append(rule_card(r))
    for r in [r for r in D.player if day_str(r["Day"]) == day and r.get("Class") != "Awakened"]:
        cards.append(Card(lambda c, x, y, r=r: draw_player(c, x, y, r), "player"))
    for r in [r for r in D.threats if day_str(r["Day"]) == day and r.get("Type") != "Countermeasure"]:
        cards.append(Card(lambda c, x, y, r=r: draw_threat(c, x, y, r), "encrypted" if r.get("Type") == "Encrypted Threat" else "threat"))
    for r in [r for r in D.threats if day_str(r["Day"]) == day and r.get("Type") == "Countermeasure"]:
        cards.append(Card(lambda c, x, y, r=r: draw_threat(c, x, y, r), "countermeasure"))
    for r in [r for r in D.player if day_str(r["Day"]) == day and r.get("Class") == "Awakened"]:
        cards.append(Card(lambda c, x, y, r=r: draw_player(c, x, y, r), "flashback"))
    for s in [s for s in D.story if day_str(s["Day"]) == day and s.get("Type") == "Outro"]:
        def f(c, x, y, s=s):
            extra = []
            if str(plan.get("Perk Unlock") or "").lower() == "yes":
                extra.append("<b>UNLOCK 1 CLEARANCE PERK</b> on your campaign sheet.")
            if plan.get("Debrief / Epilogue"):
                extra.append(f"<b>{escape(clean(plan.get('Debrief / Epilogue')).upper())}</b>")
            extra.append("Record today's Stars. Then discard down to 12 cards.")
            draw_text_card(c, x, y, s.get("Title") or f"Day {day}", "OUTRO", markup(s.get("Text")) + "<br/><br/>" + "<br/>".join(extra),
                           BAND["Outro"], s["ID"], day)
        cards.append(Card(f, "outro"))
    return cards


def rule_card(r):
    front = lambda c, x, y: draw_text_card(c, x, y, r["Title"], "RULES", markup(r.get("Front")), BAND["Rule"], r["ID"], r["Day"], size=7.4)
    back = lambda c, x, y: draw_text_card(c, x, y, r["Title"] + " (cont.)", "RULES", markup(r.get("Back")), BAND["Rule"], r["ID"], r["Day"], size=7.4)
    return Card(front, back)


def write_pdf(path, cards, backs=True, title=""):
    c = canvas.Canvas(path, pagesize=letter)
    c.setTitle(title or os.path.basename(path))
    per = COLS * ROWS
    for start in range(0, len(cards), per):
        chunk = cards[start:start + per]
        for side in ("front", "back") if backs else ("front",):
            for i, card in enumerate(chunk):
                col, row = i % COLS, i // COLS
                if side == "back":
                    col = COLS - 1 - col                      # mirror for long-edge duplex
                x, y = MX + col * CW, PH - MY - (row + 1) * CH
                if side == "front":
                    card.front(c, x, y)
                elif callable(card.back):
                    card.back(c, x, y)
                else:
                    draw_back(c, x, y, card.back)
            cut_marks(c)
            c.setFont("Helvetica", 6); c.setFillColor(MUTED)
            c.drawString(MX, MY / 2, f"{title}  ·  page {start // per + 1} {'fronts' if side == 'front' else 'backs (print flip on long edge)'}")
            c.showPage()
    c.save()


def cut_marks(c):
    c.setStrokeColor(MUTED); c.setLineWidth(0.3)
    for i in range(COLS + 1):
        x = MX + i * CW
        c.line(x, PH - MY + 2 * mm, x, PH - MY + 6 * mm); c.line(x, MY - 2 * mm, x, MY - 6 * mm)
    for j in range(ROWS + 1):
        y = MY + j * CH
        c.line(MX - 2 * mm, y, MX - 6 * mm, y); c.line(PW - MX + 2 * mm, y, PW - MX + 6 * mm, y)


# ----------------------------------------------------------------------------- campaign sheet

def campaign_sheet(path):
    c = canvas.Canvas(path, pagesize=letter)
    c.setTitle("Indigo Storm — Campaign Sheet")
    m = 14 * mm
    c.setFillColor(INK); c.setFont("Helvetica-Bold", 18)
    c.drawString(m, PH - m - 4 * mm, "INDIGO STORM")
    c.setFont("Helvetica", 9); c.setFillColor(MUTED)
    c.drawString(m, PH - m - 9 * mm, "Campaign Sheet  ·  slip into a sheet protector and use a dry-erase marker")
    y = PH - m - 20 * mm

    def track(label, n, y, color, redline=None, note=""):
        c.setFillColor(INK); c.setFont("Helvetica-Bold", 10); c.drawString(m, y + 3 * mm, label)
        fit(c, escape(note), m, y + 1 * mm, 31 * mm, 8 * mm, size=6, color=MUTED)
        bx, bw = m + 34 * mm, 13 * mm
        for i in range(n + 1):
            c.setStrokeColor(color); c.setLineWidth(0.8)
            fill = redline is not None and i == redline
            c.setFillColor(HexColor("#F6D5D0") if fill else PAPER)
            c.rect(bx + i * bw, y - 3 * mm, bw - 1.5 * mm, 10 * mm, stroke=1, fill=1)
            c.setFillColor(color); c.setFont("Helvetica-Bold", 10)
            c.drawCentredString(bx + i * bw + (bw - 1.5 * mm) / 2, y, str(i))
        if redline is not None:
            c.setFont("Helvetica-Bold", 6); c.setFillColor(SUIT["Force"])
            c.drawCentredString(bx + redline * bw + (bw - 1.5 * mm) / 2, y - 6 * mm, "REDLINE")

    track("LEAD", 10, y, SUIT["Recon"], note="Today's target is on the Intro Card")
    y -= 20 * mm
    track("EXPOSURE", 6, y, SUIT["Force"], redline=6, note="Cover Star threshold is on the Intro Card")
    y -= 18 * mm

    c.setFillColor(INK); c.setFont("Helvetica-Bold", 11)
    c.drawString(m, y, "CLEARANCE PERKS")
    c.setFont("Helvetica", 7); c.setFillColor(MUTED)
    c.drawString(m + 46 * mm, y, "Unlock: check the box (7 total).  Each episode: mark USED when you use a perk; erase during cleanup.")
    y -= 6 * mm
    colw = (PW - 2 * m) / 3
    for bi, (branch, perks) in enumerate(PERK_SHEET):
        bx = m + bi * colw
        c.setFillColor(INK); c.setFont("Helvetica-Bold", 7.5)
        c.drawString(bx, y, branch)
        py = y - 4 * mm
        for name, text in perks:
            c.setStrokeColor(INK); c.setLineWidth(0.6)
            c.rect(bx, py - 2.5 * mm, 3.2 * mm, 3.2 * mm)
            c.setFont("Helvetica-Bold", 7.5); c.setFillColor(INK)
            c.drawString(bx + 4.5 * mm, py - 1.8 * mm, name)
            c.setFont("Helvetica", 5.5); c.setFillColor(MUTED)
            c.drawRightString(bx + colw - 9 * mm, py - 1.8 * mm, "USED")
            c.rect(bx + colw - 8 * mm, py - 2.5 * mm, 3.2 * mm, 3.2 * mm)
            fit(c, escape(text), bx + 4.5 * mm, py - 3.5 * mm, colw - 8 * mm, 9 * mm, size=6.3, color=MUTED)
            py -= 14 * mm
    y = py - 6 * mm

    c.setFillColor(INK); c.setFont("Helvetica-Bold", 11)
    c.drawString(m, y, "30-DAY STAR GRID")
    c.setFont("Helvetica", 7); c.setFillColor(MUTED)
    c.drawString(m + 46 * mm, y, "Objective · Cover · Bonus.  Act Debriefs on Days 10 and 20; Epilogue on Day 30.")
    y -= 4 * mm
    cw, ch = (PW - 2 * m) / 10, 12 * mm
    for d in range(30):
        col, row = d % 10, d // 10
        bx, by = m + col * cw, y - (row + 1) * ch
        c.setStrokeColor(HexColor("#C7CCD6")); c.setLineWidth(0.5)
        c.rect(bx, by, cw - 1 * mm, ch - 1 * mm)
        c.setFillColor(INK); c.setFont("Helvetica-Bold", 7)
        c.drawString(bx + 1.5 * mm, by + ch - 4.2 * mm, f"Day {d + 1}")
        for k in range(3):
            c.setStrokeColor(MUTED)
            c.circle(bx + 3.5 * mm + k * 5 * mm, by + 3 * mm, 1.7 * mm)
    y -= 3 * ch + 6 * mm
    c.setFillColor(INK); c.setFont("Helvetica-Bold", 9)
    c.drawString(m, y, "ACT I STARS: ______ / 30      ACT II STARS: ______ / 30      ACT III STARS: ______ / 30      TOTAL: ______ / 90")
    c.showPage()
    c.save()


# ----------------------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser(description="Build print-and-play PDFs for Indigo Storm")
    ap.add_argument("--days", help="comma-separated days to build (default: every day that has cards)")
    ap.add_argument("--fronts-only", action="store_true", help="no back pages (single-sided printing)")
    a = ap.parse_args()
    D = Data()
    os.makedirs(OUT, exist_ok=True)
    backs = not a.fronts_only
    days = [d.strip() for d in a.days.split(",")] if a.days else D.days()
    made = []
    for d in days:
        cards = build_pack(D, d)
        if cards:
            p = os.path.join(OUT, f"Day {int(d):02d} Pack.pdf")
            write_pdf(p, cards, backs, f"Indigo Storm — Day {d} Pack ({len(cards)} cards)")
            made.append((p, len(cards)))
    core = [Card(lambda c, x, y, r=r: draw_player(c, x, y, r), "player") for r in D.player if day_str(r["Day"]) == "CORE"]
    if core and not a.days:
        p = os.path.join(OUT, "Core Deck.pdf"); write_pdf(p, core, backs, "Indigo Storm — Core Operative Deck"); made.append((p, len(core)))
    extras = [Card(lambda c, x, y, r=r: draw_player(c, x, y, r), "player") for r in D.player if day_str(r["Day"]) == "PROTO"]
    extras += [rule_card(r) for r in D.rules if day_str(r["Day"]) == "PROTO"]
    if extras and not a.days:
        p = os.path.join(OUT, "Prototype Extras.pdf"); write_pdf(p, extras, backs, "Indigo Storm — Prototype Extras"); made.append((p, len(extras)))
    if not a.days:
        p = os.path.join(OUT, "Campaign Sheet.pdf"); campaign_sheet(p); made.append((p, 0))
    print(f"Story text: {D.story_source}")
    for p, n in made:
        print(f"  {os.path.relpath(p, HERE)}" + (f"  ({n} cards)" if n else ""))


if __name__ == "__main__":
    main()
