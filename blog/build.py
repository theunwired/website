#!/usr/bin/env python3
"""Blog pipeline for theunwired.in. One post JSON renders two outputs that
must look the same: the site page (note-<slug>.html) and the review email.

  python3 blog/build.py lint    POST.json            check the house rules
  python3 blog/build.py page    POST.json [OUT]      render the site page
  python3 blog/build.py email   POST.json [OUT]      render the review email
  python3 blog/build.py extract EMAIL.html [OUT]     recover POST.json from an email
  python3 blog/build.py fingerprint POST.json        hash shown in the review email
  python3 blog/build.py publish POST.json            write the page, add it to
                                                     work.html#notes and sitemap.xml

Post JSON fields: slug, title, description, lede, answer, date (YYYY-MM-DD),
summary, cta_heading, cta_text, reviewer, sections[{heading, html}],
from_our_builds (html), faq[{q, a}], sources[{title, url, publisher}].
See blog/AGENT.md for what goes in each.
"""
import base64, html, json, re, sys, zlib
from datetime import date
from pathlib import Path

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://theunwired.in"
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

BANNED_WORDS = [
    "delve", "showcase", "foster", "bolster", "enhance", "resonate", "leverage",
    "robust", "seamless", "transformative", "game-changer", "game changer", "unlock",
    "empower", "cutting-edge", "cutting edge", "tapestry", "in today's", "landscape",
    "furthermore", "moreover", "additionally", "revolutionize", "supercharge",
    "elevate", "paradigm", "synergy", "harness",
]
# Stack and employers must never appear in customer-facing copy.
BANNED_NAMES = [
    "claude", "anthropic", "n8n", "pymupdf", "langchain", "langgraph", "openai api",
    "kognitos", "databricks", "part-time", "side project", "side hustle",
]
REQUIRED = ["slug", "title", "description", "lede", "answer", "date", "summary",
            "cta_heading", "cta_text", "reviewer", "sections", "from_our_builds",
            "faq", "sources"]


# ------------------------------------------------------------------ helpers
def load(p):
    return json.loads(Path(p).read_text())


def esc(s):
    return html.escape(s, quote=True)


def nice_date(d):
    y, m, dd = d.split("-")
    return f"{int(dd)} {MONTHS[int(m) - 1]} {y}"


def month_tag(d):
    y, m, _ = d.split("-")
    return f"{MONTHS[int(m) - 1].upper()} {y}"


def straighten(s):
    return (s.replace("‘", "'").replace("’", "'")
             .replace("“", '"').replace("”", '"'))


def article_html(post):
    out = [f'        <p class="article__answer">{post["answer"]}</p>']
    for sec in post["sections"]:
        body = re.sub(r"(<table.*?</table>)", r'<div class="article__table">\1</div>',
                      sec["html"], flags=re.S)
        out.append(f'        <h2>{sec["heading"]}</h2>\n        {body}')
    out.append('        <h2>From our builds</h2>\n'
               f'        <div class="article__from">{post["from_our_builds"]}</div>')
    out.append("        <h2>Questions people ask</h2>")
    for f in post["faq"]:
        out.append(f'        <h3>{f["q"]}</h3>\n        <p>{f["a"]}</p>')
    items = "".join(
        f'<li><a href="{esc(s["url"])}" rel="noopener">{s["title"]}</a>'
        + (f', {s["publisher"]}' if s.get("publisher") else "") + "</li>"
        for s in post["sources"])
    out.append(f'        <h2>Sources</h2>\n        <ol class="article__sources">{items}</ol>')
    out.append('        <p class="article__disclosure">How this note was made: researched and '
               'drafted with AI assistance, then reviewed and edited by the Unwired team. '
               'Read our <a data-wipe-link href="editorial-policy.html">editorial policy</a>.</p>')
    return "\n".join(out)


def byline(post):
    return (f'The Unwired team · Reviewed by {post["reviewer"]} · '
            f'Updated {nice_date(post["date"])}')


def jsonld(post):
    url = f'{SITE}/note-{post["slug"]}.html'
    org = {"@type": "Organization", "name": "The Unwired", "url": SITE + "/"}
    graph = [{
        "@type": "BlogPosting",
        "headline": post["title"],
        "description": post["description"],
        "datePublished": post.get("published", post["date"]),
        "dateModified": post["date"],
        "author": org,
        "publisher": org,
        "mainEntityOfPage": url,
        "image": SITE + "/assets/og.png",
        "citation": [s["url"] for s in post["sources"]],
    }, {
        "@type": "FAQPage",
        "mainEntity": [{
            "@type": "Question",
            "name": BeautifulSoup(f["q"], "html.parser").get_text(),
            "acceptedAnswer": {"@type": "Answer",
                               "text": BeautifulSoup(f["a"], "html.parser").get_text()},
        } for f in post["faq"]],
    }]
    return json.dumps({"@context": "https://schema.org", "@graph": graph},
                      ensure_ascii=False).replace("</", "<\\/")


