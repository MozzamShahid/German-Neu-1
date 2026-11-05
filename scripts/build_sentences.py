"""
Sentence + grammar-question generator (German / English / Urdu).

Built from the lecture notes (Week 2 – Week 13). A small grammar engine
(declension, conjugation, word order) turns a lexicon of everyday words into
correct daily-life sentences and quiz items:

  fill   – sentence with a blank + options (articles, verb forms, prefixes …)
  order  – put the chunks in the right order (verb position!)
  pick   – choose the one correct sentence

Topics: zahlen, uhrzeit, konjugation, pronomen, wortstellung, artikel,
modalverben, trennbar, vergangenheit, wortbildung, redemittel,
and the optional ones: akkusativ, dativ, wechsel.

Usage: python scripts/build_sentences.py   ->  src/data/grammar.json
"""

from __future__ import annotations

import json
import random
from pathlib import Path

from grammar_data import MAIN_SUBJECTS, N, PERSON_INDEX, PRONOUN_SUBJECTS, SUBJECTS, V

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "data" / "grammar.json"
rng = random.Random(42)

# =========================================================================
# German engine
# =========================================================================
DEF = {
    "nom": {"m": "der", "f": "die", "n": "das", "pl": "die"},
    "akk": {"m": "den", "f": "die", "n": "das", "pl": "die"},
    "dat": {"m": "dem", "f": "der", "n": "dem", "pl": "den"},
}
EIN_END = {
    "nom": {"m": "", "f": "e", "n": "", "pl": "e"},
    "akk": {"m": "en", "f": "e", "n": "", "pl": "e"},
    "dat": {"m": "em", "f": "er", "n": "em", "pl": "en"},
}
CASE_NAME = {"nom": "Nominativ", "akk": "Akkusativ", "dat": "Dativ"}
GENDER_NAME = {"m": "masculine", "f": "feminine", "n": "neuter", "pl": "plural"}
ART_OF = {"m": "der", "f": "die", "n": "das", "pl": "die (Pl.)"}


def article(det: str, case: str, g: str, pde: str | None = None) -> str:
    if det == "def":
        return DEF[case][g]
    end = EIN_END[case][g]
    if det == "indef":
        return "" if g == "pl" else "ein" + end
    if det == "kein":
        return "kein" + end
    if det == "poss":
        stem = pde or "mein"
        if stem == "euer" and end:
            stem = "eur"
        return stem + end
    return ""


def noun_form(n: dict, case: str, plural: bool) -> str:
    if not plural and n["g"] != "pl":
        return n["lemma"]
    f = n["pl"]
    if case == "dat" and not f.endswith(("n", "s")):
        f += "n"  # Dativ plural: den Kindern
    return f


def present(inf: str, person: str) -> str:
    v = V[inf]
    i = PERSON_INDEX[person]
    if v["table"]:
        return v["table"][i]
    base = inf[len(v["sep"]):] if v["sep"] else inf
    if base.endswith(("eln", "ern")):
        stem, plural_end = base[:-1], "n"
    else:
        stem, plural_end = base[:-2], "en"
    if i in (1, 2) and v["s23"]:
        stem2 = v["s23"]
        if i == 1:
            return stem2 + ("t" if stem2.endswith(("s", "ß", "z", "x")) else "st")
        return stem2 if stem2.endswith("t") else stem2 + "t"
    needs_e = stem.endswith(("t", "d")) or (stem.endswith(("m", "n")) and stem[-2:-1] not in "aeiouhlmnrä")
    if i == 0:
        return stem + "e"
    if i == 1:
        if stem.endswith(("s", "ß", "z", "x")):
            return stem + "t"
        return stem + ("est" if needs_e else "st")
    if i in (2, 4):
        return stem + ("et" if needs_e else "t")
    return stem + plural_end


def cap(s: str) -> str:
    return s[:1].upper() + s[1:]


# =========================================================================
# English helpers
# =========================================================================
def en_present(inf: str, s: dict) -> str:
    v = V[inf]
    return v["en3"] if s["s3"] else v["en"]


def en_do(s: dict) -> str:
    return "does" if s["s3"] else "do"


def a_an(word: str) -> str:
    return "an" if word[:1].lower() in "aeiou" else "a"


def en_np(n: dict, det: str, plural=False, pen: str | None = None) -> str:
    w = n["en_pl"] if plural or n["g"] == "pl" else n["en"]
    if det == "def":
        return f"the {w}"
    if det == "indef":
        return w if plural else f"{a_an(w)} {w}"
    if det == "kein":
        return f"no {w}"
    if det == "poss":
        return f"{pen or 'my'} {w}"
    return w


# =========================================================================
# Urdu helpers
# =========================================================================
def ur_poss(stem: str, ur_g: str, oblique: bool, plural=False) -> str:
    """میر + ا/ی/ے -> میرا / میری / میرے"""
    if ur_g == "f":
        end = "ی"
    elif oblique or plural:
        end = "ے"
    else:
        end = "ا"
    return stem + end


def ur_np(n: dict, det: str, oblique=False, plural=False, possessor: str | None = None,
          subj_key: str | None = None, demonstrative=False) -> str:
    plural = plural or n["g"] == "pl"
    if plural:
        word = n["ur_pl_obl"] if oblique else n["ur_pl"]
    else:
        word = n["ur_obl"] if oblique else n["ur"]
    if det == "indef" and not plural:
        return "ایک " + word
    if det == "poss" and possessor:
        stem = "اپن" if possessor == subj_key else SUBJECTS[possessor]["pur"]
        return ur_poss(stem, n["ur_g"], oblique, plural) + " " + word
    if det == "def" and demonstrative:
        return ("ان " if plural else "اس ") + word
    if det == "kein":
        return "کوئی " + word
    return word


def aux_of(s: dict) -> str:
    """ہوں / ہو / ہے / ہیں from the habitual ending."""
    return s["T"].split()[1]


def agr(s: dict) -> str:
    """adjective/participle agreement: ا / ی / ے"""
    if s["f"]:
        return "ی"
    return "ا" if s["T"].startswith("تا") else "ے"


def hua(s: dict) -> str:
    return {"ا": "ہوا", "ی": "ہوئی", "ے": "ہوئے"}[agr(s)]


def neg_hab(s: dict) -> str:
    """negative habitual without auxiliary: نہیں خریدتا"""
    return s["T"].split()[0]


# =========================================================================
# item helpers
# =========================================================================
ITEMS: list[dict] = []
_seen: set[str] = set()


def options(answer: str, cands: list[str], n=4) -> list[str]:
    out = [answer]
    for c in cands:
        if c and c not in out:
            out.append(c)
        if len(out) >= n:
            break
    return out


def add(topic: str, de: str, en: str, ur: str, *, fill=None, order=None, pick=None,
        rule: str = "", level: int = 1, key: str | None = None):
    k = key or de + (fill["text"] if fill else "")
    if k in _seen:
        return
    _seen.add(k)
    en = cap(en) if en.split(" ")[0] in ("i", "you", "he", "she", "we", "they", "the", "this", "these", "my", "it", "where") else en
    item = dict(id=len(ITEMS), topic=topic, de=de, en=en, ur=ur, rule=rule, level=level)
    if fill:
        assert fill["answer"] in fill["options"], fill
        assert len(set(fill["options"])) == len(fill["options"]), fill
        item["fill"] = fill
    if order:
        chunks, fixed = order
        punct = de[-1] if de[-1] in ".?!" else ""
        body = de[:-1] if punct else de
        assert " ".join(chunks) == body, (chunks, de)
        item["order"] = dict(chunks=chunks, fixed=fixed, punct=punct)
    if pick:
        assert pick[0] == de and len(set(pick)) == len(pick), pick
        item["pick"] = pick
    ITEMS.append(item)


def fill(text, answer, opts, why_en, why_ur, cue=""):
    return dict(text=text, answer=answer, options=opts, why_en=why_en, why_ur=why_ur, cue=cue)


def sample(lst, k):
    lst = list(lst)
    rng.shuffle(lst)
    return lst[:k]


# =========================================================================
# 1. Konjugation (Präsens, sein, haben)
# =========================================================================
# (verb, de complement, en complement, ur complement, W-word, ur W-word, en W-word)
ACTS = [
    ("wohnen", "in Lahore", "in Lahore", "لاہور میں", "Wo", "کہاں", "Where"),
    ("kommen", "aus Pakistan", "from Pakistan", "پاکستان سے", "Woher", "کہاں سے", "Where … from"),
    ("sprechen", "Urdu und Englisch", "Urdu and English", "اردو اور انگریزی", "Welche Sprachen", "کون سی زبانیں", "Which languages"),
    ("lernen", "Deutsch", "German", "جرمن", "Was", "کیا", "What"),
    ("arbeiten", "von Montag bis Freitag", "from Monday to Friday", "پیر سے جمعہ تک", "Wann", "کب", "When"),
    ("spielen", "Cricket", "cricket", "کرکٹ", "Was", "کیا", "What"),
    ("trinken", "Tee", "tea", "چائے", "Was", "کیا", "What"),
    ("fahren", "nach Islamabad", "to Islamabad", "اسلام آباد", "Wohin", "کہاں", "Where"),
    ("schlafen", "acht Stunden", "eight hours", "آٹھ گھنٹے", "Wie lange", "کتنی دیر", "How long"),
    ("lesen", "die Zeitung", "the newspaper", "اخبار", "Was", "کیا", "What"),
    ("essen", "Reis", "rice", "چاول", "Was", "کیا", "What"),
    ("hören", "Musik", "music", "موسیقی", "Was", "کیا", "What"),
]

ENDINGS = {"1s": "-e", "2s": "-st", "3s": "-t", "1p": "-en", "2p": "-t", "3p": "-en"}
UR_ENDINGS = {"1s": "ich کے ساتھ ‎-e", "2s": "du کے ساتھ ‎-st", "3s": "er/sie/es کے ساتھ ‎-t",
              "1p": "wir کے ساتھ ‎-en", "2p": "ihr کے ساتھ ‎-t", "3p": "sie/Sie کے ساتھ ‎-en"}


def other_forms(inf, p):
    forms = [present(inf, q) for q in ["1s", "2s", "3s", "1p", "2p", "3p"] if q != p]
    rng.shuffle(forms)
    return forms


def gen_konjugation():
    for verb_, c_de, c_en, c_ur, *_ in ACTS:
        v = V[verb_]
        for sk in PRONOUN_SUBJECTS + ["Ali", "Sara"]:
            s = SUBJECTS[sk]
            form = present(verb_, s["p"])
            de = cap(f"{s['de']} {form} {c_de}.")
            en = f"{s['en']} {en_present(verb_, s)} {c_en}"
            ur = f"{s['ur']} {c_ur} {v['ur']}{s['T']}۔"
            stem_note = ""
            if v["s23"] and s["p"] in ("2s", "3s"):
                stem_note = f" ({verb_} changes its vowel: du {present(verb_, '2s')}, er {present(verb_, '3s')})"
            add("konjugation", de, en, ur,
                fill=fill(cap(f"{s['de']} ___ {c_de}."), form, options(form, other_forms(verb_, s["p"])),
                          f"{s['de']} → ending {ENDINGS[s['p']]}: {verb_} → {form}{stem_note}",
                          f"{UR_ENDINGS[s['p']]} آتا ہے: {verb_} ← {form}"),
                pick=options(de, [cap(f"{s['de']} {f} {c_de}.") for f in other_forms(verb_, s["p"])][:3]),
                rule="konjugation")

    # sein & haben
    sein_c = [("müde", "tired", lambda s: f"{s['ur']} تھک{agr(s)} {hua(s)} {aux_of(s)}۔"),
              ("aus Pakistan", "from Pakistan", lambda s: f"{s['ur']} پاکستان سے {aux_of(s)}۔"),
              ("zu Hause", "at home", lambda s: f"{s['ur']} گھر پر {aux_of(s)}۔")]
    for c_de, c_en, ur_f in sein_c:
        for sk in PRONOUN_SUBJECTS + ["Ali", "Sara"]:
            s = SUBJECTS[sk]
            form = present("sein", s["p"])
            de = cap(f"{s['de']} {form} {c_de}.")
            add("konjugation", de, f"{s['en']} {s['be']} {c_en}", ur_f(s),
                fill=fill(cap(f"{s['de']} ___ {c_de}."), form, options(form, other_forms("sein", s["p"])),
                          "sein is irregular: ich bin, du bist, er/sie/es ist, wir sind, ihr seid, sie/Sie sind",
                          "sein بے قاعدہ ہے: ich bin، du bist، er ist، wir sind، ihr seid، sie sind"),
                rule="sein-haben")
    haben_c = [("Zeit", "time", lambda s: f"{s['paas']} وقت {aux_of(SUBJECTS['er'])}۔"),
               ("Hunger", "hungry", lambda s: f"{s['ko']} بھوک لگی ہے۔"),
               ("zwei Kinder", "two children", lambda s: f"{ur_poss(s['pur'], 'm', True)} دو بچے ہیں۔")]
    for c_de, c_en, ur_f in haben_c:
        for sk in PRONOUN_SUBJECTS + ["Ali", "Sara"]:
            s = SUBJECTS[sk]
            form = present("haben", s["p"])
            de = cap(f"{s['de']} {form} {c_de}.")
            en = f"{s['en']} {s['be']} hungry" if c_de == "Hunger" else f"{s['en']} {s['have']} {c_en}"
            add("konjugation", de, en, ur_f(s),
                fill=fill(cap(f"{s['de']} ___ {c_de}."), form, options(form, other_forms("haben", s["p"])),
                          "haben: ich habe, du hast, er/sie/es hat, wir haben, ihr habt, sie/Sie haben",
                          "haben: ich habe، du hast، er hat، wir haben، ihr habt، sie haben"),
                rule="sein-haben")


# =========================================================================
# 2. Wortstellung (verb position)
# =========================================================================
def en_question(wq_en, s, verb_, c_en, with_comp=False):
    base = V[verb_]["en"]
    if verb_ == "kommen":
        return f"Where {en_do(s)} {s['en']} come from?"
    tail = f" {c_en}" if with_comp else ""
    if wq_en:
        return f"{wq_en} {en_do(s)} {s['en']} {base}{tail}?"
    return f"{cap(en_do(s))} {s['en']} {base}{tail}?"


