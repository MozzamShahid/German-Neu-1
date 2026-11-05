"""
Parse the Netzwerk neu A1 glossary PDF (German -> English) into a structured
vocabulary file the quiz app uses.

What it does
------------
1. Reads every span of text with its position + font flags (PyMuPDF).
2. Rebuilds the 3-column table (section label | German | English) and removes
   the fake spaces the PDF inserts after stressed vowels ("Ki ndergarten").
3. Splits each entry into headword / German example / meaning / English example.
4. Classifies entries (noun / verb / other), pulls out article + plural for
   nouns and the conjugated forms for verbs.
5. Uses the PDF's own bold marking as the "important word" signal
   (Netzwerk prints the words you must actively learn in bold).
6. Builds learning helpers:
     * word families  (das Kind -> der Kindergarten, fragen -> die Frage ...)
     * compound rule  (der Kindergarten takes the article of der Garten)
     * suffix rules   (-ung -> die, -chen -> das ...), only when they hold
7. Writes src/data/vocab.json

Usage:  python scripts/parse_glossary.py [path/to/glossary.pdf]
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from dataclasses import dataclass, field, asdict
from pathlib import Path

# pymupdf is imported lazily in extract_rows() so other scripts can reuse the helpers

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_PDF = ROOT / "NWn_A1_Glossar_Deutsch-Englisch.pdf"
OUT = ROOT / "src" / "data" / "vocab.json"

# Column boundaries (PDF points)
LABEL_MAX_X = 110
GERMAN_MAX_X = 318
TOP_Y, BOTTOM_Y = 72, 780

LABEL_RE = re.compile(r"^\d{1,2}[a-z]?(\s*ÜB)?$")
CHAPTER_RE = re.compile(r"^Kapitel\s+(\d+):\s*(.+)$")


# --------------------------------------------------------------------------
# 1. Low level: spans -> rows
# --------------------------------------------------------------------------
@dataclass
class Seg:
    text: str
    bold: bool
    italic: bool


@dataclass
class Span:
    x0: float
    x1: float
    y: float
    text: str
    bold: bool
    italic: bool
    size: float


def page_spans(page) -> list[Span]:
    out = []
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            y = line["bbox"][1]
            if y < TOP_Y or y > BOTTOM_Y:
                continue
            for s in line["spans"]:
                if s["size"] < 6:  # footer / copyright (stressed "i" is ~7-8pt!)
                    continue
                out.append(
                    Span(
                        x0=s["bbox"][0],
                        x1=s["bbox"][2],
                        y=y,
                        text=s["text"],
                        bold=bool(s["flags"] & 16),
                        italic=bool(s["flags"] & 2),
                        size=s["size"],
                    )
                )
    return out


def cluster_lines(spans: list[Span]) -> list[list[Span]]:
    """Group spans of one column into visual lines (same y)."""
    spans = sorted(spans, key=lambda s: (s.y, s.x0))
    lines: list[list[Span]] = []
    for s in spans:
        if lines and abs(lines[-1][0].y - s.y) < 3:
            lines[-1].append(s)
        else:
            lines.append([s])
    for ln in lines:
        ln.sort(key=lambda s: s.x0)
    return lines


def line_to_segs(line: list[Span]) -> list[Seg]:
    """Join spans; drop the bogus space drawn on top of a stressed vowel."""
    segs: list[Seg] = []
    prev: Span | None = None
    for s in line:
        text = s.text
        if prev is not None and text.startswith(" ") and s.x0 < prev.x1 - 0.8:
            # overlapping space = stress mark artefact
            text = text[1:]
        if text:
            segs.append(Seg(text, s.bold, s.italic))
        prev = s
    return segs


@dataclass
class Row:
    chapter: int
    chapter_title: str
    section: str
    topic: str
    page: int
    de: list[Seg] = field(default_factory=list)
    en: list[Seg] = field(default_factory=list)


def extract_rows(pdf_path: Path) -> list[Row]:
    import pymupdf

    doc = pymupdf.open(pdf_path)
    rows: list[Row] = []
    chapter, chapter_title, section, topic = 0, "", "", ""

    for pno, page in enumerate(doc):
        spans = page_spans(page)
        label = [s for s in spans if s.x0 < LABEL_MAX_X]
        german = [s for s in spans if LABEL_MAX_X <= s.x0 < GERMAN_MAX_X]
        english = [s for s in spans if s.x0 >= GERMAN_MAX_X]

        # Row starts = every line in label column (blank or "1a"),
        # chapter titles and lesson headings (processed in y order)
        starts: list[tuple[float, str, str]] = []
        for ln in cluster_lines(label):
            txt = "".join(s.text for s in ln).strip()
            y = ln[0].y
            if txt.startswith("Übersetzt"):
                continue
            if CHAPTER_RE.match(txt):
                starts.append((y, "chapter", txt))
            elif txt == "" or LABEL_RE.match(txt):
                starts.append((y, "row", txt))
            else:  # lesson heading, e.g. "Hallo! Tschüs!"
                starts.append((y, "topic", txt))
        starts.sort(key=lambda t: t[0])
        de_lines = cluster_lines(german)
        en_lines = cluster_lines(english)

        for i, (y, kind, txt) in enumerate(starts):
            y_end = starts[i + 1][0] if i + 1 < len(starts) else 10_000
            if kind == "chapter":
                m = CHAPTER_RE.match(txt)
                chapter, chapter_title = int(m.group(1)), m.group(2).strip()
                section, topic = "", chapter_title
                continue
            if kind == "topic":
                topic = txt
                continue
            if txt:
                section = txt.replace(" ", " ")
            row = Row(chapter, chapter_title, section, topic, pno + 1)
            for ln in de_lines:
                if y - 2.5 <= ln[0].y < y_end - 2.5:
                    if row.de:
                        row.de.append(Seg(" ", False, row.de[-1].italic))
                    row.de.extend(line_to_segs(ln))
            for ln in en_lines:
                if y - 2.5 <= ln[0].y < y_end - 2.5:
                    if row.en:
                        row.en.append(Seg(" ", False, row.en[-1].italic))
                    row.en.extend(line_to_segs(ln))
            if row.de or row.en:
                rows.append(row)
    return rows




# --------------------------------------------------------------------------
# 2. Entry level parsing
# --------------------------------------------------------------------------
def clean(s: str) -> str:
    s = unicodedata.normalize("NFC", s)
    s = s.replace(" ", " ").replace("´", "'")
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def split_main_example(segs: list[Seg]) -> tuple[str, str, bool]:
    """Non-italic text = headword/meaning, italic text = example.
    Returns (main, example, any_bold_in_main)."""
    main, ex, bold = [], [], False
    for s in segs:
        if s.italic:
            ex.append(s.text)
        else:
            main.append(s.text)
            if s.bold and s.text.strip():
                bold = True
    return clean("".join(main)), clean("".join(ex)), bold


ARTICLES = ("der", "die", "das")
GRAMMAR_NOTE_RE = re.compile(r"\s*\((\+ ?[DA]\.|Sg\.(?: ohne Artikel)?|Pl\.|sich)\)")
VERB_FORMS_RE = re.compile(
    r"^(?P<inf>[^,]+),\s*(?P<p3>(er|es|sie|man)\s[^,]+),\s*(?P<perf>(hat|ist|hat/ist)\s.+)$"
)
NOUN_RE = re.compile(
    r"^(?P<art>der/die|die/der|der|die|das)\s+(?P<lemma>[A-ZÄÖÜ][\wäöüßÄÖÜ\-/.]*(?:\s[A-ZÄÖÜ][\wäöüß\-]*)?)"
    r"(?:,\s*(?P<pl>[^()]*?))?\s*(?P<note>\((?:Sg\.|Pl\.)\))?$"
)


def umlaut(stem: str) -> str:
    """Put an umlaut on the last a/o/u (au -> äu) of the stem."""
    m = re.search(r"(au|a|o|u)(?=[^aeiouäöü]*$)", stem, flags=re.I) or re.search(
        r"(au|a|o|u)", stem[::-1], flags=re.I
    )
    idx = None
    for i in range(len(stem) - 1, -1, -1):
        if stem[i].lower() in "aou":
            idx = i
            break
    if idx is None:
        return stem
    if stem[idx].lower() == "u" and idx > 0 and stem[idx - 1].lower() == "a":
        idx -= 1  # au -> äu
    table = {"a": "ä", "o": "ö", "u": "ü", "A": "Ä", "O": "Ö", "U": "Ü"}
    return stem[:idx] + table[stem[idx]] + stem[idx + 1 :]


def make_plural(lemma: str, pl: str | None) -> str | None:
    if not pl:
        return None
    pl = pl.strip().replace("“", '"').replace("”", '"').replace("„", '"')
    if pl in ("-", ""):
        return lemma if pl == "-" else None
    if pl.startswith('"-'):
        return umlaut(lemma) + pl[2:]
    if pl.startswith("-"):
        return lemma + pl[1:]
    return pl


def strip_stress_pipes(s: str) -> str:
    return s.replace("|", "")


@dataclass
class Entry:
    id: int
    chapter: int
    section: str
    topic: str
    page: int
    german: str  # full headword as printed (with article / forms)
    lemma: str  # bare word, used for display + matching
    pos: str  # noun | verb | other
    important: bool
    meaning: str
    example_de: str = ""
    example_en: str = ""
    article: str | None = None  # der | die | das | der/die
    plural_suffix: str | None = None
    plural: str | None = None
    number: str | None = None  # Sg / Pl only-forms
    forms: str | None = None  # verb: "er heißt, hat geheißen"
    separable: bool = False
    note: str | None = None  # (+ D.) etc.
    article_rule: str | None = None
    compound_head: int | None = None
    family: list[int] = field(default_factory=list)
    ur: str = ""  # Urdu meaning (lecture vocabulary, Kapitel 13)


def parse_row(row: Row, idx: int) -> Entry | None:
    de_main, de_ex, bold = split_main_example(row.de)
    en_main, en_ex, _ = split_main_example(row.en)
    if not de_main or not re.search(r"[A-Za-z]", "".join(x.text for x in row.en)):
        return None

    # "here:" is italic in the PDF -> it lands in en_ex; keep meaning clean
    if en_ex.lower().startswith("here"):
        en_ex = re.sub(r"^here\s*:?\s*", "", en_ex, flags=re.I)
    # Some meanings carry their example in parentheses in non-italic text too
    meaning = re.sub(r"^[:;,\s]+", "", en_main).strip(" ,;")
    if not meaning and en_ex:
        meaning, en_ex = en_ex, ""

    de_main = de_main.rstrip("( ")
    note = None
    mnote = GRAMMAR_NOTE_RE.search(de_main)
    if mnote:
        note = mnote.group(1)
    head = clean(GRAMMAR_NOTE_RE.sub(" ", de_main))

    e = Entry(
        id=idx,
        chapter=row.chapter,
        section=row.section,
        topic=row.topic,
        page=row.page,
        german=clean(de_main.replace("|", "")),
        lemma=strip_stress_pipes(head),
        pos="other",
        important=bold,
        meaning=meaning,
        example_de=de_ex.strip("() "),
        example_en=en_ex.strip("() "),
        note=note,
    )

    # ----- noun?
    mn = NOUN_RE.match(head.replace("“", '"').replace("”", '"'))
    if mn and not head.endswith(")"):
        art = mn.group("art").replace("die/der", "der/die")
        lemma = strip_stress_pipes(mn.group("lemma")).rstrip(",")
        pl_raw = (mn.group("pl") or "").strip() or None
        e.pos = "noun"
        e.article = art
        e.lemma = lemma
        e.plural_suffix = pl_raw
        e.plural = make_plural(lemma, pl_raw)
        if note in ("Sg.", "Pl."):
            e.number = note[:-1]
        return e

    if note == "sich":
        head = head.strip()
        e.lemma = "sich " + head
        e.note = None
    # ----- verb?
    mv = VERB_FORMS_RE.match(head)
    is_to = meaning.lower().startswith("to ")
    if mv or (is_to and re.search(r"(e?n|ern|eln)$", head.split(",")[0].strip())):
        inf = mv.group("inf") if mv else head.split(",")[0]
        e.pos = "verb"
        e.separable = "|" in inf
        e.lemma = ("sich " if note == "sich" else "") + strip_stress_pipes(inf).strip()
        if mv:
            e.forms = f"{mv.group('p3').strip()}, {mv.group('perf').strip()}"
        return e

    e.lemma = e.lemma.strip(" ,")
    return e


# --------------------------------------------------------------------------
# 3. Learning helpers
# --------------------------------------------------------------------------
SUFFIX_RULES: list[tuple[str, str, str]] = [
    # (suffix, article, explanation)
    ("chen", "das", "Nouns ending in -chen are always das (diminutive)."),
    ("lein", "das", "Nouns ending in -lein are always das (diminutive)."),
    ("ment", "das", "Nouns ending in -ment are usually das."),
    ("um", "das", "Nouns ending in -um are usually das (das Museum, das Zentrum)."),
    ("ung", "die", "Nouns ending in -ung are always die."),
    ("heit", "die", "Nouns ending in -heit are always die."),
    ("keit", "die", "Nouns ending in -keit are always die."),
    ("schaft", "die", "Nouns ending in -schaft are always die."),
    ("tion", "die", "Nouns ending in -tion are always die."),
    ("sion", "die", "Nouns ending in -sion are always die."),
    ("tät", "die", "Nouns ending in -tät are always die."),
    ("ik", "die", "Nouns ending in -ik are usually die (die Musik, die Grammatik)."),
    ("ei", "die", "Nouns ending in -ei are usually die (die Bäckerei)."),
    ("ie", "die", "Nouns ending in -ie are usually die (die Familie)."),
    ("ur", "die", "Nouns ending in -ur are usually die (die Natur)."),
    ("erin", "die", "Female persons ending in -in are die (die Lehrerin)."),
    ("in", "die", "Female persons ending in -in are die."),
    ("e", "die", "Most nouns ending in -e are die (about 90%)."),
    ("ling", "der", "Nouns ending in -ling are der."),
    ("ismus", "der", "Nouns ending in -ismus are der."),
    ("or", "der", "Nouns ending in -or are usually der (der Motor, der Doktor)."),
    ("ist", "der", "Persons ending in -ist are der (der Tourist)."),
    ("ent", "der", "Persons ending in -ent are der (der Student)."),
    ("ant", "der", "Nouns ending in -ant are usually der."),
    ("er", "der", "Persons/tools ending in -er are usually der (der Lehrer, der Computer)."),
]

WEEKDAYS = {"Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag", "Sonnabend"}
MONTHS = {"Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August",
          "September", "Oktober", "November", "Dezember"}
SEASONS = {"Frühling", "Sommer", "Herbst", "Winter"}


def article_rule(e: Entry) -> str | None:
    lemma = e.lemma
    if lemma in WEEKDAYS:
        return "Days of the week are always der."
    if lemma in MONTHS:
        return "Months are always der."
    if lemma in SEASONS:
        return "Seasons are always der."
    low = lemma.lower()
    for suf, art, why in SUFFIX_RULES:
        if low.endswith(suf) and len(low) > len(suf) + 1:
            if suf == "in" and "(f)" not in e.meaning:
                continue
            if art == e.article:
                return why
            return None  # first matching rule contradicts -> don't mislead
    return None


def verb_stem(inf: str) -> str:
    inf = inf.replace("|", "").split(" ")[-1].lower()
    for suf in ("ern", "eln", "en", "n"):
        if inf.endswith(suf):
            return inf[: -len(suf)] if suf in ("en", "n") else inf[:-1]
    return inf


def build_helpers(entries: list[Entry]) -> None:
    nouns = [e for e in entries if e.pos == "noun" and e.article in ARTICLES]
    # unique nouns by lemma (first occurrence)
    by_lemma: dict[str, Entry] = {}
    for n in nouns:
        by_lemma.setdefault(n.lemma.lower(), n)
    lemmas = sorted(by_lemma.keys(), key=len, reverse=True)

    fam: dict[int, set[int]] = {e.id: set() for e in entries}

    def link(a: Entry, b: Entry):
        if a.lemma.lower() == b.lemma.lower():
            return
        fam[a.id].add(b.id)
        fam[b.id].add(a.id)

    # compound nouns: head = longest other noun that the word ends with
    for n in nouns:
        low = n.lemma.lower().replace("-", "")
        for cand in lemmas:
            if cand == low or len(cand) < 3:
                continue
            c = cand.replace("-", "")
            if low.endswith(c) and len(low) - len(c) >= 2:
                head = by_lemma[cand]
                # a real compound always shares the article of its last part;
                # if not (die Antwort vs das Wort) it's a false match
                if head.article == n.article:
                    n.compound_head = head.id
                    link(n, head)
                break
        # modifier: noun starts with another noun (Kind -> Kindergarten)
        for cand in lemmas:
            c = cand.replace("-", "")
            if len(c) >= 4 and c != low and low.startswith(c):
                link(n, by_lemma[cand])
                break

    # verb <-> noun: fragen -> die Frage, wohnen -> die Wohnung, spielen -> das Spiel
    verbs = [e for e in entries if e.pos == "verb"]
    for v in verbs:
        stem = verb_stem(v.lemma)
        if len(stem) < 4:
            continue
        for cand in lemmas:
            c = cand.replace("-", "")
            if c.startswith(stem) and len(c) - len(stem) <= 4:
                link(v, by_lemma[cand])
        # verb families: hören / zu|hören / mit|hören
        for v2 in verbs:
            if v2.id != v.id and verb_stem(v2.lemma) == stem and v2.lemma != v.lemma:
                fam[v.id].add(v2.id)

    for e in entries:
        if e.pos == "noun" and e.article in ARTICLES:
            e.article_rule = article_rule(e)
        e.family = sorted(fam[e.id])[:8]


# --------------------------------------------------------------------------
def main() -> None:
    pdf = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PDF
    rows = extract_rows(pdf)
    entries: list[Entry] = []
    for r in rows:
        e = parse_row(r, len(entries))
        if e and e.meaning and e.chapter > 0:
            entries.append(e)
    build_helpers(entries)

    chapters: dict[int, dict] = {}
    for r in rows:
        if r.chapter:
            chapters.setdefault(r.chapter, {"id": r.chapter, "title": r.chapter_title})
    for c in chapters.values():
        es = [e for e in entries if e.chapter == c["id"]]
        c["count"] = len(es)
        c["nouns"] = sum(1 for e in es if e.pos == "noun" and e.article in ARTICLES)
        c["verbs"] = sum(1 for e in es if e.pos == "verb")
        c["important"] = sum(1 for e in es if e.important)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    data = {
        "source": "Netzwerk neu A1 – Glossar Deutsch–Englisch",
        "chapters": sorted(chapters.values(), key=lambda c: c["id"]),
        "entries": [asdict(e) for e in entries],
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"Wrote {len(entries)} entries -> {OUT}")
    for c in data["chapters"]:
        print(
            f"  Kapitel {c['id']:>2}: {c['count']:>4} words "
            f"({c['nouns']} nouns, {c['verbs']} verbs, {c['important']} important)  {c['title']}"
        )


if __name__ == "__main__":
    main()
