# Playing the Prototype on PlayingCards.io

A one-time table setup (about 20 minutes), then a few minutes per prototype day. No account is needed, but **Export to file** after setup so you never lose a room.

## 1. Export the card images

```bash
source .venv/bin/activate
python3 -m pip install -r requirements.txt
python3 make_print.py --images
```

This creates `print/images/Day 01/`, `Day 06/` … one folder per prototype day:

| Folder | What it is | In PlayingCards.io |
| --- | --- | --- |
| `1 Operative Deck` | Your 15 cards for that day (Jump-In deck + the day's 3 cards) | A card deck |
| `2 Threat Deck` | The day's Threat Deck | A card deck |
| `3 Set Aside` | Pursuer (Day 21), Countermeasures (Day 26), Awakened Card (Day 16) | A card deck kept face-down off to the side |
| `4 Reading` | Intro, Jump-In, Rule Cards (front + back), Outro | Just read these in Preview next to the browser |

Each deck folder has `Fronts/` (numbered so they upload in order) and `Backs/` (a single `Back.png`, or numbered backs when cards in that deck have different backs—only Day 11's Threat Deck).

## 2. Build the table once (Day 1)

1. Go to **playingcards.io** → the **+** (New Custom Room) icon at top right → **Blank Game** → **Enter**.
2. Click the **toolbox icon** in the bottom bar to enter Edit Mode. Click a widget in the right panel to add it, then drag it into place.
3. Add these widgets:
   - **Custom Card Deck** ×3: name them Operative, Threats, Set Aside (see step 3 for loading cards).
   - **Custom Holder** ×7: Operative draw pile, Operative discard, Threat Deck, and **4 Scene Row slots** (the 4th is for Pursuers and some Episode Twists).
   - **Counter** ×2: Lead and Exposure.
   - **Standard 6 Pip Dice** ×4: Timer Dice (Hunt dice for Pursuers).
   - **Heading / Label Text** as you like (e.g., "Scene Row", "Gear & Allies in play").
   - The **Hand** area at the bottom is already there: your 4-card hand goes there.
4. For **each deck**, click it and in the right panel set:
   - **Width 115, Height 160** (the 63 × 88 mm card shape).
   - **Enlarge Objects → Enlarge**, so hovering a card shows it large enough to read.

## 3. Load a day's cards into a deck

For each deck (Operative, Threats, Set Aside):

1. Click the deck → **Cards** icon (the list icon in the right panel).
2. On the first card row, click **UPLOAD IMAGE(S)** next to `image` and select **every file** in that deck's `Fronts/` folder (Cmd+A in the file picker). One image goes on each card, in filename order.
3. If the cards show a count of **0**, click **ALL +1** at the bottom.
4. **Backs:** switch to the **Template** tab → click **VIEW: FACE** and choose **Back**.
   - Single back (most decks): leave the layer set to **All the Same** and use the small image button at the right of the layer field to upload `Backs/Back.png`.
   - Different backs (Day 11 Threats): set the layer to **Different Per-card**. Back on the **Cards** tab each card now has a second field, `image1`; click its **UPLOAD IMAGE(S)** on the first card and select every file in `Backs/`.
5. Click **DONE**.

Then click **Finish** (top of the right panel) to leave Edit Mode, and **Menu (≡) → Export to file** to save the table.

## 4. Each prototype day

1. **Copy the room** (Menu → Copy Room…) so your Day 1 table stays as a template.
2. In the copy, enter Edit Mode and, for each deck: **Cards → OPTIONS → Remove Everything…**, then repeat step 3 with that day's folders. Skip the Set Aside deck on days that have no `3 Set Aside` folder.
3. Open that day's `4 Reading` images in Preview: Intro first, then the Jump-In card and Rule Cards.
4. Set up as the Intro Card says: shuffle the Operative deck into its draw pile and draw 4 into your hand; shuffle the Threat Deck and deal 3 face-up into the Scene Row. On Day 21, put the Pursuer face-up in the 4th slot with a die on it. On Day 11, deal Encrypted Threats (the ones with the ENCRYPTED back) face-down.
5. Set the Lead and Exposure counters to the starting values. Keep perks and Stars on the printed Campaign Sheet (or a scratch note).

**Playing:** click a card to flip it; drag to move. Tuck cards by overlapping them under a Threat, offset so you can count symbols. Put Gear and Allies along the top edge as your "in play" row.

## Tips

- **Retuning:** after editing the workbook, rerun `python3 make_print.py --images` and reload just the deck that changed (Remove Everything → upload).
- **Back up:** use **Export to file** after building each day's room; **Import from File…** restores it.
- **Speed:** keep the browser zoomed out a little so all four Scene Row slots, both counters and your hand fit on one screen.