def gen_wortstellung():
    subs = ["du", "Sie", "er", "sie", "ihr"]
    for verb_, c_de, c_en, c_ur, wq, wq_ur, wq_en in ACTS:
        v = V[verb_]
        for sk in subs:
            s = SUBJECTS[sk]
            form = present(verb_, s["p"])
            # W-Frage: W-word + verb + subject
            de = f"{wq} {form} {s['de']}?"
            ur = f"{s['ur']} {wq_ur} {v['ur']}{s['T']}؟"
            wrong = [f"{wq} {s['de']} {form}?", f"{cap(s['de'])} {wq.lower() if wq != wq.title() else wq} {form}?"]
            add("wortstellung", de, en_question(wq_en, s, verb_, c_en), ur,
                order=([wq, form, s["de"]], 1),
                pick=options(de, wrong + [f"{wq} {s['de']} {verb_}?"]),
                rule="w-frage")
            # Ja/Nein-Frage: verb first
            de = f"{cap(form)} {s['de']} {c_de}?"
            ur = f"کیا {s['ur']} {c_ur} {v['ur']}{s['T']}؟"
            add("wortstellung", de, en_question("", s, verb_, c_en, True), ur,
                order=([cap(form), s["de"], c_de], 0),
                pick=options(de, [f"{cap(s['de'])} {c_de} {form}?", f"{cap(c_de)} {s['de']} {form}?"]),
                rule="ja-nein")
    # time first -> verb stays 2nd, subject moves behind the verb
    times = [("Heute", "today", "آج"), ("Am Montag", "on Monday", "پیر کو"), ("Morgen", "tomorrow", "کل"),
             ("Am Abend", "in the evening", "شام کو")]
    for verb_, c_de, c_en, c_ur, *_ in ACTS[2:8]:
        v = V[verb_]
        for t_de, t_en, t_ur in times:
            for sk in ["ich", "wir", "er", "Sara"]:
                s = SUBJECTS[sk]
                form = present(verb_, s["p"])
                subj = s["de"]
                de = f"{t_de} {form} {subj} {c_de}."
                ur = f"{t_ur} {s['ur']} {c_ur} {v['ur']}{s['T']}۔"
                en = f"{t_en} {s['en']} {en_present(verb_, s)} {c_en}"
                add("wortstellung", de, en, ur,
                    order=([t_de, form, subj, c_de], 1),
                    pick=options(de, [f"{t_de} {subj} {form} {c_de}.", f"{t_de} {subj} {c_de} {form}."]),
                    fill=fill(f"{t_de} ___ {subj} {c_de}.", form,
                              options(form, other_forms(verb_, s["p"])),
                              f"The verb is ALWAYS in position 2. '{t_de}' is position 1, so the subject comes after the verb.",
                              f"فعل ہمیشہ دوسری جگہ پر آتا ہے۔ '{t_de}' پہلی جگہ پر ہے، اس لیے فاعل فعل کے بعد آتا ہے۔"),
                    rule="verb-2")
    # Imperativ (Sie): verb first
    imps = [("Gehen Sie geradeaus!", "Go straight ahead!", "سیدھے جائیے!", ["Gehen", "Sie", "geradeaus"]),
            ("Gehen Sie links!", "Go left!", "بائیں جائیے!", ["Gehen", "Sie", "links"]),
            ("Gehen Sie rechts!", "Go right!", "دائیں جائیے!", ["Gehen", "Sie", "rechts"]),
            ("Sprechen Sie bitte langsam!", "Please speak slowly!", "براہ کرم آہستہ بولیے!", ["Sprechen", "Sie", "bitte langsam"]),
            ("Trinken Sie viel Wasser!", "Drink a lot of water!", "بہت پانی پیجیے!", ["Trinken", "Sie", "viel Wasser"]),
            ("Kommen Sie bitte morgen!", "Please come tomorrow!", "براہ کرم کل آئیے!", ["Kommen", "Sie", "bitte morgen"]),
            ("Nehmen Sie die Tabletten!", "Take the tablets!", "گولیاں لیجیے!", ["Nehmen", "Sie", "die Tabletten"]),
            ("Buchstabieren Sie bitte Ihren Namen!", "Please spell your name!", "براہ کرم اپنا نام ہجے کیجیے!", ["Buchstabieren", "Sie", "bitte Ihren Namen"])]
    for de, en, ur, ch in imps:
        add("wortstellung", de, en, ur, order=(ch, 0),
            pick=options(de, [f"Sie {ch[0].lower()} {ch[2]}!", f"{ch[2][:1].upper()}{ch[2][1:]} Sie {ch[0].lower()}!"]),
            rule="imperativ")


# =========================================================================
# 3. Pronomen (er/sie/es, Sie vs sie)
# =========================================================================
def gen_pronomen():
    people = [("Ali", "m", "Lahore", "لاہور"), ("Sara", "f", "Jakarta", "جکارتہ"),
              ("das Kind", "n", "Berlin", "برلن"), ("der Lehrer", "m", "Hamburg", "ہیمبرگ"),
              ("die Ärztin", "f", "Karachi", "کراچی"), ("Herr Khan", "m", "Islamabad", "اسلام آباد"),
              ("Frau Weber", "f", "München", "میونخ"), ("das Baby", "n", "Wien", "ویانا")]
    pr = {"m": "Er", "f": "Sie", "n": "Es"}
    ur_name = {"Ali": "علی", "Sara": "سارہ", "das Kind": "بچہ", "der Lehrer": "استاد", "die Ärztin": "ڈاکٹر",
               "Herr Khan": "خان صاحب", "Frau Weber": "مسز ویبر", "das Baby": "بچہ"}
    en_name = {"das Kind": "the child", "der Lehrer": "the teacher", "die Ärztin": "the doctor", "das Baby": "the baby"}
    for name, g, city, city_ur in people:
        ans = pr[g]
        de = f"Das ist {name}. {ans} wohnt in {city}."
        en_p = {"m": "He", "f": "She", "n": "It"}[g]
        add("pronomen", de, f"This is {en_name.get(name, name)}. {en_p} lives in {city}.",
            f"یہ {ur_name[name]} ہے۔ وہ {city_ur} میں رہتا ہے۔" if g != "f" else f"یہ {ur_name[name]} ہے۔ وہ {city_ur} میں رہتی ہے۔",
            fill=fill(f"Das ist {name}. ___ wohnt in {city}.", ans, options(ans, ["Er", "Sie", "Es", "Wir"]),
                      f"{name} is {GENDER_NAME[g]} → {ans}. der → er, die → sie, das → es.",
                      f"der کے لیے er، die کے لیے sie، das کے لیے es استعمال ہوتا ہے۔"),
            rule="pronomen")
    # Sie (formal) / sie (she) / sie (they): the verb ending tells you
    cases = [
        ("Sara kommt aus Indonesien. Sie wohnt in Jakarta.", "she", "-t → sie = she", "سارہ انڈونیشیا سے ہے۔ وہ جکارتہ میں رہتی ہے۔", "Sara comes from Indonesia. She lives in Jakarta."),
        ("Ali und Sara lernen Deutsch. Sie wohnen in Lahore.", "they", "-en + two people → sie = they", "علی اور سارہ جرمن سیکھتے ہیں۔ وہ لاہور میں رہتے ہیں۔", "Ali and Sara learn German. They live in Lahore."),
        ("Herr Khan, wo wohnen Sie?", "you (formal)", "talking TO someone (Herr Khan) → Sie = you (formal)", "خان صاحب، آپ کہاں رہتے ہیں؟", "Mr Khan, where do you live?"),
        ("Das ist Frau Weber. Sie ist Lehrerin.", "she", "ist (3rd person singular) → sie = she", "یہ مسز ویبر ہیں۔ وہ استانی ہیں۔", "This is Mrs Weber. She is a teacher."),
        ("Woher kommen Sie, Frau Ahmed?", "you (formal)", "talking TO Frau Ahmed → Sie = you (formal)", "مسز احمد، آپ کہاں سے ہیں؟", "Where are you from, Mrs Ahmed?"),
        ("Die Kinder spielen Fußball. Sie sind im Park.", "they", "sind + die Kinder → sie = they", "بچے فٹ بال کھیلتے ہیں۔ وہ پارک میں ہیں۔", "The children play football. They are in the park."),
        ("Meine Mutter kocht gut. Sie macht Biryani.", "she", "macht (-t) → sie = she", "میری امی اچھا کھانا پکاتی ہیں۔ وہ بریانی بناتی ہیں۔", "My mother cooks well. She makes biryani."),
    ]
    for de, ans, why, ur, en in cases:
        add("pronomen", de, en, ur,
            fill=fill(f"{de}\nWho is “Sie/sie” here?", ans, options(ans, ["she", "they", "you (formal)"], 3),
                      f"Look at the verb ending: {why}.",
                      "فعل کا آخری حصہ دیکھیں: ‎-t ہو تو she، ‎-en ہو تو they یا آپ (Sie)۔"),
            rule="sie-sie", key="pron:" + de)


# =========================================================================
# 4. Artikel (ein/kein, Nominativ) + Possessiv (Nominativ)
# =========================================================================
def gen_artikel():
    things = [n for n in N.values() if "thing" in n["kinds"] or "food" in n["kinds"] or "vehicle" in n["kinds"]]
    for n in things:
        g = n["g"]
        a = article("indef", "nom", g)
        de = f"Das ist {a} {n['lemma']}."
        ur = f"یہ {ur_np(n, 'indef')} ہے۔"
        add("artikel", de, f"This is {en_np(n, 'indef')}", ur,
            fill=fill(f"Das ist ___ {n['lemma']}.", a, options(a, ["ein", "eine", "einen", "einem"]),
                      f"{ART_OF[g]} {n['lemma']} → {a} {n['lemma']} (der/das → ein, die → eine)",
                      f"der اور das کے ساتھ ein، die کے ساتھ eine آتا ہے۔"),
            pick=options(de, [f"Das ist {x} {n['lemma']}." for x in ["ein", "eine", "einen"] if x != a]),
            rule="ein-kein")
        k = article("kein", "nom", g)
        cat = n["kinds"] & {"food", "vehicle", "furniture", "drink"} or {"thing"}
        same = [x for x in things if x["g"] != g and x["kinds"] & cat and x["lemma"] != n["lemma"]]
        other = rng.choice(same or [x for x in things if x["g"] != g])
        oa = article("indef", "nom", other["g"])
        de = f"Das ist {k} {n['lemma']}, das ist {oa} {other['lemma']}."
        ur = f"یہ {n['ur']} نہیں ہے، یہ {ur_np(other, 'indef')} ہے۔"
        add("artikel", de, f"This is not {en_np(n, 'indef')}, this is {en_np(other, 'indef')}", ur,
            fill=fill(f"Das ist ___ {n['lemma']}, das ist {oa} {other['lemma']}.", k,
                      options(k, ["kein", "keine", "keinen", "nicht"]),
                      f"Negation of ein/eine = kein/keine: {ART_OF[g]} {n['lemma']} → {k} {n['lemma']}",
                      "ein کا منفی kein اور eine کا منفی keine ہے۔"),
            rule="ein-kein")
        if n["pl"] != "-":
            de = f"Das sind die {n['pl']}."
            add("artikel", de, f"These are the {n['en_pl']}", f"یہ {n['ur_pl']} ہیں۔",
                fill=fill(f"{ART_OF[g]} {n['lemma']} → Plural: ___ {n['pl']}", "die",
                          ["die", "der", "das", "den"],
                          "Every plural uses “die” – no matter if the singular is der, die or das.",
                          "جمع (Plural) میں ہمیشہ die آتا ہے، چاہے واحد der ہو، die ہو یا das۔"),
                rule="plural-die", key="pl:" + n["lemma"])
    # possessive (Nominativ)
    fam = [n for n in N.values() if "family" in n["kinds"] or n["lemma"] in ("Handy", "Auto", "Wohnung", "Buch", "Freund", "Lehrerin")]
    for n in fam:
        for sk in ["ich", "du", "er", "sie", "wir", "Sie"]:
            s = SUBJECTS[sk]
            g = n["g"]
            a = article("poss", "nom", g, s["pde"])
            word = noun_form(n, "nom", g == "pl")
            de = f"Das ist {a} {word}." if g != "pl" else f"Das sind {a} {word}."
            stem = s["pde"]
            ur = f"یہ {ur_poss(s['pur'], n['ur_g'], False, g == 'pl')} {n['ur_pl'] if g == 'pl' else n['ur']} {'ہیں' if g == 'pl' else 'ہے'}۔"
            add("artikel", de, f"{'These are' if g == 'pl' else 'This is'} {s['pen']} {n['en_pl'] if g == 'pl' else n['en']}", ur,
                fill=fill(de.replace(f" {a} ", " ___ ", 1), a,
                          options(a, [stem, stem + "e" if stem != "euer" else "eure", stem + "en", stem + "em"]),
                          f"{s['de']} → {stem}. {ART_OF[g]} {word}: {'masculine/neuter → no ending' if g in 'mn' else 'feminine/plural → -e'} → {a}",
                          f"{s['de']} کا possessive {stem} ہے۔ der/das کے ساتھ کوئی ending نہیں، die اور Plural کے ساتھ ‎-e لگتا ہے۔",
                          cue=f"({s['de']})"),
                rule="possessiv")


