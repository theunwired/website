# The Unwired — marketing site

A static site for **The Unwired**, an AI automation studio. No build
step, no dependencies. Built from the design handoff in
`../design_handoff_unwired_site/` (`README.md` is the full spec, `CONTENT.md`
is the copy source of truth). The brand pack, including the guidelines, lives
in `docs/brand/` and is not deployed.

## Pages

| File | Route | What it is |
|---|---|---|
| `index.html` | `/` | Home. Ten beats, in a fixed order. The order is the argument. |
| `what-you-get.html` | `/what-you-get.html` | The deliverable, limits, engagement, pricing |
| `industries.html` | `/industries.html` | Six functions, and where we say no |
| `work.html` | `/work.html` | Engagement one (intelligent document processing) as the hero, then the template every future case study on this page has to fill |
| `finance-exceptions.html` | `/finance-exceptions.html` | Deep dive: P2P, O2C, R2R, tax, treasury |
| `hr-hire-to-retire.html` | `/hr-hire-to-retire.html` | Deep dive: the employee lifecycle, hire to retire |
| `lab.html` | `/lab.html` | The Lab hub: three stage cards, Your run, and the old `#tolerance` / `#handover` anchors forwarded to the stage pages |
| `lab-tolerance.html` | `/lab-tolerance.html` | Lab stage 01, Set the line |
| `lab-handover.html` | `/lab-handover.html` | Lab stage 02, Pass the handover |
| `lab-documents.html` | `/lab-documents.html` | Lab stage 03, Worst-document bench |

`finance-exceptions.html` and `hr-hire-to-retire.html` are industry deep
dives, linked directly from their rows on `industries.html` (Finance is 01,
HR is 02). Document processing isn't an industry — it's the capability behind
most of these engagements — so instead of its own page it's the featured
content on `work.html` itself: the diagram, the document rows, how it works,
the benchmarks and the fit table all live there, above the case-study
template. All of it reuses classes already in `assets/styles.css`
(`.ind-row`, `.fit-table`, `.stat-block`, `.diagram-panel`, etc.) rather than
introducing page-specific styling.

## Assets

| File | What it does |
|---|---|
| `assets/styles.css` | Every token and every rule. Media queries live at the bottom. |
| `assets/wires.js` | The wire field: ten wires on a fixed full-viewport SVG behind everything. It does not run on Lab pages, which draw their own grid. |
| `assets/ambient.js` | Panel sweep on entry, and the one shared breathing clock for green accents. |
| `assets/site.js` | Nav, contact modal, reveal, progress rail, page transition, the pinned hero, the agent log. |
| `assets/lab.js` | Lab stages 01 and 02. Builds the seeded invoice queue, runs the rules, draws the chart, parses the config. No network calls. |
| `assets/lab-documents.js` | Lab stage 03. Draws the six documents as SVG and runs the pick, reveal and score flow. No network calls. |
| `assets/lab-run.js` | Every Lab page. Keeps each stage's result in `sessionStorage` for Your run, stamps each lesson once it is earned, builds the Copy the sheet text, and pre-fills the contact form. |

## Hard rules

- Border radius is 0 everywhere. No shadows. Structure is drawn with 1px hairlines.
- Two typefaces only: Instrument Sans and IBM Plex Mono. No italics.
- No icons and no imagery. Where an icon is tempting, use a mono step number.
  The one exception is the theme toggle's split square (see `docs/brand/README.md`).
- `#4FBF9B` (Label) is for section eyebrows and chapter numerals only. Never a fill.
- No gradients as decoration. The only two are functional: the travelling signal
  on a wire, and the panel sweep.
- Never invent a number, a client name, or a testimonial. Placeholders say
  "Coming soon" and name what will fill them.
- Everything motion-related is off under `prefers-reduced-motion`.

## Things not to reintroduce

These were fixed deliberately. Changing them back reproduces a real bug.

- **The wire field must not live in a component tree.** `wires.js` appends its own
  container to `<body>`. It is single-init guarded and reuses an existing
  `window.UnwiredWires` object.
- **On home the field follows the hero mark, not page scroll.** `site.js` sets
  `UnwiredWires.override` from the hero pin and leaves it at 0 afterwards. Handing
  back to page progress makes the field re-tangle and fight the logo.