# --------------------------------------------------------------------- lint
def lint(post):
    errs, warns = [], []
    for k in REQUIRED:
        if not post.get(k):
            errs.append(f"missing field: {k}")
    if errs:
        return errs, warns
    if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", post["slug"]):
        errs.append("slug must be lowercase words joined by hyphens")
    if (ROOT / f'note-{post["slug"]}.html').exists() and not post.get("update"):
        errs.append(f'note-{post["slug"]}.html already exists (set "update": true to replace)')
    blob = json.dumps(post, ensure_ascii=False)
    text = BeautifulSoup(article_html(post), "html.parser").get_text(" ")
    low = (text + " " + post["title"] + " " + post["lede"] + " " + post["description"]).lower()
    if "—" in blob or "–" in blob:
        errs.append("em or en dash found; rewrite the sentence")
    for w in BANNED_WORDS:
        if re.search(r"\b" + re.escape(w) + r"\b", low):
            errs.append(f"banned word: {w}")
    for w in BANNED_NAMES:
        if w in low:
            errs.append(f"banned name: {w}")
    words = len(text.split())
    if not 900 <= words <= 2200:
        errs.append(f"word count {words}, want 900-2200")
    aw = len(BeautifulSoup(post["answer"], "html.parser").get_text().split())
    if not 35 <= aw <= 70:
        errs.append(f"answer is {aw} words, want 40-60")
    if len(post["description"]) > 160:
        errs.append(f'description is {len(post["description"])} chars, max 160')
    if not 3 <= len(post["faq"]) <= 5:
        errs.append("faq needs 3-5 questions")
    if len(post["sources"]) < 3:
        errs.append("need at least 3 sources")
    for s in post["sources"]:
        if not s["url"].startswith("https://"):
            errs.append(f'source not https: {s["url"]}')
    if len(BeautifulSoup(post["from_our_builds"], "html.parser").get_text().split()) < 40:
        errs.append("from_our_builds is too thin (under 40 words)")
    if "<blockquote" not in blob:
        warns.append("no quotation; quotes from named sources help AI citation")
    if "<table" not in blob:
        warns.append("no table; most posts should have one comparison table")
    return errs, warns


# --------------------------------------------------------------------- page
SHELL = "note-tolerance-is-the-design.html"


def make_template():
    """Build the page shell from a live note page at render time, so new
    posts always carry the site's current nav, footer and asset versions."""
    t = (ROOT / SHELL).read_text()
    subs = [
        (r"<title>.*?</title>", "<title>{{TITLE}} · The Unwired</title>"),
        (r'<meta name="description" content="[^"]*">', '<meta name="description" content="{{DESCRIPTION}}">'),
        (r'<meta property="og:title" content="[^"]*">', '<meta property="og:title" content="{{TITLE}} · The Unwired">'),
        (r'<meta property="og:description" content="[^"]*">', '<meta property="og:description" content="{{DESCRIPTION}}">'),
        (r'<meta property="og:type" content="[^"]*">', '<meta property="og:type" content="article">'),
        (re.escape(SITE) + "/" + re.escape(SHELL), SITE + "/note-{{SLUG}}.html"),
        (r'(<link rel="stylesheet" href="assets/styles\.css[^"]*">)',
         r'\1\n<link rel="stylesheet" href="assets/notes.css?v=1">\n<script type="application/ld+json">{{JSONLD}}</script>'),
        (r'<h1 class="h-page">.*?</h1>', '<h1 class="h-page">{{TITLE}}</h1>'),
        (r'<p class="lede">.*?</p>', '<p class="lede">{{LEDE}}</p>'),
        (r'<p class="article__meta">.*?</p>', '<p class="article__meta">{{BYLINE}}</p>'),
        (r'(<section class="sec sec--rule" data-section=")[^"]*(")', r"\1{{TITLE}}\2"),
        (r'<article class="article"([^>]*)>.*?</article>', r'<article class="article"\1>\n{{ARTICLE}}\n      </article>'),
        (r'(<div class="cta"[^>]*>\s*<div>\s*<h2 class="h-section">).*?(</h2>\s*<p>).*?(</p>)',
         r"\1{{CTA_HEADING}}\2{{CTA_TEXT}}\3"),
    ]
    for pat, rep in subs:
        t, n = re.subn(pat, rep, t, count=1, flags=re.S)
        if n != 1:
            raise SystemExit(f"shell page changed shape, could not apply: {pat}")
    return t


