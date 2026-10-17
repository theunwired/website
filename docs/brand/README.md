# Brand

The brand pack for The Unwired, kept next to the site so every change can be
checked against it. This folder is excluded from the deploy (`.vercelignore`):
the guidelines are marked internal, not for publication.

| Path | What it is |
|---|---|
| `pack/Unwired Brand Guidelines v2.dc.html` | The reference. Positioning, messaging, voice, identity, motion, applications. Open it in a browser. |
| `pack/README.md` | The pack's own index, as delivered. Some paths in it (`handoff/`, `pptx/`, `assets/`) were not part of the upload. |
| `pack/Unwired *.dc.html` | Website prototypes, sales templates, social sources, the two films. They load the `.js` files beside them. |
| `pack/*.js`, `pack/*.jsx` | The prototype runtime those templates need. The production site uses its own copies in `/assets`, not these. |
| `social/` | OG card, LinkedIn banner, three post templates (PNG). |

Not in the repo: the PowerPoint files and the two MP4 films (about 30MB).
Keep those in the shared drive. `handoff/CONTENT.md`, the copy source of
truth, has not been supplied yet.

---

## Addendum to v2: light theme on the web

v2 says light mode exists only for print and email. As of this addendum the
website has a light theme too. Dark stays the brand's primary canvas.

**When it shows.** Only when the visitor picks it with the nav toggle. The
choice is remembered. Everyone else, including visitors whose system is set
to light, and anyone without JavaScript, gets dark: it is the brand's first
impression.

**The toggle.** The one icon on the site, and a deliberate exception to the
no-icon rule. A 16px hairline square, half filled: the filled half slides
across when the theme switches. It is drawn in the mark's grammar (square,
1px, no radius), never a sun or a moon. Muted at rest, primary text on
hover, with a 40px hit area and an `aria-label` and tooltip naming the
theme it switches to. Any further icon needs the same case made for it.

**Logo.** The On Bone lockup from v2 (decided over a dark nav band and a
dark tile behind the mark). Cut Black upper wire, Forest lower wire, Cut
Black wordmark. Same for the hero mark.

**Colour roles.** Every role keeps its job; only the value changes. Label and
Signal are too faint on Bone (2.0:1 and 3.7:1), so the text greens go darker.
Every text role clears 4.5:1 on both Bone and Panel.

| Role (CSS token) | Dark | Light | Notes |
|---|---|---|---|
| Canvas `--cut` | `#0B0C0B` | `#F2F1ED` | Bone |
| Panel `--panel` | `#161814` | `#E9E8E2` | still one step only |
| Primary text `--bone` | `#F2F1ED` | `#0B0C0B` | Cut Black type |
| Body `--body` | `#D6D7D1` | `#3E4238` | 9.1:1 |
| Muted `--muted` | `#8A8F84` | `#5E625A` | 5.5:1 |
| Slate `--quiet` | `#7C8177` | `#63675F` | 5.0:1 |
| Hairline `--hairline` | `#24261F` | `#DEDCD4` | the v2 print value |
| Forest `--forest` | `#0F5C4A` | `#0F5C4A` | unchanged; fills and rules |
| Signal `--signal` | `#2E8B6E` | `#1F7A5F` | 4.6:1 |
| Label `--label` | `#4FBF9B` | `#136B55` | 5.7:1; still eyebrows and numerals only |
| Error `--error` | `#C46A5A` | `#A8503F` | 4.8:1 |
| On accent `--on-accent` | `#F2F1ED` | `#F2F1ED` | text on a Forest or Signal fill |

**The wire field.** Same grammar, retuned so it stays structure at the edge
of vision on Bone: wires `#DCDAD1`, the green wire `#B4D0C5`, nodes
`#BDBBB2`, a lit node goes Forest. All values live as `--wire-*` tokens in
`assets/styles.css`.

**Breathing.** The shared 7s clock runs between Forest and Signal on light,
instead of Signal and a darker Signal on dark.

Everything else in v2 applies unchanged: radius 0, no shadows, two
typefaces, no italics, one green, no decorative gradients.

---

## Addendum to v2: discovery includes a demo

v2's voice section uses "Most AI pilots die in the demo. We don't run demos."
as its contrarian example. The team has since decided that free discovery
includes a demo, so the second sentence no longer holds. What stays true,
and what the site now says everywhere:

- **The demo runs on the client's samples, never ours,** ideally the worst
  ones they have. It shows where the build struggles as well as where it
  works.
- **A demo is not the system.** Production means their access rules, their
  tolerances, a parallel run and a handover.
- "Most AI pilots die in the demo" still stands as a line, and the note of
  that name stays. It argues against happy-path demos, which is the same
  thing a demo on your worst samples is for.
- Retired: "We don't run demos", and "Built for operations, not demos" as a
  section header (now "Built for operations, not the happy path").