- **When the hero ✕ collapses, its horizontal margins must animate to 0 too,**
  or the wordmark settles as "theun wired".
- **Hero copy lives in normal flow inside the sticky stage.** Positioning it
  absolutely clipped it on viewports under ~918px tall.
- **Navigation is never scheduled inside `requestAnimationFrame`.** rAF is
  suspended in a background tab, which left a link click covering the page with
  the transition panel and never navigating.
- **The transition panel defaults to open (`translateX(101%)`) in CSS,** so a
  script failure cannot leave a full-screen black overlay.
- **Nothing is hidden unless it can be shown again.** `initReveal` bails out if
  `IntersectionObserver` is missing, each initialiser is isolated so one throw
  cannot leave `pre-reveal` content stuck at `opacity: 0`.
- **The hero mark's peak scale comes from CSS (`--mark-peak`).** At the desktop
  1.62× the lockup is wider than a phone viewport and gets clipped.
- **The nav collapses to MENU at 1100px, not lower.** With the theme toggle in
  the bar, the links wrap onto two lines below about 1040px.
- **The links and the toggle both carry `margin-left: auto` on desktop.** That
  keeps the links centred and the toggle beside the CTA. Remove either and the
  icon floats alone in the middle of the bar.

## Themes

Dark and light. Every colour is a token on `:root` in `assets/styles.css`,
and `:root[data-theme="light"]` remaps the same tokens for a Bone canvas. The
light values and the reasoning are in `docs/brand/README.md`.

- An inline script in each page's `<head>` sets `data-theme` before first
  paint: stored choice (`localStorage['unwired-theme']`), else dark. The
  system setting is deliberately ignored. Copy it into any new page or it
  flashes.
- `site.js` runs the nav toggle and fires `unwired:theme` on every switch.
  `wires.js` and `ambient.js` read their colours from tokens and repaint on
  that event.
- **Never write a hex value into a rule, an inline SVG or a script.** Use a
  token. In inline SVG that means `style="fill:var(--quiet)"`, since
  presentation attributes cannot take `var()`.
- `--bone` means primary text, so it is Cut Black in light. Text sitting on a
  Forest or Signal fill uses `--on-accent`.

## The Lab

The Lab is the brand's rebel wing: a true blueprint world (`data-world="blueprint"`
on `<html>`, whiteprint in the light theme), the visitor's own pen marks, and a
title block on every sheet. Its rules are in `docs/brand/README.md`; nothing
from it belongs on the main site.

The sheet the site promises, the Unwired Blueprint, is a template in
`docs/templates/unwired-blueprint.html`. How to fill it in is in
`docs/brand/README.md`.

A hub (`lab.html`, sheet 00) and three stage pages. The hub opens on the bet:
one invoice from the queue (the largest duplicate whose original was posted
just before it, picked by `initHub` in `assets/lab.js`), post it or send it
to a person. Under it, the line over all 200 invoices can be dragged, and
the duplicate rule is one word the visitor strikes. Every number there comes
from the engine: the whole slider moves about $6k, the one word about $55k.
Stage 01's bet is the near miss: the widest line that still catches every
overbill, revealed as a dimension line to the nearest one. Every Lab page has the stage bar
under the nav, and every stage ends with a Next stage button, so nobody has
to find their way back. The home page invites people in from a band inside
the contact section, above the CTA, so the ten numbered beats are untouched.

- **01 Set the line** and **02 Pass the handover** run on one seeded queue of
  200 made-up invoices (`buildQueue` in `assets/lab.js`, seed 40912), so
  every visitor sees the same numbers. Changing the seed or the mix changes
  every number on those pages, so re-read the summary sentences afterwards.
- **03 Worst-document bench** uses six made-up documents drawn in
  `assets/lab-documents.js`. Their extractions and confidence scores were
  written by hand to show real failure modes, and the page says so. The
  invoices add up, check the arithmetic if you edit one. Documents are paper,
  so they stay light in both themes.
- **Your run** reads each stage's result from `sessionStorage`. It is kept
  for the tab only and recorded only when the visitor actually does
  something, never on page load. "Send this to us" fills the contact form's
  message; the visitor still writes their name and sends it.