# =========================================================================
# 5. Modalverben
# =========================================================================
MOD_ACTS = [  # inf, de complement, en phrase, ur complement, ur stem
    ("spielen", "Fußball", "play football", "فٹ بال", "کھیل"),
    ("sprechen", "Deutsch", "speak German", "جرمن", "بول"),
    ("lernen", "Deutsch", "learn German", "جرمن", "سیکھ"),
    ("trinken", "viel Wasser", "drink a lot of water", "بہت پانی", "پی"),
    ("arbeiten", "heute", "work today", "آج", "کام کر"),
    ("fahren", "nach Berlin", "go to Berlin", "برلن", "جا"),
    ("kochen", "Biryani", "cook biryani", "بریانی", "پکا"),
    ("schlafen", "früh", "sleep early", "جلدی", "سو"),
    ("machen", "Hausaufgaben", "do homework", "ہوم ورک", "کر"),
    ("lesen", "ein Buch", "read a book", "ایک کتاب", "پڑھ"),
    ("aufstehen", "um sechs Uhr", "get up at six o'clock", "چھ بجے", "اٹھ"),
    ("gehen", "nach Hause", "go home", "گھر", "جا"),
    ("einkaufen", "am Samstag", "go shopping on Saturday", "ہفتے کو خریداری", "کر"),
]
MODALS = {
    "können": ("can", "can", lambda s, c, st: f"{s['ur']} {c} {st} سک{s['T']}۔", "کر سکنا (ability)"),
    "müssen": ("have to", "has to", lambda s, c, st: f"{s['ko']} {c} {st}نا ہے۔", "ضرور کرنا (must)"),
    "wollen": ("want to", "wants to", lambda s, c, st: f"{s['ur']} {c} {st}نا چاہ{s['T']}۔", "چاہنا (want)"),
    "sollen": ("should", "should", lambda s, c, st: f"{s['ko']} {c} {st}نا چاہیے۔", "چاہیے (should)"),
    "möchten": ("would like to", "would like to", lambda s, c, st: f"{s['ur']} {c} {st}نا چاہ{s['T']}۔", "پسند کرنا (would like)"),
}


def gen_modal():
    for inf, c_de, en_ph, c_ur, st in MOD_ACTS:
        v = V[inf]
        for m, (en1, en3, ur_f, _m_ur) in MODALS.items():
            for sk in sample(MAIN_SUBJECTS, 3):
                s = SUBJECTS[sk]
                mf = present(m, s["p"])
                de = cap(f"{s['de']} {mf} {c_de} {inf}.")
                en = f"{s['en']} {en3 if s['s3'] else en1} {en_ph}"
                ur = ur_f(s, c_ur, st)
                wrong_inf = [present(inf, s["p"]) if not v["sep"] else f"{present(inf, s['p'])} {v['sep']}",
                             v["pp"], present(inf, "2s") if not v["sep"] else present(inf, "2s")]
                sep_note = " Separable verbs stay together after a modal verb: aufstehen." if v["sep"] else ""
                add("modalverben", de, en, ur,
                    fill=fill(cap(f"{s['de']} {mf} {c_de} ___."), inf, options(inf, wrong_inf),
                              f"Modal verb ({m}) in position 2 is conjugated; the second verb goes to the END as infinitive.{sep_note}",
                              "Modal verb دوسری جگہ پر بدلتا ہے، اور دوسرا فعل جملے کے آخر میں اپنی اصل شکل (‎-en) میں آتا ہے۔"),
                    order=([cap(s["de"]), mf, c_de, inf], 1),
                    pick=options(de, [cap(f"{s['de']} {mf} {inf} {c_de}."),
                                      cap(f"{s['de']} {mf} {c_de} {present(inf, s['p']) if not v['sep'] else present(inf, s['p'])}."),
                                      cap(f"{s['de']} {m} {c_de} {inf}.")]),
                    rule="modal")
                add("modalverben", de, en, ur,
                    fill=fill(cap(f"{s['de']} ___ {c_de} {inf}."), mf, options(mf, other_forms(m, s["p"])),
                              f"{m}: ich {present(m, '1s')}, du {present(m, '2s')}, er/sie {present(m, '3s')}, wir {present(m, '1p')}, ihr {present(m, '2p')}, sie/Sie {present(m, '3p')}",
                              f"{m} کی گردان: ich {present(m, '1s')}، du {present(m, '2s')}، er {present(m, '3s')} (ich اور er ایک جیسے!)"),
                    rule="modal", key=de + "#mf")
    # questions with modal verbs
    for inf, c_de, en_ph, c_ur, st in MOD_ACTS[:6]:
        for m in ["können", "wollen", "möchten"]:
            for sk in ["du", "Sie"]:
                s = SUBJECTS[sk]
                mf = present(m, s["p"])
                de = f"{cap(mf)} {s['de']} {c_de} {inf}?"
                en1 = MODALS[m][0]
                en = {"können": f"Can you {en_ph}?", "wollen": f"Do you want to {en_ph}?", "möchten": f"Would you like to {en_ph}?"}[m]
                ur = "کیا " + MODALS[m][2](s, c_ur, st)[:-1] + "؟"
                add("modalverben", de, en, ur, order=([cap(mf), s["de"], c_de, inf], 0),
                    pick=options(de, [f"{cap(mf)} {s['de']} {inf} {c_de}?", f"{cap(s['de'])} {mf} {c_de} {inf}?"]),
                    rule="modal-frage")


# =========================================================================
# 6. Trennbare Verben
# =========================================================================
SEP_ACTS = [  # verb, de complement, en, ur complement
    ("aufstehen", "um sieben Uhr", "at seven o'clock", "سات بجے"),
    ("einkaufen", "am Samstag", "on Saturday", "ہفتے کو"),
    ("fernsehen", "am Abend", "in the evening", "شام کو"),
    ("mitkommen", "heute", "today", "آج"),
    ("anrufen", "Ali", "Ali", "علی کو"),
    ("abholen", "Sara", "Sara", "سارہ کو"),
    ("einladen", "Ali", "Ali", "علی کو"),
    ("mitbringen", "Kuchen", "cake", "کیک"),
]


def gen_trennbar():
    prefixes = ["auf", "an", "ein", "mit", "ab", "fern"]
    for verb_, c_de0, c_en0, c_ur0 in SEP_ACTS:
        v = V[verb_]
        pre = v["sep"]
        for sk in MAIN_SUBJECTS:
            s = SUBJECTS[sk]
            c_de, c_en, c_ur = c_de0, c_en0, c_ur0
            if c_de == s["de"]:  # "Sara holt Sara ab" -> use the other name
                c_de, c_en, c_ur = ("Ali", "Ali", "علی کو") if c_de == "Sara" else ("Sara", "Sara", "سارہ کو")
            form = present(verb_, s["p"])
            de = cap(f"{s['de']} {form} {c_de} {pre}.")
            if verb_ in ("anrufen", "abholen", "einladen"):
                en = f"{s['en']} {en_present(verb_, s).replace(' up', '')} {c_en}" + (" up" if verb_ == "abholen" else "")
            elif verb_ == "mitbringen":
                en = f"{s['en']} {en_present(verb_, s).split()[0]} {c_en} along"
            else:
                en = f"{s['en']} {en_present(verb_, s)} {c_en}"
            ur = f"{s['ur']} {c_ur} {v['ur']}{s['T']}۔"
            add("trennbar", de, en, ur,
                fill=fill(cap(f"{s['de']} {form} {c_de} ___."), pre, options(pre, [p for p in prefixes if p != pre]),
                          f"{verb_} is separable: the verb part ({form}) goes to position 2, the prefix “{pre}” goes to the END.",
                          f"{verb_} دو حصوں میں ٹوٹتا ہے: {form} دوسری جگہ پر اور “{pre}” جملے کے آخر میں۔"),
                order=([cap(s["de"]), form, c_de, pre], 1),
                pick=options(de, [cap(f"{s['de']} {pre}{form} {c_de}."), cap(f"{s['de']} {form} {c_de}."),
                                  cap(f"{s['de']} {verb_} {c_de}.")]),
                rule="trennbar")
            # with a modal verb the verb stays together
            m = rng.choice(["muss", "kann", "will", "möchte"]) if s["p"] in ("1s", "3s") else None
            if m:
                mod_inf = {"muss": "müssen", "kann": "können", "will": "wollen", "möchte": "möchten"}[m]
                de2 = cap(f"{s['de']} {m} {c_de} {verb_}.")
                en_m = {"muss": "has to" if s["s3"] else "have to", "kann": "can", "will": "wants to" if s["s3"] else "want to", "möchte": "would like to"}[m]
                ur2 = MODALS[mod_inf][2](s, c_ur, v["ur"])
                en2 = {"anrufen": f"call {c_en}", "abholen": f"pick {c_en} up", "einladen": f"invite {c_en}",
                       "mitbringen": f"bring {c_en} along"}.get(verb_, f"{V[verb_]['en']} {c_en}")
                add("trennbar", de2, f"{s['en']} {en_m} {en2}", ur2,
                    fill=fill(cap(f"{s['de']} {m} {c_de} ___."), verb_,
                              options(verb_, [f"{form} {pre}", f"{pre} {V[verb_]['inf'][len(pre):]}", f"{pre}{form}"]),
                              "With a modal verb the separable verb does NOT split: it stays together at the end.",
                              "Modal verb کے ساتھ trennbares Verb نہیں ٹوٹتا، پورا آخر میں آتا ہے۔"),
                    rule="trennbar-modal")
    for de, en, ur in [("Der Kurs fängt um neun Uhr an.", "The course starts at nine o'clock.", "کورس نو بجے شروع ہوتا ہے۔"),
                       ("Der Tag fängt um zehn Uhr an.", "The day starts at ten o'clock.", "دن دس بجے شروع ہوتا ہے۔"),
                       ("Der Film fängt um acht Uhr an.", "The film starts at eight o'clock.", "فلم آٹھ بجے شروع ہوتی ہے۔")]:
        ch = de[:-1].split(" ")
        add("trennbar", de, en, ur, order=([" ".join(ch[:2]), ch[2], " ".join(ch[3:6]), ch[6]], 1),
            fill=fill(de.replace(" an.", " ___."), "an", ["an", "auf", "ein", "mit"],
                      "anfangen → fängt … an: the prefix goes to the end.", "anfangen میں “an” جملے کے آخر میں جاتا ہے۔"),
            rule="trennbar")


# =========================================================================
# 7. Vergangenheit: Perfekt + war / hatte
# =========================================================================
PERF = [  # verb, de complement, en complement, ur complement
    ("lernen", "Deutsch", "German", "جرمن"), ("machen", "Hausaufgaben", "homework", "ہوم ورک"),
    ("kaufen", "ein Handy", "a mobile phone", "ایک موبائل"), ("spielen", "Cricket", "cricket", "کرکٹ"),
    ("kochen", "Biryani", "biryani", "بریانی"), ("arbeiten", "viel", "a lot", "بہت"),
    ("schreiben", "eine E-Mail", "an email", "ایک ای میل"), ("lesen", "ein Buch", "a book", "ایک کتاب"),
    ("essen", "Pizza", "pizza", "پیزا"), ("trinken", "Tee", "tea", "چائے"),
    ("hören", "Musik", "music", "موسیقی"), ("planen", "eine Party", "a party", "ایک پارٹی کا"),
    ("studieren", "Informatik", "computer science", "کمپیوٹر سائنس"), ("singen", "ein Lied", "a song", "ایک گانا"),
    ("fahren", "nach Berlin", "to Berlin", "برلن"), ("kommen", "nach Hause", "home", "گھر"),
    ("fliegen", "nach Deutschland", "to Germany", "جرمنی"), ("gehen", "ins Kino", "to the cinema", "سنیما"),
    ("bleiben", "zu Hause", "at home", "گھر پر"), ("aufstehen", "früh", "early", "جلدی"),
    ("telefonieren", "mit Ali", "with Ali", "علی سے"), ("einkaufen", "im Supermarkt", "at the supermarket", "سپر مارکیٹ میں"),
]


def wrong_participles(inf: str, pp: str) -> list[str]:
    v = V[inf]
    sep = v["sep"] or ""
    base = inf[len(sep):]
    stem = base[:-2] if base.endswith("en") else base[:-1]
    cands = []
    if inf.endswith("ieren"):
        cands = ["ge" + pp, "ge" + inf, stem + "t"]
    elif pp.endswith("en"):
        cands = [sep + "ge" + stem + "t", sep + "ge" + base, sep + stem + "t"]
    else:
        cands = [sep + "ge" + stem + "en", sep + stem + "t", sep + "ge" + base]
    if sep:
        cands.insert(0, "ge" + inf[:-2] + ("t" if pp.endswith("t") else "en"))
    return [c for c in cands if c != pp]


