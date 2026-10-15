# The Unwired — brand and sales asset pack

Everything built for The Unwired, in one folder. Open any `.html` file in a
browser. Nothing needs installing and nothing calls out to a server except
Google Fonts and the contact form.

---

## Start here

| If you want to… | Open |
|---|---|
| Read the brand system | `Unwired Brand Guidelines v2.dc.html` |
| Present the brand | `Unwired Brand Guidelines Deck.dc.html` |
| Pitch a client | `Unwired Pitch Deck.dc.html` |
| Send a proposal | `Unwired Proposal Template.dc.html` |
| Change website copy | `handoff/CONTENT.md` |
| Hand the site to a developer | `handoff/README.md` |

---

## 1 · Website

Four routes, fully built. Open `Unwired Home.dc.html` and the nav links work.

| File | Route |
|---|---|
| `Unwired Home.dc.html` | `/` — the ten-beat argument |
| `Unwired What You Get.dc.html` | `/what-you-get` |
| `Unwired Industries.dc.html` | `/industries` |
| `Unwired Work.dc.html` | `/work` |

Shared runtime: `wires.js` (the background wire field), `ambient.js`
(reveals, panel sweep, breathing accents), `responsive.js` (a prototype-only
shim — **delete it in the real build** and use media queries instead).

**To build the real site**, give a developer the `handoff/` folder. It
contains the full spec, every string, and notes on four bugs not to
reintroduce.

---

## 2 · Brand

| File | What it is |
|---|---|
| `Unwired Brand Guidelines v2.dc.html` | The full system: positioning, messaging, voice, identity, motion, applications. The reference document. |
| `Unwired Brand Guidelines Deck.dc.html` | The same content as 28 presentable slides, plus 6 reusable template slides. |
| `pptx/Unwired Brand Guidelines v2 - flat.pptx` | Flat-image slides. Looks exactly right, text not editable. |
| `pptx/Unwired Brand Guidelines v2 - editable.pptx` | Native text. Use this one if you need to edit copy or drop a video behind the text. |

Version 2 supersedes the original motion rules. The old rule (opacity and
8px translate only) was written for a brochure and is marked obsolete in the
document.

---

## 3 · Sales

| File | When you use it |
|---|---|
| `Unwired Pitch Deck.dc.html` | The 12-slide client pitch. 20 minutes. Speaker notes are written as coaching, not description. |
| `pptx/Unwired Client Pitch.pptx` | The same deck for PowerPoint. |
| `Unwired One Pager.dc.html` | The leave-behind. One page, print or PDF, emailed an hour after the call. |
| `Unwired Proposal Template.dc.html` | Scope, guardrails, timeline, price, what is excluded, signature block. |
| `Unwired Discovery Worksheet.dc.html` | Week one. Fill it in with the person who actually runs the process. |
| `Unwired Handover Pack.dc.html` | The end of an engagement. Proves the "you own it" claim. |
| `Unwired Case Study Template.dc.html` | Publishing a result. Enforces the five-part standard from the Work page. |

Every one of these has `[BRACKETED]` placeholders. Replace all of them.
**Never publish an unmeasured number.**

---

## 4 · Motion

| File | What it is |
|---|---|
| `Unwired Untangle Film.dc.html` | 12 seconds. The wires and the wordmark untangle together and land on the tagline. Plays once. For title slides. |
| `Unwired Wire Loop Film.dc.html` | 15 seconds, seamless loop, no text. For slide backgrounds. |

**To get a video file:** open the film, then **Share → Export → Video**.

**To use it in PowerPoint:** Insert → Video → This Device → drag to cover the
slide → right-click → Send to Back → Playback tab → Start: Automatically (and
tick Loop until Stopped for the background loop).

**Google Slides** needs the video in Google Drive first, then Insert → Video →
Google Drive, and Format options → Autoplay when presenting.

Neither PowerPoint nor Google Slides can run JavaScript, so video is the only
way to get motion into a presentation file. Both films have a Tweaks panel for
accent, intensity and hiding the timeline bar.

Use `Unwired Slide Templates.dc.html` / `pptx/Unwired Slide Templates.pptx`
when you want blank slides to drop video behind — those nine slides have no
background graphics at all.

---

## 5 · Social and email

| File | Size |
|---|---|
| `assets/linkedin-banner-1584x396.png` | LinkedIn company banner |
| `assets/og-card-1200x630.png` | Site share card (Open Graph) |
| `assets/post-a-statement-1080.png` | Post template — one statement |
| `assets/post-b-three-beats-1080.png` | Post template — a point and three beats |
| `assets/post-c-agent-log-1080.png` | Post template — an agent log |
| `Unwired Social Assets.dc.html` | The editable source for all five |
| `Unwired Email Signature.html` | Two signatures, table-based, with install steps |

LinkedIn posting stance, from the guidelines: one idea per post, drawn from
work you actually did. No AI news commentary, no listicles. If you cannot name
the process, do not post it.

---

## Rules that apply to everything here

- Border radius 0. No shadows. Structure is drawn with 1px hairlines.
- Two typefaces: Instrument Sans and IBM Plex Mono. No italics, ever.
- No icons. Where an icon is tempting, use a mono step number.
- One green. `#4FBF9B` is for section eyebrows and chapter numerals only.
- No stock photography, no robots, no glowing brains, no particle clouds.
- Short sentences. Full stops. No em dashes. The banned-word list is in
  `handoff/CONTENT.md`.
- Never invent a number, a client name, or a testimonial. Placeholders say
  "Coming soon" and name what will fill them.

---

## Still open

These are the gaps. Each one is deliberately left empty rather than filled
with something invented.

1. **Founder names.** Decided: no portraits, each founder presented by
   function. Names still to come.
2. **One real case study with a client-measured number.** Every claim in the
   pack is an assertion until this exists. It is the single highest-value
   thing you can add.
3. **Published pricing.** Discovery is free, build is priced. The number goes
   into the proposal template once two engagements have set the range.
4. **Domain mailbox.** Everything currently points at
   `theunwired.in@gmail.com`. Update the site, the signature and the one-pager
   together when the domain mailbox is live.