- **Lessons are never printed before play.** Hub cards and stage headlines
  are questions. Each lesson is stamped (`data-lab-earned` in the HTML,
  `earned()` in `assets/lab-run.js`) once the visitor has done the thing it
  is about: let go of the line on 01, passed all three tasks on 02, met a
  field the agent read at 90% or more, wrongly, above the review line on 03.
  An earned lesson stays earned for the tab, and Copy the sheet only ever
  carries earned lessons.
- **Stage 02 starts from the visitor's line.** If they set one on 01,
  `rules.yaml` loads it with a `# from sheet 01` comment, and the sentence
  under the stats credits each held problem to the rule and config line that
  held it.
- **Copy the sheet** gives plain text to paste anywhere: the lesson in the
  visitor's numbers first, the link last, "/" separators and no emoji. If
  the browser refuses the clipboard, the text is shown selected instead.
- **Your run and the sign pad stay hidden until there is a run.** The
  "Approved by a person" stamp needs a signature and at least one stage.
- **Link cards.** Each Lab page has its own 1200 × 627 card
  (`assets/og-lab*.png`), a question over the Lab's real queue. They are
  drawn by `docs/brand/social/lab-cards/` (`node shoot.js` there, with
  Playwright installed), which copies the engine fresh from `assets/lab.js`,
  so redraw them whenever the seed, the mix or the rules change. After
  changing a card, re-scrape the page in LinkedIn's Post Inspector or it keeps
  showing the old one. The cards print theunwired.in/lab, which `vercel.json`
  redirects to `/lab.html`.
- Nothing is sent anywhere until the visitor sends the contact form
  themselves. Copy the sheet only writes to the visitor's own clipboard. If a
  Lab tool ever calls a server or takes uploads, update `privacy.html` and
  `security.html` first.

## Contact form

Posts to **theunwired.in@gmail.com** via [FormSubmit.co](https://formsubmit.co)
with `fetch` and `Accept: application/json`. Shows a success and a failure state.
There is a honeypot field only.

**Before launch:** replace FormSubmit with a real endpoint, and add server-side
validation and a rate limit.

## Assets are versioned

Asset URLs carry `?v=N`. Bump it in every page that loads the file when you
change a file in `assets/`, or returning visitors may run a stale copy.

## Local preview

```bash
python3 -m http.server 5500
```

Then open <http://localhost:5500/>.

## Deploy

Static, no build step. Deployed to **Vercel** from this repo, served at
**https://theunwired.in/**.

- Vercel detects no framework and serves the repo root. There is no build
  command and no `package.json` on purpose.
- `vercel.json` sets security headers and pins `cleanUrls: false`, so pages are
  served at `/work.html` (which is what every canonical, the sitemap and every
  internal link assume). Do not flip `cleanUrls` on without also rewriting the
  internal links, the canonicals and `sitemap.xml` to the extensionless paths.
- The domain is attached in the Vercel dashboard. **Do not add a `CNAME` file** —
  that is a GitHub Pages mechanism and Vercel ignores it.
- `404.html` is served by Vercel for unmatched routes. It uses root-absolute
  asset paths (`/assets/...`) because it can be served from any URL depth.

## Before the site goes public

- [ ] Attach `theunwired.in` to the project in the Vercel dashboard and confirm
      DNS. Until then the canonical URLs point at a domain that does not resolve.
- [ ] Send one test message through the contact form. FormSubmit emails a
      one-time confirmation link to `theunwired.in@gmail.com` on the very first
      submission. **Until somebody clicks it, no form message is delivered.**
- [ ] Replace FormSubmit with a real endpoint, and add server-side validation
      and a rate limit. `_captcha` is off and there is only a honeypot, so the
      current setup is spam-exposed.

## Nice to have, not blocking

- Add an Open Graph image. `og:image` is not set, so link previews on Slack,
  LinkedIn and WhatsApp fall back to title and description only.
- Self-host the two fonts instead of loading them from Google Fonts.
- Add a Content-Security-Policy header. It needs to allow Google Fonts
  (`style-src`/`font-src`), `'unsafe-inline'` styles (the hero and the field
  write inline styles), and `formsubmit.co` in `connect-src`/`form-action`.