def gen_vergangenheit():
    for verb_, c_de, c_en, c_ur in PERF:
        v = V[verb_]
        aux_inf = "sein" if v["aux"] == "sein" else "haben"
        for sk in sample(MAIN_SUBJECTS, 5):
            s = SUBJECTS[sk]
            aux = present(aux_inf, s["p"])
            de = cap(f"{s['de']} {aux} {c_de} {v['pp']}.")
            en_aux = s["have"]
            en_pp = v["en_pp"]
            if verb_ == "bleiben":
                en = f"{s['en']} {en_aux} stayed at home"
            elif verb_ == "aufstehen":
                en = f"{s['en']} got up early"
            elif verb_ == "einkaufen":
                en = f"{s['en']} {en_aux} gone shopping at the supermarket"
            elif verb_ == "planen":
                en = f"{s['en']} {en_aux} planned a party"
            else:
                en = f"{s['en']} {en_aux} {en_pp} {c_en}"
            ur = f"{s['ur']} {c_ur} {v['ur']} {s['C']}۔"
            other_aux = present("haben" if aux_inf == "sein" else "sein", s["p"])
            why_aux = ("movement/change of place → sein" if aux_inf == "sein" and verb_ != "bleiben"
                       else "bleiben is an exception: no movement, but still sein" if verb_ == "bleiben"
                       else "most verbs (about 90%) use haben")
            why_aux_ur = ("حرکت (جگہ بدلنا) ہو تو sein" if aux_inf == "sein" and verb_ != "bleiben"
                          else "bleiben استثنا ہے: حرکت نہیں پھر بھی sein" if verb_ == "bleiben"
                          else "زیادہ تر (تقریباً ۹۰٪) فعل haben کے ساتھ آتے ہیں")
            add("vergangenheit", de, en, ur,
                fill=fill(cap(f"{s['de']} ___ {c_de} {v['pp']}."), aux,
                          options(aux, [other_aux, present(aux_inf, "3s") if s["p"] != "3s" else present(aux_inf, "1s"),
                                        present("haben" if aux_inf == "sein" else "sein", "3s")]),
                          f"Perfekt = haben/sein (position 2) + Partizip II (end). {verb_}: {why_aux}.",
                          f"Perfekt = haben/sein (دوسری جگہ) + Partizip II (آخر میں)۔ {why_aux_ur}۔"),
                order=([cap(s["de"]), aux, c_de, v["pp"]], 1),
                pick=options(de, [cap(f"{s['de']} {other_aux} {c_de} {v['pp']}."), cap(f"{s['de']} {aux} {v['pp']} {c_de}."),
                                  cap(f"{s['de']} {aux} {c_de} {verb_}.")]),
                rule="perfekt-aux")
            if v["inf"].endswith("ieren"):
                why = "-ieren verbs have NO ge-: studieren → studiert"
                why_ur = "‎-ieren والے فعل میں ge- نہیں لگتا: studieren → studiert"
            elif v["sep"]:
                why = f"separable verb: ge- goes in the middle: {v['sep']} + ge + … → {v['pp']}"
                why_ur = f"trennbares Verb میں ge- درمیان میں آتا ہے: {v['pp']}"
            elif v["pp"].endswith("en"):
                why = f"irregular verb: ge- … -en → {v['pp']}"
                why_ur = f"بے قاعدہ فعل: ge- … ‎-en → {v['pp']}"
            else:
                why = f"regular verb: ge- + stem + -t → {v['pp']}"
                why_ur = f"باقاعدہ فعل: ge- + stem + ‎-t → {v['pp']}"
            add("vergangenheit", de, en, ur,
                fill=fill(cap(f"{s['de']} {aux} {c_de} ___."), v["pp"], options(v["pp"], wrong_participles(verb_, v["pp"])),
                          why, why_ur, cue=f"({verb_})"),
                rule="partizip", key=de + "#pp")
    add("vergangenheit", "Was ist passiert?", "What happened?", "کیا ہوا؟",
        fill=fill("Was ___ passiert?", "ist", ["ist", "hat", "bist", "habe"],
                  "passieren is an exception: it uses sein.", "passieren استثنا ہے: یہ sein کے ساتھ آتا ہے۔"),
        rule="perfekt-aux")
    # Präteritum: war / hatte
    war = ["war", "warst", "war", "waren", "wart", "waren"]
    hatte = ["hatte", "hattest", "hatte", "hatten", "hattet", "hatten"]
    war_c = [("gestern müde", "tired yesterday", lambda s: f"{s['ur']} کل تھک{agr(s)} {hua(s)} {s['tha']}۔"),
             ("letztes Jahr in Berlin", "in Berlin last year", lambda s: f"{s['ur']} پچھلے سال برلن میں {s['tha']}۔"),
             ("zu Hause", "at home", lambda s: f"{s['ur']} گھر پر {s['tha']}۔")]
    hat_c = [("keine Zeit", "had no time", lambda s: f"{s['paas']} وقت نہیں تھا۔"),
             ("Hunger", "was hungry", lambda s: f"{s['ko']} بھوک لگی تھی۔"),
             ("Kopfschmerzen", "had a headache", lambda s: f"{ur_poss(s['pur'], 'm', True)} سر میں درد تھا۔"),
             ("ein Fahrrad", "had a bicycle", lambda s: f"{s['paas']} ایک سائیکل تھی۔")]
    for sk in PRONOUN_SUBJECTS + ["Ali", "Sara"]:
        s = SUBJECTS[sk]
        i = PERSON_INDEX[s["p"]]
        for c_de, c_en, ur_f in war_c:
            de = cap(f"{s['de']} {war[i]} {c_de}.")
            en_was = "was" if s["p"] in ("1s", "3s") else "were"
            add("vergangenheit", de, f"{s['en']} {en_was} {c_en}", ur_f(s),
                fill=fill(cap(f"{s['de']} ___ {c_de}."), war[i], options(war[i], [w for w in dict.fromkeys(war + ['bin', 'ist']) if w != war[i]][:5]),
                          "war = past of sein: ich war, du warst, er war, wir waren, ihr wart, sie waren",
                          "war، sein کا ماضی ہے: ich war، du warst، er war، wir waren، ihr wart، sie waren"),
                rule="praeteritum")
        for c_de, c_en, ur_f in hat_c:
            de = cap(f"{s['de']} {hatte[i]} {c_de}.")
            en = f"{s['en']} {c_en}" if not c_en.startswith("was") else f"{s['en']} {'was' if s['p'] in ('1s', '3s') else 'were'} hungry"
            add("vergangenheit", de, en, ur_f(s),
                fill=fill(cap(f"{s['de']} ___ {c_de}."), hatte[i], options(hatte[i], [h for h in dict.fromkeys(hatte + ['habe', 'hat']) if h != hatte[i]][:5]),
                          "hatte = past of haben: ich hatte, du hattest, er hatte, wir hatten, ihr hattet, sie hatten",
                          "hatte، haben کا ماضی ہے: ich hatte، du hattest، er hatte، wir hatten، ihr hattet، sie hatten"),
                rule="praeteritum")


# =========================================================================
# 8. Zahlen, Datum, Uhrzeit
# =========================================================================
ONES = ["null", "eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn", "elf",
        "zwölf", "dreizehn", "vierzehn", "fünfzehn", "sechzehn", "siebzehn", "achtzehn", "neunzehn"]
TENS = {2: "zwanzig", 3: "dreißig", 4: "vierzig", 5: "fünfzig", 6: "sechzig", 7: "siebzig", 8: "achtzig", 9: "neunzig"}


def num(n: int, *, ein=False) -> str:
    if n < 20:
        return "ein" if (n == 1 and ein) else ONES[n]
    if n < 100:
        t, u = divmod(n, 10)
        return TENS[t] if u == 0 else ("ein" if u == 1 else ONES[u]) + "und" + TENS[t]
    if n < 1000:
        h, r = divmod(n, 100)
        return ("ein" if h == 1 else ONES[h]) + "hundert" + (num(r) if r else "")
    th, r = divmod(n, 1000)
    return num(th, ein=True) + "tausend" + (num(r) if r else "")


def gen_zahlen():
    picks = sample(range(21, 100), 30) + sample(range(101, 1000), 12) + [524, 7245, 13240]
    for n in picks:
        right = num(n)
        wrong = []
        if 21 <= n < 100 and n % 10:
            t, u = divmod(n, 10)
            if u != t:
                wrong.append(num(u * 10 + t))  # swapped digits trap
            wrong.append(TENS[t] + ONES[u] if u > 1 else TENS[t] + "eins")  # English order
            wrong.append(ONES[u] + TENS[t] if u > 1 else "ein" + TENS[t])  # missing und
        else:
            wrong += [num(n + 10), num(n - 1) if n > 1 else num(n + 2), num(n + 100)]
        add("zahlen", f"{n} = {right}", f"{n}", f"{n}",
            fill=fill(f"Wie schreibt man {n}?", right, options(right, wrong + [num(n + 1)]),
                      "German says the ones BEFORE the tens: 47 = sieben-und-vierzig (7 and 40).",
                      "جرمن میں اکائی پہلے اور دہائی بعد میں بولتے ہیں: ۴۷ = sieben-und-vierzig (سات اور چالیس)"),
            rule="zahlen", key=f"num{n}")
    # dates (ordinal + am …ten)
    months = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]

    def ordinal(d):
        special = {1: "ersten", 3: "dritten", 7: "siebten", 8: "achten"}
        if d in special:
            return special[d]
        return num(d) + ("sten" if d >= 20 else "ten")
    for d, m in [(1, 1), (2, 2), (3, 3), (7, 5), (8, 8), (12, 6), (19, 10), (21, 9), (24, 12), (30, 11), (14, 2), (25, 7)]:
        right = f"Am {ordinal(d)} {months[m - 1]}."
        wrong = [f"Am {num(d)} {months[m - 1]}.", f"Am {num(d)}ten {months[m - 1]}." if d < 20 else f"Am {num(d)}ten {months[m - 1]}.",
                 f"Am {ordinal(d + 1 if d < 28 else d - 1)} {months[m - 1]}."]
        if d in (1, 3, 7, 8):
            wrong[1] = f"Am {num(d)}ten {months[m - 1]}."
        wrong = [w for w in dict.fromkeys(wrong) if w != right]
        add("zahlen", f"Ich habe am {ordinal(d)} {months[m - 1]} Geburtstag.",
            f"My birthday is on the {d}{'st' if d in (1, 21, 31) else 'nd' if d in (2, 22) else 'rd' if d in (3, 23) else 'th'} of {['January','February','March','April','May','June','July','August','September','October','November','December'][m-1]}",
            f"میری سالگرہ {d} {['جنوری','فروری','مارچ','اپریل','مئی','جون','جولائی','اگست','ستمبر','اکتوبر','نومبر','دسمبر'][m-1]} کو ہے۔",
            fill=fill(f"Wann hast du Geburtstag? ({d:02d}.{m:02d}.)", right, options(right, wrong),
                      "Dates use ordinals: 1–19 → -ten (zweiten), 20+ → -sten (einundzwanzigsten). Special: ersten, dritten, siebten, achten.",
                      "تاریخ کے لیے ordinal: ۱ سے ۱۹ تک ‎-ten، ۲۰ اور اس سے اوپر ‎-sten۔ خاص: ersten، dritten، siebten، achten۔"),
            rule="datum", key=f"date{d}.{m}")
    for y, w in [(2026, ["zwanzighundertsechsundzwanzig", "zweitausendsechzwanzig"]), (1918, ["eintausendneunhundertachtzehn", "neunzehnhundertundachtzehn"]),
                 (2002, ["zwanzighundertzwei", "zweitausendundzwei"]), (1999, ["eintausendneunhundertneunundneunzig", "neunzehnneunundneunzig"])]:
        right = ("zweitausend" + (num(y - 2000) if y > 2000 else "")) if y >= 2000 else num(y // 100) + "hundert" + num(y % 100)
        add("zahlen", f"{y} = {right}", f"the year {y}", f"سال {y}",
            fill=fill(f"Wie sagt man das Jahr {y}?", right, options(right, w),
                      "Years before 2000: “neunzehnhundert…”. From 2000: “zweitausend…” (not “zwanzighundert”).",
                      "۲۰۰۰ سے پہلے: neunzehnhundert…، ۲۰۰۰ کے بعد: zweitausend… (zwanzighundert نہیں)"),
            rule="datum", key=f"year{y}")


UR_HOURS = ["", "ایک", "دو", "تین", "چار", "پانچ", "چھ", "سات", "آٹھ", "نو", "دس", "گیارہ", "بارہ"]


def h12(h):
    h = h % 12
    return 12 if h == 0 else h


def informal(h, m):
    """German, English, Urdu informal clock phrase for h:m."""
    H, N_ = h12(h), h12(h + 1)
    hw = lambda x: num(x)  # 1 -> eins in informal time
    if m == 0:
        return f"{num(H, ein=True)} Uhr", f"{H} o'clock", f"{UR_HOURS[H]} بجے"
    if m == 15:
        return f"Viertel nach {hw(H)}", f"quarter past {H}", f"سوا {UR_HOURS[H]} بجے"
    if m == 30:
        ur = "ڈیڑھ بجے" if H == 1 else "ڈھائی بجے" if H == 2 else f"ساڑھے {UR_HOURS[H]} بجے"
        return f"halb {hw(N_)}", f"half past {H}", ur
    if m == 45:
        return f"Viertel vor {hw(N_)}", f"quarter to {N_}", f"پونے {UR_HOURS[N_]} بجے"
    if m in (5, 10, 20):
        return f"{num(m)} nach {hw(H)}", f"{m} past {H}", f"{UR_HOURS[H]} بج کر {m} منٹ"
    if m == 25:
        return f"fünf vor halb {hw(N_)}", f"25 past {H}", f"{UR_HOURS[H]} بج کر ۲۵ منٹ"
    if m == 35:
        return f"fünf nach halb {hw(N_)}", f"25 to {N_}", f"{UR_HOURS[N_]} بجنے میں ۲۵ منٹ"
    if m in (40, 50, 55):
        return f"{num(60 - m)} vor {hw(N_)}", f"{60 - m} to {N_}", f"{UR_HOURS[N_]} بجنے میں {60 - m} منٹ"
    if m in (1, 2, 3):
        return f"kurz nach {hw(H)}", f"just after {H}", f"{UR_HOURS[H]} بجے کے فوراً بعد"
    if m in (57, 58, 59):
        return f"kurz vor {hw(N_)}", f"just before {N_}", f"{UR_HOURS[N_]} بجنے والے ہیں"
    return None


def official(h, m):
    return f"{num(h, ein=True)} Uhr" + (f" {num(m)}" if m else "")


def gen_uhrzeit():
    mins = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 2, 58]
    seen = 0
    for h in range(1, 24):
        for m in sample(mins, 3):
            inf_ = informal(h, m)
            if not inf_:
                continue
            de_i, en_i, ur_i = inf_
            clock = f"{h}:{m:02d}"
            # traps: wrong hour with halb/vor, swapped vor/nach, neighbouring quarter
            traps = []
            for dh, dm in [(1, 0), (-1, 0), (0, 15), (0, -15), (0, 30), (1, 30)]:
                hh, mm = h + dh, m + dm
                if mm < 0:
                    mm += 60
                    hh -= 1
                if mm >= 60:
                    mm -= 60
                    hh += 1
                t = informal(hh % 24 or 12, mm)
                if t and t[0] != de_i:
                    traps.append(f"Es ist {t[0]}.")
            if "vor" in de_i:
                traps.insert(0, f"Es ist {de_i.replace('vor', 'nach')}.")
            elif "nach" in de_i and "halb" not in de_i:
                traps.insert(0, f"Es ist {de_i.replace('nach', 'vor')}.")
            right = f"Es ist {de_i}."
            add("uhrzeit", right, f"It is {en_i}", f"{ur_i} ہیں۔",
                fill=fill(f"Wie spät ist es? – {clock} (informal)", right, options(right, traps),
                          "Informal time: Viertel nach (:15), halb + NEXT hour (:30), Viertel vor + NEXT hour (:45). halb acht = 7:30!",
                          "غیر رسمی وقت: Viertel nach = سوا، halb + اگلا گھنٹہ = ساڑھے، Viertel vor = پونے۔ halb acht = ساڑھے سات!"),
                rule="uhrzeit-informal", key=f"inf{clock}")
            seen += 1
        m = rng.choice([5, 15, 20, 30, 45, 50])
        right = f"Es ist {official(h, m)}."
        traps = [f"Es ist {official(h12(h), m)}." if h > 12 else f"Es ist {official(h + 12, m)}.",
                 f"Es ist {official(h, (m % 10) * 10 + m // 10)}." if m % 10 and (m % 10) * 10 + m // 10 < 60 else f"Es ist {official(h, m + 5)}.",
                 f"Es ist {official(h - 1 if h > 1 else 23, m)}."]
        add("uhrzeit", right, f"It is {h}:{m:02d}", f"{h}:{m:02d} ہیں۔",
            fill=fill(f"Wie viel Uhr ist es? – {h}:{m:02d} (official)", right, options(right, traps),
                      "Official time (24 h): hour + Uhr + minutes: 16:45 = sechzehn Uhr fünfundvierzig. Afternoon: add 12.",
                      "رسمی وقت (۲۴ گھنٹے): گھنٹہ + Uhr + منٹ۔ دوپہر کے بعد ۱۲ جمع کریں: ۴ بجے = ۱۶ Uhr"),
            rule="uhrzeit-offiziell", key=f"off{h}:{m}")
    # am / um / zum / von … bis
    prep = [
        ("Ich stehe um sieben Uhr auf.", "Ich stehe ___ sieben Uhr auf.", "um", "I get up at seven o'clock.", "میں سات بجے اٹھتا ہوں۔"),
        ("Ich arbeite am Montag.", "Ich arbeite ___ Montag.", "am", "I work on Monday.", "میں پیر کو کام کرتا ہوں۔"),
        ("Am Abend sehe ich fern.", "___ Abend sehe ich fern.", "Am", "In the evening I watch TV.", "شام کو میں ٹی وی دیکھتا ہوں۔"),
        ("Wir essen zum Frühstück Brot.", "Wir essen ___ Frühstück Brot.", "zum", "We eat bread for breakfast.", "ہم ناشتے میں ڈبل روٹی کھاتے ہیں۔"),
        ("Ich arbeite von Montag bis Freitag.", "Ich arbeite von Montag ___ Freitag.", "bis", "I work from Monday to Friday.", "میں پیر سے جمعہ تک کام کرتا ہوں۔"),
        ("Der Film beginnt um acht Uhr.", "Der Film beginnt ___ acht Uhr.", "um", "The film starts at eight o'clock.", "فلم آٹھ بجے شروع ہوتی ہے۔"),
        ("Am Morgen trinke ich Tee.", "___ Morgen trinke ich Tee.", "Am", "In the morning I drink tea.", "صبح میں چائے پیتا ہوں۔"),
        ("Was essen wir zum Abendessen?", "Was essen wir ___ Abendessen?", "zum", "What are we eating for dinner?", "ہم رات کے کھانے میں کیا کھائیں گے؟"),
        ("Wann gehst du ins Kino? – Um acht.", "Wann gehst du ins Kino? – ___ acht.", "Um", "When are you going to the cinema? – At eight.", "تم سنیما کب جا رہے ہو؟ – آٹھ بجے۔"),
        ("Ich treffe Ali am Samstag.", "Ich treffe Ali ___ Samstag.", "am", "I am meeting Ali on Saturday.", "میں ہفتے کو علی سے ملتا ہوں۔"),
        ("Der Kurs ist von neun bis zwölf Uhr.", "Der Kurs ist ___ neun bis zwölf Uhr.", "von", "The course is from nine to twelve.", "کورس نو سے بارہ بجے تک ہے۔"),
    ]
    for de, text, ans, en, ur in prep:
        base = ["am", "um", "zum", "bis", "von", "im"]
        opts = [x.capitalize() if ans[0].isupper() else x for x in base]
        add("uhrzeit", de, en, ur,
            fill=fill(text, ans, options(ans, [o for o in opts if o != ans]),
                      "um + clock time (um 8 Uhr) · am + day / part of day (am Montag, am Abend) · zum + meal (zum Frühstück) · von … bis = from … to",
                      "um گھڑی کے وقت کے ساتھ، am دن یا دن کے حصے کے ساتھ، zum کھانے کے ساتھ، von … bis = سے … تک"),
            rule="zeit-praep")


