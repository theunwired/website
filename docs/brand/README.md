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

**When it shows.** A visitor's stored choice (the nav toggle) wins. With no
stored choice the site follows the system setting. Without JavaScript it is
dark.

**The toggle.** Text only, mono, `DARK / LIGHT`, the current one in primary
text. Below 420px only the theme it switches to is shown. Icons are on hold
until the no-icon rule is revisited.

**Logo.** The On Bone lockup from v2: Cut Black upper wire, Forest lower
wire, Cut Black wordmark. Same for the hero mark.

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