def render_page(post):
    t = make_template()
    vals = {
        "TITLE": esc(post["title"]), "DESCRIPTION": esc(post["description"]),
        "SLUG": post["slug"], "LEDE": post["lede"], "BYLINE": esc(byline(post)),
        "CTA_HEADING": post["cta_heading"], "CTA_TEXT": post["cta_text"],
        "JSONLD": jsonld(post), "ARTICLE": article_html(post),
    }
    for k, v in vals.items():
        t = t.replace("{{" + k + "}}", v)
    assert "{{" not in t, "unfilled placeholder"
    return t


# -------------------------------------------------------------------- email
# Dark canvas, the same tokens as the site's default theme, inlined because
# mail clients drop <style> and CSS variables.
C = dict(cut="#0B0C0B", panel="#161814", hair="#24261F", hairhi="#2E3129", bone="#F2F1ED",
         body="#D6D7D1", quiet="#7C8177", forest="#0F5C4A", signal="#2E8B6E", label="#4FBF9B")
SANS = "'Instrument Sans','Helvetica Neue',Helvetica,Arial,sans-serif"
MONO = "'IBM Plex Mono',Menlo,Consolas,monospace"

STYLE = {
    "p": f"margin:20px 0 0;font:17px/1.65 {SANS};color:{C['body']};",
    "h2": f"margin:48px 0 0;font:700 24px/1.25 {SANS};letter-spacing:-0.01em;color:{C['bone']};",
    "h3": f"margin:32px 0 0;font:700 18px/1.35 {SANS};color:{C['bone']};",
    "ul": "margin:20px 0 0;padding-left:22px;",
    "ol": "margin:20px 0 0;padding-left:22px;",
    "li": f"margin:10px 0 0;font:17px/1.6 {SANS};color:{C['body']};",
    "a": f"color:{C['signal']};text-decoration:underline;",
    "strong": f"color:{C['bone']};font-weight:600;",
    "blockquote": f"margin:24px 0 0;padding:0 0 0 20px;border-left:1px solid {C['hairhi']};"
                  f"font:17px/1.6 {SANS};color:{C['bone']};",
    "cite": f"display:block;margin-top:8px;font:11px/1.4 {MONO};letter-spacing:0.1em;"
            f"text-transform:uppercase;font-style:normal;color:{C['quiet']};",
    "table": f"width:100%;border-collapse:collapse;margin:0;",
    "th": f"padding:12px 14px;border-bottom:1px solid {C['hair']};background-color:{C['panel']};"
          f"text-align:left;vertical-align:top;font:500 11px/1.4 {MONO};letter-spacing:0.1em;"
          f"text-transform:uppercase;color:{C['quiet']};",
    "td": f"padding:12px 14px;border-bottom:1px solid {C['hair']};text-align:left;"
          f"vertical-align:top;font:15px/1.5 {SANS};color:{C['body']};",
}
CLASS_STYLE = {
    "article__answer": f"margin:32px 0 0;padding:22px 24px;border:1px solid {C['hair']};"
                       f"border-left:2px solid {C['forest']};background-color:{C['panel']};"
                       f"font:17px/1.6 {SANS};color:{C['bone']};",
    "article__table": f"margin:24px 0 0;border:1px solid {C['hair']};",
    "article__from": f"margin:24px 0 0;padding:4px 24px 22px;border:1px solid {C['hair']};",
    "article__disclosure": f"margin:40px 0 0;padding-top:20px;border-top:1px solid {C['hair']};"
                           f"font:14px/1.6 {SANS};color:{C['quiet']};",
}


def inline_styles(fragment):
    """Inline every style. Gmail drops <style> blocks and the background
    shorthand, so each element carries its own style and background-color."""
    soup = BeautifulSoup(fragment, "html.parser")
    in_sources = {id(li) for ol in soup.find_all("ol", class_="article__sources")
                  for li in ol.find_all("li")}
    for el in soup.find_all(True):
        st = STYLE.get(el.name, "")
        for c in el.get("class", []):
            st += CLASS_STYLE.get(c, "")
        if id(el) in in_sources:
            st += "font-size:15px;"
        for a in ("class", "data-wipe-link", "data-reveal", "rel"):
            if a in el.attrs:
                del el[a]
        if st:
            el["style"] = st
        if el.name == "a" and el.get("href", "").endswith(".html") and "://" not in el["href"]:
            el["href"] = f'{SITE}/{el["href"]}'
    return str(soup)