# =========================================================================
# 9. Wortbildung + Redemittel
# =========================================================================
def gen_wortbildung():
    los = [("die Arbeit", "arbeitslos", "unemployed", "بے روزگار"), ("die Kosten", "kostenlos", "free (of charge)", "مفت"),
           ("der Sinn", "sinnlos", "pointless", "بے مقصد"), ("das Geld", "geldlos", "without money", "بے پیسہ"),
           ("die Hilfe", "hilflos", "helpless", "بے بس"), ("die Arbeit", "arbeitslos", "unemployed", "بے روزگار")]
    for base, w, en, ur in los:
        others = [x[1] for x in los if x[1] != w]
        add("wortbildung", f"{base} + los = {w}", f"{w} = {en}", f"{w} = {ur}",
            fill=fill(f"{base} + -los = ?  ({en})", w, options(w, sample(others, 3)),
                      "-los means “without” (English -less, Urdu بے): Arbeit → arbeitslos.",
                      "‎-los کا مطلب ہے “بغیر” (اردو میں بے): Arbeit → arbeitslos = بے روزگار"),
            rule="los")
    persons = [("kaufen", "der Käufer", "buyer", "خریدار"), ("verkaufen", "der Verkäufer", "seller", "بیچنے والا"),
               ("lehren", "der Lehrer", "teacher", "استاد"), ("spielen", "der Spieler", "player", "کھلاڑی"),
               ("fahren", "der Fahrer", "driver", "ڈرائیور"), ("backen", "der Bäcker", "baker", "نان بائی"),
               ("arbeiten", "der Arbeiter", "worker", "مزدور"), ("besuchen", "der Besucher", "visitor", "مہمان")]
    for vb, p, en, ur in persons:
        add("wortbildung", f"{vb} → {p}", f"{p} = {en}", f"{p} = {ur}",
            fill=fill(f"Who does it? {vb} → ___  ({en})", p, options(p, sample([x[1] for x in persons if x[1] != p], 3)),
                      "verb stem + -er = the person who does it (always der): kaufen → der Käufer.",
                      "فعل + ‎-er = کام کرنے والا (ہمیشہ der): kaufen → der Käufer = خریدار"),
            rule="er-person")
    fem = [("der Lehrer", "die Lehrerin"), ("der Arzt", "die Ärztin"), ("der Kellner", "die Kellnerin"),
           ("der Student", "die Studentin"), ("der Verkäufer", "die Verkäuferin"), ("der Freund", "die Freundin")]
    for m, f in fem:
        wrong = [f.replace("die", "der"), f.replace("die", "das"), m.replace("der", "die")]
        add("wortbildung", f"{m} → {f}", f"{f} (female)", f"{f} (مؤنث)",
            fill=fill(f"{m} → female: ___", f, options(f, wrong),
                      "Female form: + -in, and the article becomes die: der Arzt → die Ärztin.",
                      "مؤنث بنانے کے لیے ‎-in لگائیں، اور article ہمیشہ die: der Arzt → die Ärztin"),
            rule="in-feminin")
    ung = [("einladen", "die Einladung", "invitation", "دعوت"), ("wohnen", "die Wohnung", "flat", "فلیٹ"),
           ("vorstellen", "die Vorstellung", "introduction", "تعارف"), ("bestellen", "die Bestellung", "order", "آرڈر"),
           ("verabreden", "die Verabredung", "appointment", "ملاقات"), ("entschuldigen", "die Entschuldigung", "apology", "معذرت")]
    for vb, n_, en, ur in ung:
        add("wortbildung", f"{vb} → {n_}", f"{n_} = {en}", f"{n_} = {ur}",
            fill=fill(f"{vb} → noun: ___  ({en})", n_, options(n_, [n_.replace("die", "der"), n_.replace("die", "das"), "die " + vb.capitalize()]),
                      "verb + -ung = noun, and -ung nouns are ALWAYS die.",
                      "فعل + ‎-ung = اسم، اور ‎-ung والے اسم ہمیشہ die ہوتے ہیں۔"),
            rule="ung")
    chen = [("das Brot", "das Brötchen"), ("das Haus", "das Häuschen"), ("die Katze", "das Kätzchen"), ("der Tisch", "das Tischchen")]
    for b, c in chen:
        add("wortbildung", f"{b} → {c}", f"{c} = small {b.split()[1]}", f"{c} = چھوٹا {b.split()[1]}",
            fill=fill(f"{b} + -chen (small) = ?", c, options(c, [c.replace("das", "der"), c.replace("das", "die"), b + "chen"]),
                      "-chen makes things small and is ALWAYS das (even die Katze → das Kätzchen).",
                      "‎-chen چیز کو چھوٹا بناتا ہے اور ہمیشہ das ہوتا ہے۔"),
            rule="chen")
    pain = [("Kopf", "Kopfschmerzen", "headache", "سر درد"), ("Rücken", "Rückenschmerzen", "back pain", "کمر درد"),
            ("Zahn", "Zahnschmerzen", "toothache", "دانت کا درد"), ("Bauch", "Bauchschmerzen", "stomach ache", "پیٹ درد"),
            ("Hals", "Halsschmerzen", "sore throat", "گلے میں درد"), ("Ohr", "Ohrenschmerzen", "earache", "کان کا درد"),
            ("Bein", "Beinschmerzen", "leg pain", "ٹانگ میں درد")]
    for part, w, en, ur in pain:
        de = f"Ich habe {w}."
        add("wortbildung", de, f"I have a {en}" if en != "back pain" else "I have back pain", f"مجھے {ur} ہے۔",
            fill=fill(f"Mein {part} tut weh. → Ich habe ___.", w, options(w, sample([p[1] for p in pain if p[1] != w], 3)),
                      "Body part + Schmerzen = pain in that part: Kopf + Schmerzen = Kopfschmerzen.",
                      "جسم کا حصہ + Schmerzen = اس حصے میں درد: Kopf + Schmerzen = سر درد"),
            rule="schmerzen")


PHRASES = {
    "Unterricht": [
        ("Das verstehe ich nicht.", "I don't understand that.", "مجھے یہ سمجھ نہیں آیا۔"),
        ("Bitte noch einmal.", "Once more, please.", "براہ کرم ایک بار پھر۔"),
        ("Bitte ein bisschen langsamer.", "A little slower, please.", "براہ کرم تھوڑا آہستہ۔"),
        ("Was bedeutet das?", "What does that mean?", "اس کا مطلب کیا ہے؟"),
        ("Wie schreibt man das?", "How do you write that?", "یہ کیسے لکھتے ہیں؟"),
        ("Buchstabieren Sie bitte.", "Please spell it.", "براہ کرم ہجے کیجیے۔"),
        ("Haben Sie Fragen?", "Do you have any questions?", "کیا آپ کے کوئی سوال ہیں؟"),
    ],
    "Restaurant": [
        ("Die Speisekarte, bitte.", "The menu, please.", "مینو دیجیے۔"),
        ("Ich möchte bestellen.", "I would like to order.", "میں آرڈر دینا چاہتا ہوں۔"),
        ("Für mich bitte ein Wasser.", "A water for me, please.", "میرے لیے ایک پانی، براہ کرم۔"),
        ("Zusammen oder getrennt?", "Together or separately?", "اکٹھے یا الگ الگ؟"),
        ("Die Rechnung, bitte.", "The bill, please.", "بل دیجیے۔"),
        ("Stimmt so.", "Keep the change.", "باقی رکھ لیں۔"),
        ("Guten Appetit!", "Enjoy your meal!", "کھانا مزے سے کھائیں!"),
        ("Prost! / Zum Wohl!", "Cheers!", "صحت کے لیے! (Cheers)"),
    ],
    "Arzt": [
        ("Was für Beschwerden haben Sie?", "What symptoms do you have?", "آپ کو کیا تکلیف ہے؟"),
        ("Ich habe Kopfschmerzen.", "I have a headache.", "مجھے سر درد ہے۔"),
        ("Ich habe Fieber.", "I have a fever.", "مجھے بخار ہے۔"),
        ("Ich habe Grippe.", "I have the flu.", "مجھے فلو ہے۔"),
        ("Nehmen Sie die Tabletten einmal pro Tag.", "Take the tablets once a day.", "گولیاں دن میں ایک بار لیجیے۔"),
        ("Gute Besserung!", "Get well soon!", "جلد صحت یاب ہو جائیں!"),
    ],
    "Wetter": [
        ("Wie ist das Wetter heute?", "What is the weather like today?", "آج موسم کیسا ہے؟"),
        ("Es ist sonnig.", "It is sunny.", "دھوپ نکلی ہوئی ہے۔"),
        ("Es ist kalt.", "It is cold.", "سردی ہے۔"),
        ("Es ist heiß.", "It is hot.", "گرمی ہے۔"),
        ("Es ist windig.", "It is windy.", "ہوا چل رہی ہے۔"),
        ("Es regnet.", "It is raining.", "بارش ہو رہی ہے۔"),
        ("Es schneit.", "It is snowing.", "برف باری ہو رہی ہے۔"),
    ],
    "Präsentation": [
        ("Sehr geehrte Damen und Herren,", "Ladies and gentlemen,", "محترم خواتین و حضرات،"),
        ("Wir präsentieren das Thema „Lahore“.", "We are presenting the topic “Lahore”.", "ہم موضوع “لاہور” پیش کر رہے ہیں۔"),
        ("Nächste Folie, bitte.", "Next slide, please.", "اگلی سلائیڈ، براہ کرم۔"),
        ("Jetzt kommt Herr Noman.", "Now Mr Noman is next.", "اب نعمان صاحب آئیں گے۔"),
        ("Vielen Dank für Ihre Aufmerksamkeit.", "Thank you very much for your attention.", "آپ کی توجہ کا بہت شکریہ۔"),
        ("Entschuldigung für die Verspätung.", "Sorry for the delay.", "دیر کے لیے معذرت۔"),
    ],
    "Brief": [
        ("Sehr geehrte Frau Weber,", "Dear Mrs Weber, (formal)", "محترمہ ویبر، (رسمی)"),
        ("Sehr geehrter Herr Khan,", "Dear Mr Khan, (formal)", "محترم خان صاحب، (رسمی)"),
        ("Mit freundlichen Grüßen", "Kind regards (formal ending)", "نیک تمناؤں کے ساتھ (رسمی اختتام)"),
        ("Liebe Sara,", "Dear Sara, (informal)", "پیاری سارہ، (غیر رسمی)"),
        ("Lieber Ali,", "Dear Ali, (informal)", "پیارے علی، (غیر رسمی)"),
        ("Viele Grüße", "Best wishes (informal ending)", "بہت سی دعائیں (غیر رسمی اختتام)"),
        ("Ich lade dich zu meinem Geburtstag ein.", "I invite you to my birthday.", "میں تمہیں اپنی سالگرہ پر بلاتا ہوں۔"),
        ("Zum Geburtstag viel Glück!", "Happy birthday!", "سالگرہ مبارک!"),
    ],
}


