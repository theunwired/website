# The Unwired — marketing site

A four-page static site for **The Unwired**, an AI automation studio. No build
step, no dependencies. Built from the design handoff in
`../design_handoff_unwired_site/` (`README.md` is the full spec, `CONTENT.md`
is the copy source of truth).

## Pages

| File | Route | What it is |
|---|---|---|
| `index.html` | `/` | Home. Ten beats, in a fixed order. The order is the argument. |
| `what-you-get.html` | `/what-you-get.html` | The deliverable, limits, engagement, pricing |
| `industries.html` | `/industries.html` | Five functions, and where we say no |
| `work.html` | `/work.html` | The case study standard, and notes |

## Assets

| File | What it does |
|---|---|
| `assets/styles.css` | Every token and every rule. Media queries live at the bottom. |
| `assets/wires.js` | The wire field: ten wires on a fixed full-viewport SVG behind everything. |
| `assets/ambient.js` | Panel sweep on entry, and the one shared breathing clock for green accents. |
| `assets/site.js` | Nav, contact modal, reveal, progress rail, page transition, the pinned hero, the agent log. |

## Hard rules

- Border radius is 0 everywhere. No shadows. Structure is drawn with 1px hairlines.
- Two typefaces only: Instrument Sans and IBM Plex Mono. No italics.
- No icons and no imagery. Where an icon is tempting, use a mono step number.
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

## Contact form

Posts to **theunwired.in@gmail.com** via [FormSubmit.co](https://formsubmit.co)
with `fetch` and `Accept: application/json`. Shows a success and a failure state.
There is a honeypot field only.

**Before launch:** replace FormSubmit with a real endpoint, and add server-side
validation and a rate limit.

## Assets are versioned

Asset URLs carry `?v=N`. Bump it in all four pages when you change a file in
`assets/`, or returning visitors may run a stale copy.

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