def fingerprint(post):
    """12-char hash of the post content. Shown in the review email and
    checked before publishing, so the words that go live are the words
    that were approved, even if the site chrome changed in between."""
    import hashlib
    clean = {k: v for k, v in post.items() if not k.startswith("_")}
    blob = json.dumps(clean, sort_keys=True, ensure_ascii=False).encode()
    return hashlib.sha256(blob).hexdigest()[:12]


def payload(post):
    raw = json.dumps(post, ensure_ascii=False, separators=(",", ":")).encode()
    return base64.b64encode(zlib.compress(raw, 9)).decode()


def render_email(post, review=None):
    """review: dict with optional keys version, notes (list of str)."""
    review = review or {}
    url = f'{SITE}/note-{post["slug"]}.html'
    words = len(BeautifulSoup(article_html(post), "html.parser").get_text(" ").split())
    notes = "".join(f'<li style="margin:6px 0 0;">{n}</li>' for n in review.get("notes", []))
    notes_block = (f'<p style="margin:14px 0 0;font:600 13px/1.5 {SANS};color:{C["bone"]};">'
                   f'Check before approving</p><ul style="margin:6px 0 0;padding-left:18px;'
                   f'font:13px/1.55 {SANS};color:{C["body"]};">{notes}</ul>') if notes else ""
    mark = (f'<table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-table;'
            f'vertical-align:middle;"><tr><td bgcolor="{C["bone"]}" style="width:22px;height:4px;background-color:{C["bone"]};'
            f'font-size:0;line-height:0;">&nbsp;</td></tr><tr><td style="height:4px;font-size:0;'
            f'line-height:0;">&nbsp;</td></tr><tr><td bgcolor="{C["signal"]}" style="width:13px;height:4px;'
            f'background-color:{C["signal"]};font-size:0;line-height:0;">&nbsp;</td></tr></table>')
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<title>{esc(post["title"])}</title>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
</head>
<body bgcolor="{C["cut"]}" style="margin:0;padding:0;background-color:{C["cut"]};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="{C["cut"]}" style="background-color:{C["cut"]};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;">

<tr><td bgcolor="{C["panel"]}" style="padding:18px 20px;border:1px dashed {C["hairhi"]};background-color:{C["panel"]};">
  <p style="margin:0;font:500 11px/1.4 {MONO};letter-spacing:0.14em;text-transform:uppercase;color:{C["label"]};">Review draft{(" · v" + str(review["version"])) if review.get("version") else ""} · not published</p>
  <p style="margin:10px 0 0;font:15px/1.55 {SANS};color:{C["body"]};">Reply <strong style="color:{C["bone"]};">approved</strong> to publish this exactly as shown. Reply <strong style="color:{C["bone"]};">changes:</strong> followed by what to fix, and a revised draft comes back in this thread.</p>
  <p style="margin:10px 0 0;font:12px/1.6 {MONO};color:{C["quiet"]};">URL {url}<br>Meta {esc(post["description"])}<br>Summary {esc(post["summary"])}<br>Pillar {esc(post.get("pillar", ""))}<br>{words} words · {len(post["sources"])} sources · {len(post["faq"])} FAQs<br>Draft {post["slug"]} · v{review.get("version", 1)} · fingerprint {fingerprint(post)}</p>
  {notes_block}
</td></tr>
<tr><td style="height:24px;font-size:0;line-height:0;">&nbsp;</td></tr>

<tr><td style="padding:18px 0;border-bottom:1px solid {C["hair"]};">
  {mark}<span style="vertical-align:middle;margin-left:10px;font:700 18px/1 {SANS};letter-spacing:-0.02em;color:{C["bone"]};">theunwired</span>
</td></tr>