def gen_redemittel():
    for group, items in PHRASES.items():
        for de, en, ur in items:
            others = [x[0] for x in items if x[0] != de]
            add("redemittel", de, en, ur,
                fill=fill(f"{en}\n{ur}", de, options(de, sample(others, 3)),
                          f"Useful phrase ({group}).", f"اہم جملہ ({group})"),
                rule="redemittel", key="ph:" + de)
    letter = [("Sehr ___ Herr Khan,", "geehrter", ["geehrter", "geehrte", "geehrtes", "lieber"], "Herr → geehrter (-er for a man)", "مرد کے لیے geehrter", "Dear Mr Khan, (formal)", "محترم خان صاحب، (رسمی)"),
              ("Sehr ___ Frau Weber,", "geehrte", ["geehrte", "geehrter", "liebe", "geehrten"], "Frau → geehrte (-e for a woman)", "عورت کے لیے geehrte", "Dear Mrs Weber, (formal)", "محترمہ ویبر، (رسمی)"),
              ("___ Ali, (informal)", "Lieber", ["Lieber", "Liebe", "Sehr geehrter", "Liebes"], "informal to a man → Lieber", "غیر رسمی، مرد کے لیے Lieber", "Dear Ali, (informal)", "پیارے علی، (غیر رسمی)"),
              ("___ Sara, (informal)", "Liebe", ["Liebe", "Lieber", "Sehr geehrte", "Liebes"], "informal to a woman → Liebe", "غیر رسمی، عورت کے لیے Liebe", "Dear Sara, (informal)", "پیاری سارہ، (غیر رسمی)"),
              ("Formal letter ending: ___", "Mit freundlichen Grüßen", ["Mit freundlichen Grüßen", "Viele Grüße", "Tschüs", "Bis bald"], "formal → Mit freundlichen Grüßen", "رسمی خط کا اختتام", "Kind regards (formal ending)", "نیک تمناؤں کے ساتھ (رسمی اختتام)"),
              ("Informal letter ending: ___", "Viele Grüße", ["Viele Grüße", "Mit freundlichen Grüßen", "Sehr geehrte", "Guten Tag"], "informal → Viele Grüße", "غیر رسمی خط کا اختتام", "Best wishes (informal ending)", "بہت سی دعائیں (غیر رسمی اختتام)")]
    for text, ans, opts, why, why_ur, en, ur in letter:
        add("redemittel", text.replace("___", ans).replace(" (informal)", "").replace("Formal letter ending: ", "").replace("Informal letter ending: ", ""), en, ur,
            fill=fill(text, ans, opts, why + ". Formal: Sie/Ihnen · informal: du/dir.", why_ur + "۔ رسمی خط میں Sie، غیر رسمی میں du۔"),
            rule="brief", key="letter:" + text)


# =========================================================================
# 10. Akkusativ (optional)
# =========================================================================
AKK_VERBS = {  # verb: (kinds, dets, en builder, ur builder)
    "kaufen": ({"buy"}, ["def", "indef"]),
    "brauchen": ({"thing"}, ["indef", "kein"]),
    "haben": ({"thing", "vehicle"}, ["indef", "kein"]),
    "möchten": ({"food", "drink", "buy"}, ["indef"]),
    "suchen": ({"small", "flat"}, ["poss", "def"]),
    "essen": ({"food"}, ["indef", "def"]),
    "trinken": ({"drink"}, ["indef"]),
    "lesen": ({"read"}, ["def", "indef"]),
    "besuchen": ({"person"}, ["poss", "def"]),
    "sehen": ({"person"}, ["def"]),
}


def art_options(det, case, g, pde=None):
    ans = article(det, case, g, pde)
    if det == "def":
        pool = ["den", "der", "dem", "das", "die"]
    elif det in ("indef", "kein"):
        stem = "ein" if det == "indef" else "kein"
        pool = [stem + e for e in ["en", "", "em", "e", "er"]]
    else:
        st = pde if pde != "euer" else "eur"
        pool = [st + e if e else (pde or "mein") for e in ["en", "", "em", "e", "er"]]
    others = [p for p in pool if p != ans]
    # most instructive distractors first: nominative and the other case
    first = [article(det, "nom", g, pde), article(det, "dat" if case == "akk" else "akk", g, pde)]
    return options(ans, [f for f in first if f and f != ans] + others)


def en_sentence(verb_, s, obj_en, det):
    if verb_ == "suchen":
        return f"{s['en']} {s['be']} looking for {obj_en}"
    if det == "kein":
        noun_en = obj_en.replace("no ", "")
        return f"{s['en']} {'does' if s['s3'] else 'do'}n't {V[verb_]['en']} {a_an(noun_en)} {noun_en}"
    if verb_ == "möchten":
        return f"{s['en']} would like {obj_en}"
    return f"{s['en']} {en_present(verb_, s)} {obj_en}"


def ur_akk_sentence(verb_, s, n, det, sk, poss=None):
    o = ur_np(n, det, possessor=poss, subj_key=sk)
    if verb_ == "kaufen":
        return f"{s['ur']} {o} خرید{s['T']}۔"
    if verb_ == "brauchen":
        return f"{s['ko']} {o} نہیں چاہیے۔" if det == "kein" else f"{s['ko']} {o} چاہیے۔"
    if verb_ == "haben":
        return f"{s['paas']} {o} نہیں ہے۔" if det == "kein" else f"{s['paas']} {o} ہے۔"
    if verb_ == "möchten":
        return f"{s['ur']} {o} لینا چاہ{s['T']}۔"
    if verb_ == "suchen":
        return f"{s['ur']} {o} ڈھونڈ {s['P']}۔"
    if verb_ == "besuchen":
        o = ur_np(n, det, oblique=True, possessor=poss, subj_key=sk, demonstrative=True)
        return f"{s['ur']} {o} سے ملنے جا{s['T']}۔"
    if verb_ == "sehen":
        o = ur_np(n, det, oblique=True, demonstrative=True)
        return f"{s['ur']} {o} کو دیکھ{s['T']}۔"
    stem = V[verb_]["ur"]
    return f"{s['ur']} {o} {stem}{s['T']}۔"


def gen_akkusativ():
    for verb_, (kinds, dets) in AKK_VERBS.items():
        nouns = [n for n in N.values() if n["kinds"] & kinds and n["g"] != "pl"]
        for n in sample(nouns, 10):
            for det in dets:
                sk = rng.choice(MAIN_SUBJECTS)
                s = SUBJECTS[sk]
                poss = sk if det == "poss" and not s.get("name") else ("er" if det == "poss" else None)
                pde = SUBJECTS[poss]["pde"] if poss else None
                pen = SUBJECTS[poss]["pen"] if poss else None
                g = n["g"]
                a = article(det, "akk", g, pde)
                vf = present(verb_, s["p"])
                de = cap(f"{s['de']} {vf} {a} {n['lemma']}.")
                en = en_sentence(verb_, s, en_np(n, det, pen=pen), det)
                ur = ur_akk_sentence(verb_, s, n, det, sk, poss)
                nom = article(det, "nom", g, pde)
                change = f"{nom} → {a}" if nom != a else f"{a} stays {a}"
                add("akkusativ", de, en, ur,
                    fill=fill(cap(f"{s['de']} {vf} ___ {n['lemma']}."), a, art_options(det, "akk", g, pde),
                              f"{verb_} + Akkusativ (direct object: what/whom?). {n['lemma']} is {GENDER_NAME[g]}: {change}. In Akkusativ only masculine changes.",
                              f"{verb_} کے ساتھ Akkusativ آتا ہے (کیا / کس کو؟)۔ Akkusativ میں صرف masculine بدلتا ہے: der → den، ein → einen۔",
                              cue=f"({pde})" if det == "poss" else ""),
                    pick=options(de, [cap(f"{s['de']} {vf} {x} {n['lemma']}.") for x in art_options(det, "akk", g, pde)[1:4]]),
                    rule="akk-verb", level=2)
    # Akkusativ prepositions: für, ohne, durch
    pairs = [("für", "Das Geschenk ist für {np}.", "The present is for {en}.", "یہ تحفہ {ur} کے لیے ہے۔"),
             ("für", "Ich kaufe einen Kuchen für {np}.", "I am buying a cake for {en}.", "میں {ur} کے لیے ایک کیک خریدتا ہوں۔"),
             ("ohne", "Ich gehe nicht ohne {np}.", "I don't go without {en}.", "میں {ur} کے بغیر نہیں جاتا۔")]
    for prep, tpl, en_t, ur_t in pairs:
        for n in [N[x] for x in ["Bruder", "Mutter", "Vater", "Schwester", "Freund", "Kind", "Eltern", "Oma"]]:
            g = n["g"]
            a = article("poss", "akk", g, "mein")
            word = noun_form(n, "akk", g == "pl")
            de = tpl.format(np=f"{a} {word}")
            ur_obj = ("اپن" if "Ich" in tpl else "میر") + ("ی" if n["ur_g"] == "f" else "ے") + " " + (n["ur_pl_obl"] if g == "pl" else n["ur_obl"])
            add("akkusativ", de, en_t.format(en=f"my {n['en_pl'] if g == 'pl' else n['en']}"), ur_t.format(ur=ur_obj),
                fill=fill(tpl.format(np=f"___ {word}"), a, art_options("poss", "akk", g, "mein"),
                          f"{prep} ALWAYS takes Akkusativ (für, ohne, durch, gegen, um). {ART_OF[g]} {word} → {a} {word}.",
                          f"{prep} کے بعد ہمیشہ Akkusativ آتا ہے (für، ohne، durch، gegen، um)۔", cue="(mein)"),
                rule="akk-praep", level=2)
    for n in [N["Park"], N["Wohnung"], N["Kino"], N["Schule"], N["Zimmer"]]:
        a = DEF["akk"][n["g"]]
        de = f"Wir gehen durch {a} {n['lemma']}."
        add("akkusativ", de, f"We walk through the {n['en']}.", f"ہم {n['ur']} میں سے گزرتے ہیں۔",
            fill=fill(f"Wir gehen durch ___ {n['lemma']}.", a, art_options("def", "akk", n["g"]),
                      "durch + Akkusativ: der Park → durch den Park.", "durch کے بعد Akkusativ: der → den"),
            rule="akk-praep", level=2)
    # Akkusativ pronouns
    refs = [("Schlüssel", "ihn"), ("Uhr", "sie"), ("Handy", "es"), ("Buch", "es"), ("Jacke", "sie"), ("Computer", "ihn"),
            ("Stift", "ihn"), ("Tasche", "sie")]
    for lemma, pron in refs:
        n = N[lemma]
        de = f"Wo ist {article('poss', 'nom', n['g'], 'mein')} {lemma}? Ich suche {pron}."
        add("akkusativ", de, f"Where is my {n['en']}? I am looking for it.",
            f"{ur_poss('میر', n['ur_g'], False)} {n['ur']} کہاں ہے؟ میں اسے ڈھونڈ رہا ہوں۔",
            fill=fill(f"Wo ist {article('poss', 'nom', n['g'], 'mein')} {lemma}? Ich suche ___.", pron,
                      options(pron, ["ihn", "sie", "es", "ihm"]),
                      f"der → ihn, die → sie, das → es (Akkusativ pronouns). {ART_OF[n['g']]} {lemma} → {pron}.",
                      "Akkusativ میں der کی جگہ ihn، die کی جگہ sie، das کی جگہ es"),
            rule="akk-pron", level=2)
    akk_pr = {"ich": "mich", "du": "dich", "er": "ihn", "sie": "sie", "wir": "uns", "ihr": "euch", "Sie": "Sie"}
    nom_dat = {"ich": ["ich", "mir"], "du": ["du", "dir"], "er": ["er", "ihm"], "sie": ["ihr", "ihre"], "wir": ["wir", "unser"], "ihr": ["ihr", "euer"], "Sie": ["Ihnen", "Ihr"]}
    tpls = [("Das Geschenk ist für ___.", "The present is for {en}.", "یہ تحفہ {ur} لیے ہے۔"),
            ("Ich liebe ___.", "I love {en}.", "مجھے {ur2} سے محبت ہے۔"),
            ("Kennst du ___?", "Do you know {en}?", "کیا تم {ur2} کو جانتے ہو؟")]
    en_obj = {"ich": "me", "du": "you", "er": "him", "sie": "her", "wir": "us", "ihr": "you (all)", "Sie": "you"}
    ur_for = {"ich": "میرے", "du": "تمہارے", "er": "اس کے", "sie": "اس کے", "wir": "ہمارے", "ihr": "تم سب کے", "Sie": "آپ کے"}
    ur_obj = {"ich": "مجھ", "du": "تم", "er": "اس", "sie": "اس", "wir": "ہم", "ihr": "تم سب", "Sie": "آپ"}
    for t, en_t, ur_t in tpls:
        for p, a in akk_pr.items():
            if "Kennst du" in t and p == "du":
                continue
            if "Ich liebe" in t and p == "ich":
                continue
            de = t.replace("___", a)
            add("akkusativ", de, en_t.format(en=en_obj[p]), ur_t.format(ur=ur_for[p], ur2=ur_obj[p]),
                fill=fill(t, a, options(a, nom_dat[p] + ["mich", "dich", "uns"]),
                          "Akkusativ pronouns: mich, dich, ihn/sie/es, uns, euch, sie/Sie.",
                          "Akkusativ ضمیریں: mich، dich، ihn/sie/es، uns، euch، sie/Sie", cue=f"({'sie (she)' if p == 'sie' else p})"),
                rule="akk-pron", level=2, key=f"ap:{t}:{p}")