Where it shows up: the build patterns and "What a demo is" on Work, the
Discovery step on every industry deep dive, the pricing section on What
you get, the FAQ, and the close of the pilots note.

---

## Addendum to v2: the Lab is the rebel wing

The Lab (`lab.html` and its three stages) runs on its own rules. The main site
keeps v2 as written; nothing below leaks out of the Lab, apart from the Lab
band on home, which stays in the main site's style.

**The idea.** "You draw the line." is the Lab's headline. Every system we
build has a line: left of it the agent acts, right of it a person decides.
"We build it. You own it." stays the company tagline.

**The world: a true blueprint.** Lab pages set `data-world="blueprint"`.
Dark is the blueprint, Prussian `#10304A` with white linework. The light theme
is a whiteprint, `#F3F7FA` paper with blue linework. This deliberately breaks
the one-green rule, here only: blue is the ground, green still means "the
agent acted", red still only means "wrong". Every text role clears 4.5:1 on
ground and panel in both. Tokens are in `assets/styles.css`.

**The line.** One vertical, always labelled with its value ("YOUR LINE ·
6.0%"). If it holds no value, it isn't the line.

**The pen.** Drawn strokes, never a typeface, and only where a person acts:
the visitor's ticks on the handover tasks and on the bench, and their
initials when they sign the sheet. The rule is still two typefaces and a hand.

**The drafting marks.** Every Lab sheet carries a title block (sheet, drawn
by, checked by, rev). Dimension lines measure across what they measure, as
under the tolerance chart. The "Approved by a person" stamp shows only after
the visitor has signed and played something: a stage, or a moved line or
struck word on the hub. Stamps are in the pen's
ink, never red: red still only means wrong.

**No wire field.** The green-wired field never runs on Lab pages. The
blueprint draws its own grid, and green there only means "the agent acted".

**Bet first, lesson after.** A Lab sheet opens on a question the visitor
answers by playing. Its lesson is stamped only once they have played it, on
the stage and on its hub card. Never print a lesson before the play, in
cards, headlines or share text.

**Sheet 00, the hub.** The Lab opens on one call on one invoice, then the
line over the whole queue. The duplicate rule is shown as config, one word
the visitor strikes with the pen, so the lesson lands as an act: the line
matters, the rule matters more.

**Leaving the site.** Copy the sheet gives plain text: the lesson in the
visitor's own numbers first, the link last, "/" separators, no emoji. Every
Lab page has its own link card: a question over a labelled line, or on sheet
00, over the invoice it opens on.

**The Unwired Blueprint.** The named output of discovery: one sheet with the
process as it runs today, the process unwired, and the line, signed by the
process owner, including when the answer is not to build. What you get, the
FAQ and every deep dive describe discovery this way. The template is
`docs/templates/unwired-blueprint.html`; see below.

**Decided for the Lab (16 Oct 2026).** From the catchiness brainstorm:
- The hub's first screen is a cold open on one invoice (post it, or send it
  to a person?) with the draggable line right under it. Shipped 17 Oct. Stage 01's bet
  then moves to the overbill near miss: a 3.5% line against INV-40168 at
  3.9%.
- The Lab may publish rules that say no. A draft Blueprint's verdict can say
  "don't build it", once the founders have written and signed the criteria.
- No monthly series yet. Closing cards are worth writing; offer founder
  mark-ups only with a turnaround of two working days.
- The measure is Blueprint requests from operators, not shares.

---

## The Unwired Blueprint template

`docs/templates/unwired-blueprint.html` makes the sheet discovery ends with.
It is internal (the `docs/` folder never deploys). Open the file in Chrome or
Edge.

1. **Start blank.** The file opens on example values with an "EXAMPLE · NOT A
   CLIENT SHEET" stamp. Editing the example keeps the stamp, so a real sheet
   always starts from **Start blank**.
2. **Fill it in with the process owner in the room.**
   - *As run today:* one step per line, `step | where it happens`. The
     sheet draws one wire through the places in order, so every hand-off
     shows as a crossing, and prints the numbered step names under it.
   - *Measured today:* `label | value | measured by`. Discovery measures
     only. An empty box beats an estimate.
   - *As unwired:* `agent: …`, `decision: …`, `person: …`. A person line
     hangs under the decision before it.
   - *The line:* `rule | value`, plus what stays with a person.
   - *Verdict:* build it, not yet, or don't build it, with one sentence why.
     "Don't build it" is a valid sheet.
3. **Print or save as PDF.** Pick Whiteprint (saves ink) or Blueprint, and A3
   or A4 landscape. In the print dialog turn on "Background graphics". The
   process owner signs the printed sheet in pen.
4. **Keep the data.** Edits save in that browser as you type. Use
   **Export JSON** to keep a copy with the client's files and **Import JSON**
   to reopen it.

`unwired-blueprint-example-A3.pdf` is the example sheet, for showing what a
client will receive.