<tr><td style="padding:56px 0 48px;border-bottom:1px solid {C["hair"]};">
  <p style="margin:0;font:500 13px/1 {MONO};letter-spacing:0.12em;text-transform:uppercase;color:{C["label"]};"><span style="display:inline-block;width:22px;height:1px;background-color:{C["signal"]};vertical-align:middle;margin-right:12px;"></span>Notes</p>
  <h1 style="margin:20px 0 0;font:700 40px/1.08 {SANS};letter-spacing:-0.035em;color:{C["bone"]};">{post["title"]}</h1>
  <p style="margin:24px 0 0;font:17px/1.6 {SANS};color:{C["body"]};">{post["lede"]}</p>
  <p style="margin:20px 0 0;font:11px/1.6 {MONO};letter-spacing:0.14em;text-transform:uppercase;color:{C["quiet"]};">{esc(byline(post))}</p>
</td></tr>

<tr><td style="padding:24px 0 56px;">
{inline_styles(article_html(post))}
</td></tr>

<tr><td bgcolor="{C["panel"]}" style="padding:32px 28px;border:1px solid {C["hair"]};background-color:{C["panel"]};">
  <p style="margin:0;font:700 26px/1.2 {SANS};letter-spacing:-0.02em;color:{C["bone"]};">{post["cta_heading"]}</p>
  <p style="margin:12px 0 0;font:16px/1.6 {SANS};color:{C["body"]};">{post["cta_text"]}</p>
  <p style="margin:22px 0 0;"><a href="{SITE}/#contact" style="display:inline-block;padding:14px 26px;background-color:{C["forest"]};color:{C["bone"]};font:500 14px/1 {MONO};text-decoration:none;">Start a conversation</a></p>
</td></tr>