# =========================================================================
# 11. Dativ (optional)
# =========================================================================
def gen_dativ():
    people = [N[x] for x in ["Mann", "Frau", "Kind", "Bruder", "Schwester", "Vater", "Mutter", "Freund", "Freundin", "Lehrer", "Lehrerin", "Oma", "Opa"]]
    # helfen / danken / antworten
    for verb_, en_v, ur_f in [("helfen", "help", lambda s, o: f"{s['ur']} {o} کی مدد کر{s['T']}۔"),
                              ("danken", "thank", lambda s, o: f"{s['ur']} {o} کا شکریہ ادا کر{s['T']}۔"),
                              ("antworten", "answer", lambda s, o: f"{s['ur']} {o} کو جواب دی{s['T']}۔")]:
        for n in people:
            for det in ["def", "poss"]:
                sk = rng.choice(["ich", "du", "wir", "er", "sie", "Sie"])
                s = SUBJECTS[sk]
                pde = s["pde"] if det == "poss" else None
                g = n["g"]
                a = article(det, "dat", g, pde)
                vf = present(verb_, s["p"])
                de = cap(f"{s['de']} {vf} {a} {n['lemma']}.")
                en = f"{s['en']} {en_present(verb_, s)} {en_np(n, det, pen=s['pen'])}"
                o = ur_np(n, det, oblique=True, possessor=sk if det == "poss" else None, subj_key=sk, demonstrative=True)
                add("dativ", de, en, ur_f(s, o),
                    fill=fill(cap(f"{s['de']} {vf} ___ {n['lemma']}."), a, art_options(det, "dat", g, pde),
                              f"{verb_} + Dativ (to whom?). In Dativ everything changes: der → dem, die → der, das → dem, plural → den (+n). {ART_OF[g]} → {a}.",
                              f"{verb_} کے ساتھ Dativ آتا ہے (کس کو؟)۔ Dativ میں سب بدلتا ہے: der → dem، die → der، das → dem، Plural → den",
                              cue=f"({pde})" if pde else ""),
                    pick=options(de, [cap(f"{s['de']} {vf} {x} {n['lemma']}.") for x in art_options(det, "dat", g, pde)[1:4]]),
                    rule="dat-verb", level=2)
    # plural Dativ +n
    for n in [N["Kind"], N["Freund"], N["Eltern"]]:
        f = noun_form(n, "dat", True)
        de = f"Ich helfe den {f}."
        add("dativ", de, f"I help the {n['en_pl']}.", f"میں {n['ur_pl_obl']} کی مدد کرتا ہوں۔",
            fill=fill(f"Ich helfe den ___.", f, options(f, [n["pl"], n["lemma"], n["pl"] + "s" if not n["pl"].endswith("n") else n["lemma"] + "en"]),
                      "Dativ plural: den + noun + -n (die Kinder → den Kindern).", "Dativ Plural میں اسم کے آخر میں ‎-n لگتا ہے: den Kindern"),
            rule="dat-plural", level=2, key="dp:" + n["lemma"])
    # gefallen / schmecken / gehören
    dat_pr = {"ich": "mir", "du": "dir", "er": "ihm", "sie": "ihr", "wir": "uns", "ihr": "euch", "Sie": "Ihnen", "sie_pl": "ihnen"}
    akk_pr = {"ich": "mich", "du": "dich", "er": "ihn", "sie": "sie", "wir": "uns", "ihr": "euch", "Sie": "Sie", "sie_pl": "sie"}
    things = [N[x] for x in ["Wohnung", "Buch", "Jacke", "Handy", "Bild", "Uhr", "Computer", "Auto"]]
    for n in things:
        for p in sample(list(dat_pr), 3):
            s = SUBJECTS[p]
            d = dat_pr[p]
            vf = "gefällt"
            de = f"{cap(DEF['nom'][n['g']])} {n['lemma']} {vf} {d}."
            en_subj = {"ich": "I", "du": "you", "er": "he", "sie": "she", "wir": "we", "ihr": "you (all)", "Sie": "you", "sie_pl": "they"}[p]
            en = f"{en_subj} like{'s' if p in ('er', 'sie') else ''} the {n['en']}"
            ur = f"{s['ko']} {n['ur']} پسند ہے۔"
            add("dativ", de, en, ur,
                fill=fill(f"{cap(DEF['nom'][n['g']])} {n['lemma']} {vf} ___.", d, options(d, [akk_pr[p], s["de"] if p != "sie_pl" else "sie", "mich" if d != "mir" else "ich"]),
                          "gefallen + Dativ: the thing is the subject, the person is in Dativ: Die Wohnung gefällt mir (= I like the flat).",
                          "gefallen کے ساتھ شخص Dativ میں آتا ہے: Die Wohnung gefällt mir = مجھے فلیٹ پسند ہے۔",
                          cue=f"({'sie (she)' if p == 'sie' else 'sie (they)' if p == 'sie_pl' else p})"),
                rule="dat-pron", level=2)
    for n in [N["Kuchen"], N["Pizza"], N["Tee"], N["Brot"], N["Apfel"]]:
        for p in ["ich", "du", "wir"]:
            s = SUBJECTS[p]
            d = dat_pr[p]
            de = f"{cap(DEF['nom'][n['g']])} {n['lemma']} schmeckt {d}."
            lag = "لگتی" if n["ur_g"] == "f" else "لگتا"
            add("dativ", de, f"The {n['en']} tastes good to {'me' if p == 'ich' else 'you' if p == 'du' else 'us'}.",
                f"{s['ko']} {n['ur']} مزے دار {lag} ہے۔",
                fill=fill(f"{cap(DEF['nom'][n['g']])} {n['lemma']} schmeckt ___.", d, options(d, [akk_pr[p], s["de"], "mein"]),
                          "schmecken + Dativ: Das schmeckt mir.", "schmecken کے ساتھ Dativ: Das schmeckt mir = مجھے مزے دار لگتا ہے۔", cue=f"({p})"),
                rule="dat-pron", level=2)
    for thing in [N["Handy"], N["Buch"], N["Auto"], N["Uhr"], N["Fahrrad"]]:
        for owner in [N["Bruder"], N["Schwester"], N["Vater"], N["Mutter"]]:
            a = article("poss", "dat", owner["g"], "mein")
            de = f"{cap(DEF['nom'][thing['g']])} {thing['lemma']} gehört {a} {owner['lemma']}."
            ka = "کی" if thing["ur_g"] == "f" else "کا"
            ur = f"یہ {thing['ur']} {ur_poss('میر', owner['ur_g'], True)} {owner['ur_obl']} {ka} ہے۔"
            add("dativ", de, f"The {thing['en']} belongs to my {owner['en']}.", ur,
                fill=fill(f"{cap(DEF['nom'][thing['g']])} {thing['lemma']} gehört ___ {owner['lemma']}.", a, art_options("poss", "dat", owner["g"], "mein"),
                          f"gehören + Dativ: mein → {a} ({GENDER_NAME[owner['g']]}).", "gehören کے ساتھ Dativ: meinem (der/das)، meiner (die)", cue="(mein)"),
                rule="dat-verb", level=2)
    # geben / schenken / zeigen / bringen: Dativ person + Akkusativ thing
    gifts = [N[x] for x in ["Buch", "Uhr", "Handy", "Jacke", "Bild", "Kuchen", "Apfel", "Geschenk"]]
    for verb_, ur_f in [("schenken", lambda s, r, o: f"{s['ur']} {r} کو {o} تحفے میں دی{s['T']}۔"),
                        ("geben", lambda s, r, o: f"{s['ur']} {r} کو {o} دی{s['T']}۔"),
                        ("zeigen", lambda s, r, o: f"{s['ur']} {r} کو {o} دکھا{s['T']}۔"),
                        ("bringen", lambda s, r, o: f"{s['ur']} {r} کے لیے {o} لا{s['T']}۔")]:
        for r in sample(people, 6):
            o = rng.choice(gifts)
            sk = rng.choice(["ich", "wir", "er", "sie"])
            s = SUBJECTS[sk]
            pde = s["pde"]
            ad = article("poss", "dat", r["g"], pde)
            ao = article("indef", "akk", o["g"])
            vf = present(verb_, s["p"])
            de = cap(f"{s['de']} {vf} {ad} {r['lemma']} {ao} {o['lemma']}.")
            en_v = "give" if verb_ in ("geben", "schenken") else V[verb_]["en"]
            en = f"{s['en']} {en_v + ('s' if s['s3'] else '')} {s['pen']} {r['en']} {en_np(o, 'indef')}"
            ur = ur_f(s, ur_np(r, "poss", oblique=True, possessor=sk, subj_key=sk), ur_np(o, "indef"))
            add("dativ", de, en, ur,
                fill=fill(cap(f"{s['de']} {vf} ___ {r['lemma']} {ao} {o['lemma']}."), ad, art_options("poss", "dat", r["g"], pde),
                          f"{verb_}: the PERSON is Dativ (wem? to whom), the THING is Akkusativ (was?). {pde} → {ad}.",
                          f"{verb_} میں شخص Dativ میں (کس کو؟) اور چیز Akkusativ میں (کیا؟) آتی ہے۔", cue=f"({pde})"),
                rule="dat-akk", level=3)
    # Dativ prepositions
    prep_items = []
    for v_ in [N["Bus"], N["Zug"], N["Auto"], N["Fahrrad"]]:
        a = DEF["dat"][v_["g"]]
        prep_items.append(("mit", f"Ich fahre mit {a} {v_['lemma']}.", f"Ich fahre mit ___ {v_['lemma']}.", a,
                           art_options("def", "dat", v_["g"]), f"I go by {v_['en']}.", f"میں {v_['ur']} سے جاتا ہوں۔"))
    for p in [N["Freund"], N["Freundin"], N["Bruder"], N["Schwester"]]:
        a = article("poss", "dat", p["g"], "mein")
        prep_items.append(("mit", f"Ich gehe mit {a} {p['lemma']} ins Kino.", f"Ich gehe mit ___ {p['lemma']} ins Kino. (mein)", a,
                           art_options("poss", "dat", p["g"], "mein"), f"I go to the cinema with my {p['en']}.",
                           f"میں {ur_np(p, 'poss', True, possessor='ich', subj_key='ich')} کے ساتھ سنیما جاتا ہوں۔"))
    prep_items += [
        ("bei", "Ich wohne bei meinen Eltern.", "Ich wohne bei ___ Eltern. (mein)", "meinen", ["meinen", "meine", "meiner", "meinem"], "I live with my parents.", "میں اپنے والدین کے ساتھ رہتا ہوں۔"),
        ("bei", "Er ist bei dem Arzt.", "Er ist bei ___ Arzt.", "dem", ["dem", "den", "der", "das"], "He is at the doctor's.", "وہ ڈاکٹر کے پاس ہے۔"),
        ("aus", "Ich komme aus der Türkei.", "Ich komme aus ___ Türkei.", "der", ["der", "die", "den", "dem"], "I come from Turkey.", "میں ترکی سے ہوں۔"),
        ("aus", "Sie kommt aus der Schweiz.", "Sie kommt aus ___ Schweiz.", "der", ["der", "die", "den", "dem"], "She comes from Switzerland.", "وہ سوئٹزرلینڈ سے ہے۔"),
        ("aus", "Er kommt aus dem Iran.", "Er kommt aus ___ Iran.", "dem", ["dem", "den", "der", "die"], "He comes from Iran.", "وہ ایران سے ہے۔"),
        ("aus", "Olivia kommt aus den USA.", "Olivia kommt aus ___ USA.", "den", ["den", "die", "der", "dem"], "Olivia comes from the USA.", "اولیویا امریکہ سے ہے۔"),
        ("zu", "Ich gehe zu dem Arzt.", "Ich gehe zu ___ Arzt.", "dem", ["dem", "den", "der", "die"], "I am going to the doctor.", "میں ڈاکٹر کے پاس جاتا ہوں۔"),
        ("zu", "Wir gehen zu meiner Oma.", "Wir gehen zu ___ Oma. (mein)", "meiner", ["meiner", "meine", "meinem", "meinen"], "We are going to my grandma's.", "ہم اپنی دادی کے پاس جاتے ہیں۔"),
        ("zu", "Die Kinder gehen zu der Schule.", "Die Kinder gehen zu ___ Schule.", "der", ["der", "die", "den", "dem"], "The children go to school.", "بچے اسکول جاتے ہیں۔"),
        ("von", "Das Geschenk ist von meiner Schwester.", "Das Geschenk ist von ___ Schwester. (mein)", "meiner", ["meiner", "meine", "meinen", "meinem"], "The present is from my sister.", "یہ تحفہ میری بہن کی طرف سے ہے۔"),
        ("von", "Das Geschenk ist von meinem Vater.", "Das Geschenk ist von ___ Vater. (mein)", "meinem", ["meinem", "meinen", "mein", "meiner"], "The present is from my father.", "یہ تحفہ میرے ابو کی طرف سے ہے۔"),
        ("seit", "Ich lerne seit einem Monat Deutsch.", "Ich lerne seit ___ Monat Deutsch.", "einem", ["einem", "einen", "ein", "einer"], "I have been learning German for a month.", "میں ایک مہینے سے جرمن سیکھ رہا ہوں۔"),
        ("seit", "Ich lerne seit einer Woche Deutsch.", "Ich lerne seit ___ Woche Deutsch.", "einer", ["einer", "eine", "einem", "einen"], "I have been learning German for a week.", "میں ایک ہفتے سے جرمن سیکھ رہا ہوں۔"),
        ("seit", "Wir wohnen seit einem Jahr in Berlin.", "Wir wohnen seit ___ Jahr in Berlin.", "einem", ["einem", "ein", "einen", "einer"], "We have been living in Berlin for a year.", "ہم ایک سال سے برلن میں رہ رہے ہیں۔"),
    ]
    contraction = {("bei", "dem"): "beim", ("zu", "dem"): "zum", ("zu", "der"): "zur", ("von", "dem"): "vom"}
    for prep, de, text, ans, opts, en, ur in prep_items:
        c = contraction.get((prep, ans))
        extra = f" Short form: {prep} {ans} = {c}." if c else ""
        add("dativ", de, en, ur,
            fill=fill(text, ans, opts,
                      f"{prep} ALWAYS takes Dativ (mit, bei, von, aus, zu, nach, seit).{extra}",
                      f"{prep} کے بعد ہمیشہ Dativ آتا ہے (mit، bei، von، aus، zu، nach، seit)۔" + (f" مختصر: {c}" if c else "")),
            rule="dat-praep", level=2)
        # preposition choice: only one case fits the article
        words = de[:-1].split(" ")
        if prep in words:
            blank = de.replace(f" {prep} ", " ___ ", 1)
            add("dativ", de, en, ur,
                fill=fill(blank, prep, options(prep, ["für", "ohne", "durch", "gegen"]),
                          f"The article ({ans}) is Dativ → you need a Dativ preposition: {prep}. für/ohne/durch/gegen take Akkusativ.",
                          f"Article ({ans}) Dativ میں ہے، اس لیے Dativ والا حرف جار ({prep}) آئے گا۔ für/ohne/durch Akkusativ لیتے ہیں۔"),
                rule="praep-kasus", level=3, key=de + "#prep")
    # Dativ pronouns
    tpls = [("Kannst du ___ helfen?", "Can you help {en}?", "کیا تم {ur} مدد کر سکتے ہو؟", ["ich", "er", "sie", "wir"]),
            ("Wie geht es ___?", "How are {en2}?", "{ur2} کیسے ہیں؟", ["du", "Sie", "ihr"]),
            ("Ich danke ___.", "I thank {en}.", "میں {ur} شکریہ ادا کرتا ہوں۔", ["du", "Sie", "ihr", "er"])]
    en_obj = {"ich": "me", "du": "you", "er": "him", "sie": "her", "wir": "us", "ihr": "you (all)", "Sie": "you"}
    ur_ki = {"ich": "میری", "du": "تمہاری", "er": "اس کی", "sie": "اس کی", "wir": "ہماری", "ihr": "تم سب کی", "Sie": "آپ کی"}
    ur_ka = {"ich": "میرا", "du": "تمہارا", "er": "اس کا", "sie": "اس کا", "wir": "ہمارا", "ihr": "تم سب کا", "Sie": "آپ کا"}
    ur_hal = {"du": "تم", "Sie": "آپ", "ihr": "تم سب"}
    for t, en_t, ur_t, ps in tpls:
        for p in ps:
            d = dat_pr[p]
            de = t.replace("___", d)
            ur = ur_t.format(ur=ur_ki[p] if "helfen" in t else ur_ka[p], ur2=ur_hal.get(p, ""))
            en = en_t.format(en=en_obj[p], en2=en_obj[p] if p != "ihr" else "you all")
            add("dativ", de, en, ur,
                fill=fill(t, d, options(d, [akk_pr[p], SUBJECTS[p]["de"] if p in SUBJECTS else p, "mich" if d != "mir" else "dich"]),
                          "Dativ pronouns: mir, dir, ihm/ihr/ihm, uns, euch, ihnen/Ihnen.",
                          "Dativ ضمیریں: mir، dir، ihm/ihr، uns، euch، ihnen/Ihnen", cue=f"({'sie (she)' if p == 'sie' else p})"),
                rule="dat-pron", level=2, key=f"dpr:{t}:{p}")


# =========================================================================
# 12. Wechselpräpositionen (optional): Wo? + Dativ / Wohin? + Akkusativ
# =========================================================================
PLACE = {  # prep: (en, ur postposition, allowed places for small things, for furniture)
    "auf": ("on", "پر", ["Tisch", "Bett", "Sofa", "Regal", "Stuhl", "Schrank"], []),
    "in": ("in", "میں", ["Tasche", "Schrank", "Regal", "Kühlschrank"], ["Flur", "Küche", "Wohnzimmer", "Zimmer"]),
    "unter": ("under", "کے نیچے", ["Tisch", "Bett", "Sofa", "Stuhl"], []),
    "neben": ("next to", "کے ساتھ", ["Computer", "Lampe", "Bett", "Fernseher"], ["Bett", "Sofa", "Tür", "Fenster", "Schrank"]),
    "vor": ("in front of", "کے سامنے", [], ["Fenster", "Tür", "Sofa"]),
    "hinter": ("behind", "کے پیچھے", [], ["Tür", "Sofa"]),
}
CONTR = {("in", "dem"): "im", ("in", "das"): "ins", ("an", "dem"): "am", ("an", "das"): "ans"}


def gen_wechsel():
    small = [N[x] for x in ["Buch", "Handy", "Schlüssel", "Stift", "Zeitung", "Flasche", "Lampe", "Jacke", "Uhr"]]
    furn = [N[x] for x in ["Stuhl", "Tisch", "Lampe", "Sofa", "Regal", "Schrank", "Fernseher", "Bett", "Computer"]]
    combos = []
    for prep, (p_en, p_ur, sp, fp) in PLACE.items():
        for o in small:
            for pl in sp:
                if pl != o["lemma"]:
                    combos.append((o, prep, N[pl]))
        for o in furn:
            for pl in fp:
                if pl != o["lemma"]:
                    combos.append((o, prep, N[pl]))
    rng.shuffle(combos)
    for o, prep, pl in combos[:70]:
        upright = "upright" in o["kinds"] or "furniture" in o["kinds"]
        act, pos = ("stellen", "stehen") if upright else ("legen", "liegen")
        p_en, p_ur = PLACE[prep][0], PLACE[prep][1]
        place_ur = f"{pl['ur_obl']} {p_ur}"
        sk = rng.choice(["ich", "wir", "er", "sie", "du"])
        s = SUBJECTS[sk]
        # Wohin? -> Akkusativ (movement)
        a_obj = DEF["akk"][o["g"]]
        a_pl = DEF["akk"][pl["g"]]
        vf = present(act, s["p"])
        de_akk = cap(f"{s['de']} {vf} {a_obj} {o['lemma']} {prep} {a_pl} {pl['lemma']}.")
        en_akk = f"{s['en']} {V[act]['en3'] if s['s3'] else V[act]['en']} the {o['en']} {'into' if prep == 'in' else p_en} the {pl['en']}"
        ur_akk = f"{s['ur']} {o['ur']} {place_ur} رکھ{s['T']}۔"
        c = CONTR.get((prep, a_pl))
        add("wechsel", de_akk, en_akk, ur_akk,
            fill=fill(cap(f"{s['de']} {vf} {a_obj} {o['lemma']} {prep} ___ {pl['lemma']}."), a_pl, art_options("def", "akk", pl["g"]),
                      f"{act} = movement → Wohin? → Akkusativ: {ART_OF[pl['g']]} {pl['lemma']} → {prep} {a_pl} {pl['lemma']}." + (f" Short: {c}." if c else ""),
                      f"{act} میں حرکت ہے → Wohin؟ (کہاں کو) → Akkusativ۔" + (f" مختصر: {c}" if c else "")),
            rule="wohin-akk", level=3)
        # Wo? -> Dativ (position)
        a_nom = DEF["nom"][o["g"]]
        a_dat = DEF["dat"][pl["g"]]
        vf2 = present(pos, "3s")
        de_dat = f"{cap(a_nom)} {o['lemma']} {vf2} {prep} {a_dat} {pl['lemma']}."
        en_dat = f"The {o['en']} is {'standing' if pos == 'stehen' else 'lying'} {p_en} the {pl['en']}"
        rk = ("رکھی" if o["ur_g"] == "f" else "رکھا") if pos == "stehen" else ("پڑی" if o["ur_g"] == "f" else "پڑا")
        ur_dat = f"{o['ur']} {place_ur} {rk} ہے۔"
        c2 = CONTR.get((prep, a_dat))
        add("wechsel", de_dat, en_dat, ur_dat,
            fill=fill(f"{cap(a_nom)} {o['lemma']} {vf2} {prep} ___ {pl['lemma']}.", a_dat, art_options("def", "dat", pl["g"]),
                      f"{pos} = position, no movement → Wo? → Dativ: {ART_OF[pl['g']]} {pl['lemma']} → {prep} {a_dat} {pl['lemma']}." + (f" Short: {c2}." if c2 else ""),
                      f"{pos} میں حرکت نہیں → Wo؟ (کہاں) → Dativ۔" + (f" مختصر: {c2}" if c2 else "")),
            rule="wo-dat", level=3)
        # verb choice: action vs position
        add("wechsel", de_akk, en_akk, ur_akk,
            fill=fill(cap(f"{s['de']} ___ {a_obj} {o['lemma']} {prep} {a_pl} {pl['lemma']}."), vf,
                      options(vf, [present(pos, s["p"]), present(act, "3s" if s["p"] != "3s" else "1s"), present(pos, "3s" if s["p"] != "3s" else "1s")]),
                      f"{act} (to put, movement + Akkusativ) vs {pos} (to be there, Dativ). “{a_pl} {pl['lemma']}” is Akkusativ → {act}.",
                      f"{act} = رکھنا (حرکت، Akkusativ)، {pos} = موجود ہونا (Dativ)۔"),
            rule="stellen-stehen", level=3, key=de_akk + "#verb")
        # Wo or Wohin?
        add("wechsel", de_dat, en_dat, ur_dat,
            fill=fill(f"{de_dat}\nWo? or Wohin?", "Wo? → Dativ", ["Wo? → Dativ", "Wohin? → Akkusativ"],
                      f"{pos} describes a position (no movement) → Wo? → Dativ.", "حرکت نہیں → Wo؟ → Dativ"),
            rule="wo-wohin", level=2, key=de_dat + "#wo")
        add("wechsel", de_akk, en_akk, ur_akk,
            fill=fill(f"{de_akk}\nWo? or Wohin?", "Wohin? → Akkusativ", ["Wohin? → Akkusativ", "Wo? → Dativ"],
                      f"{act} describes a movement to a place → Wohin? → Akkusativ.", "حرکت ہے → Wohin؟ → Akkusativ"),
            rule="wo-wohin", level=2, key=de_akk + "#wo")
    for de, text, ans, opts, en, ur, why, why_ur in [
        ("Ich stelle die Lampe zwischen das Sofa und den Schrank.", "Ich stelle die Lampe zwischen ___ Sofa und den Schrank.", "das", ["das", "dem", "den", "der"],
         "I put the lamp between the sofa and the cupboard.", "میں لیمپ صوفے اور الماری کے درمیان رکھتا ہوں۔", "stellen → Wohin? → Akkusativ: das Sofa → das Sofa", "حرکت → Akkusativ"),
        ("Die Lampe steht zwischen dem Sofa und dem Schrank.", "Die Lampe steht zwischen dem Sofa und ___ Schrank.", "dem", ["dem", "den", "der", "das"],
         "The lamp is between the sofa and the cupboard.", "لیمپ صوفے اور الماری کے درمیان رکھا ہے۔", "stehen → Wo? → Dativ: der Schrank → dem Schrank", "حرکت نہیں → Dativ"),
        ("Das Bild hängt an der Wand.", "Das Bild hängt an ___ Wand.", "der", ["der", "die", "den", "dem"],
         "The picture is hanging on the wall.", "تصویر دیوار پر لٹکی ہوئی ہے۔", "an + Wo? → Dativ: die Wand → an der Wand", "حرکت نہیں → Dativ: die → der"),
        ("Ich hänge das Bild an die Wand.", "Ich hänge das Bild an ___ Wand.", "die", ["die", "der", "den", "dem"],
         "I hang the picture on the wall.", "میں تصویر دیوار پر لٹکاتا ہوں۔", "an + Wohin? → Akkusativ: die Wand → an die Wand", "حرکت → Akkusativ: die → die"),
        ("Wir gehen in die Küche.", "Wir gehen in ___ Küche.", "die", ["die", "der", "den", "dem"],
         "We go into the kitchen.", "ہم باورچی خانے میں جاتے ہیں۔", "gehen in = movement → Akkusativ", "حرکت → Akkusativ"),
        ("Wir sind in der Küche.", "Wir sind in ___ Küche.", "der", ["der", "die", "den", "dem"],
         "We are in the kitchen.", "ہم باورچی خانے میں ہیں۔", "sein in = position → Dativ: die → der", "حرکت نہیں → Dativ: die → der"),
    ]:
        add("wechsel", de, en, ur, fill=fill(text, ans, opts, why, why_ur), rule="wechsel", level=3)


# =========================================================================
def main():
    gen_konjugation()
    gen_wortstellung()
    gen_pronomen()
    gen_artikel()
    gen_modal()
    gen_trennbar()
    gen_vergangenheit()
    gen_zahlen()
    gen_uhrzeit()
    gen_wortbildung()
    gen_redemittel()
    gen_akkusativ()
    gen_dativ()
    gen_wechsel()

    topics = {}
    for it in ITEMS:
        t = topics.setdefault(it["topic"], {"count": 0, "fill": 0, "order": 0, "pick": 0})
        t["count"] += 1
        for k in ("fill", "order", "pick"):
            if k in it:
                t[k] += 1
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"items": ITEMS}, ensure_ascii=False, indent=0), encoding="utf-8")
    print(f"Wrote {len(ITEMS)} items -> {OUT}")
    for k, t in topics.items():
        print(f"  {k:14} {t['count']:4} items  (fill {t['fill']}, order {t['order']}, pick {t['pick']})")


if __name__ == "__main__":
    main()