<tr><td style="padding:28px 0;border-top:1px solid {C["hair"]};font:12px/1.6 {SANS};color:{C["quiet"]};">© {post["date"][:4]} The Unwired · AI automation, built and handed over</td></tr>
</table></td></tr></table>
</body></html>"""


def _clean_href(h):
    from urllib.parse import urlparse, parse_qs, unquote
    if h and "google.com/url" in h:
        q = parse_qs(urlparse(h).query).get("q")
        if q:
            h = unquote(q[0])
    if h and h.startswith(SITE + "/") and h.endswith(".html") and "#" not in h:
        h = h[len(SITE) + 1:]
    return h


def _clean(el):
    """Strip everything Gmail or the email renderer added: styles, classes,
    redirect links, the table wrapper div. Returns plain article HTML."""
    for t in el.find_all(True):
        href = t.get("href")
        t.attrs = {}
        if t.name == "a" and href:
            t["href"] = _clean_href(href)
    for d in el.find_all("div"):
        if d.find("table") and len(d.find_all(True, recursive=False)) == 1:
            d.unwrap()
    return el


def _inner(el):
    return "".join(str(c) for c in _clean(el).contents).strip()


def extract(email_html):
    """Rebuild the post JSON from a review email, as Gmail returns it.
    Prefers the embedded payload when it survived; otherwise parses the
    rendered email, so what gets published is exactly what was approved."""
    m = re.search(r"UNWIRED-POST-START\s+([A-Za-z0-9+/=\s]+?)\s+UNWIRED-POST-END", email_html)
    if m:
        data = base64.b64decode(re.sub(r"\s", "", m.group(1)))
        try:
            data = zlib.decompress(data)
        except zlib.error:
            pass
        return json.loads(data.decode())
    soup = BeautifulSoup(email_html, "html.parser")
    post = {}
    meta_p = next(p for p in soup.find_all("p") if p.get_text().startswith("URL "))
    lines = [l.strip() for l in meta_p.get_text("\n").split("\n") if l.strip()]
    for l in lines:
        for key, label in (("description", "Meta "), ("summary", "Summary "), ("pillar", "Pillar ")):
            if l.startswith(label):
                post[key] = l[len(label):].strip()
    post["slug"] = re.search(r"note-([a-z0-9-]+)\.html", meta_p.get_text()).group(1)
    h1 = soup.find("h1")
    post["title"] = h1.get_text().strip()
    lede = h1.find_next("p")
    post["lede"] = _inner(lede)
    by = lede.find_next("p").get_text()
    post["reviewer"] = re.search(r"Reviewed by (.+?) · Updated", by).group(1).strip()
    d = re.search(r"Updated (\d{1,2}) (\w{3}) (\d{4})", by)
    post["date"] = f"{d.group(3)}-{MONTHS.index(d.group(2)) + 1:02d}-{int(d.group(1)):02d}"
    first_h2 = soup.find("h2")
    body = first_h2.parent
    kids = [k for k in body.find_all(True, recursive=False)]
    post["answer"] = _inner(kids[0])
    sections, faq, sources, cur = [], [], [], None
    for k in kids[1:]:
        if k.name == "h2":
            cur = k.get_text().strip()
            if cur not in ("From our builds", "Questions people ask", "Sources"):
                sections.append({"heading": _inner(k), "html": ""})
            continue
        if cur == "From our builds":
            post["from_our_builds"] = _inner(k)
        elif cur == "Questions people ask":
            if k.name == "h3":
                faq.append({"q": _inner(k), "a": ""})
            elif k.name == "p" and faq:
                faq[-1]["a"] = _inner(k)
        elif cur == "Sources":
            if k.name == "ol":
                for li in k.find_all("li"):
                    a = li.find("a")
                    rest = li.get_text()[len(a.get_text()):].lstrip(", ").strip()
                    sources.append({"title": a.get_text().strip(),
                                    "url": _clean_href(a.get("href")), "publisher": rest})
        elif sections:
            if k.name == "div" and k.find("table") and len(k.find_all(True, recursive=False)) == 1:
                k = k.find("table")
            sections[-1]["html"] += str(_clean(k))
    post["sections"], post["faq"], post["sources"] = sections, faq, sources
    cta_td = body.find_parent("tr").find_next_sibling("tr").find("td")
    ps = cta_td.find_all("p")
    post["cta_heading"] = _inner(ps[0])
    post["cta_text"] = _inner(ps[1])
    return post


# ------------------------------------------------------------------ publish
def publish(post):
    errs, _ = lint(post)
    errs = [e for e in errs if "already exists" not in e or not post.get("update")]
    if errs:
        raise SystemExit("lint failed:\n  " + "\n  ".join(errs))
    page = ROOT / f'note-{post["slug"]}.html'
    is_new = not page.exists()
    page.write_text(render_page(post))
    if is_new:
        work = (ROOT / "work.html").read_text()
        i = work.index('id="notes"')
        j = work.index('<div class="stack" data-reveal data-sweep>', i)
        j += len('<div class="stack" data-reveal data-sweep>')
        row = (f'\n        <div class="note-row">\n'
               f'          <span class="note-row__tag note-row__tag--live">{month_tag(post["date"])}</span>\n'
               f'          <a data-wipe-link href="note-{post["slug"]}.html">\n'
               f'            <h3>{post["title"]}</h3>\n'
               f'            <p>{post["summary"]}</p>\n'
               f'          </a>\n        </div>')
        (ROOT / "work.html").write_text(work[:j] + row + work[j:])
        sm = (ROOT / "sitemap.xml").read_text()
        entry = (f'  <url>\n    <loc>{SITE}/note-{post["slug"]}.html</loc>\n'
                 f'    <lastmod>{post["date"]}</lastmod>\n    <priority>0.5</priority>\n  </url>\n')
        (ROOT / "sitemap.xml").write_text(sm.replace("</urlset>", entry + "</urlset>"))
        log = ROOT / "blog/published.json"
        items = json.loads(log.read_text()) if log.exists() else []
        items.append({"slug": post["slug"], "title": post["title"], "date": post["date"],
                      "pillar": post.get("pillar", "")})
        log.write_text(json.dumps(items, indent=2) + "\n")
    keep = {k: v for k, v in post.items() if not k.startswith("_")}
    (ROOT / f'blog/posts/{post["slug"]}.json').write_text(json.dumps(keep, indent=2, ensure_ascii=False) + "\n")
    print(f"published note-{post['slug']}.html ({'new' if is_new else 'updated'})")


# --------------------------------------------------------------------- main
def main():
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    cmd, src = sys.argv[1], sys.argv[2]
    out = sys.argv[3] if len(sys.argv) > 3 else None
    if cmd == "extract":
        res = json.dumps(extract(Path(src).read_text()), indent=2, ensure_ascii=False)
    else:
        post = json.loads(straighten(Path(src).read_text()))
        if cmd == "lint":
            errs, warns = lint(post)
            for w in warns:
                print("warn:", w)
            for e in errs:
                print("ERROR:", e)
            print("OK" if not errs else f"{len(errs)} error(s)")
            sys.exit(1 if errs else 0)
        elif cmd == "fingerprint":
            print(fingerprint(post))
            return
        elif cmd == "page":
            res = render_page(post)
        elif cmd == "email":
            review = post.pop("_review", None)
            res = render_email(post, review)
        elif cmd == "publish":
            return publish(post)
        else:
            raise SystemExit(__doc__)
    if out:
        Path(out).write_text(res)
    else:
        print(res)


if __name__ == "__main__":
    main()
