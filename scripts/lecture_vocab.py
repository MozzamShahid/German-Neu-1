"""
Adds the vocabulary from the lecture notes (Week 2 – Week 13) to vocab.json
as "Kapitel 13 – Unterricht", with Urdu meanings.

Entries go through the same parser as the book glossary (parse_row), so
articles, plurals, verb forms, article rules and word families work the same.
Words marked with * are the ones the teacher stressed (counted as important).

Usage: python scripts/lecture_vocab.py   (run after parse_glossary.py)
"""

import json
from dataclasses import asdict, fields

from parse_glossary import OUT, Entry, Row, Seg, build_helpers, parse_row

CHAPTER = 13
TITLE = "Unterricht (Lecture notes)"

# topic -> [(german headword as in the glossary, english, urdu)], "*" = important
WORDS = {
    "Woche 2–4: Fragen, Zahlen, Beruf": [
        ("*die Überschrift, -en", "heading", "سرخی"),
        ("die Lücke, -n", "gap", "خالی جگہ"),
        ("*die Freizeitaktivität, -en", "free-time activity", "فارغ وقت کی سرگرمی"),
        ("*das Leben (Sg.)", "life", "زندگی"),
        ("die Lebenserfahrung, -en", "life experience", "زندگی کا تجربہ"),
        ("*die Erfahrung, -en", "experience", "تجربہ"),
        ("die Endung, -en", "ending", "آخری حصہ"),
        ("*lieben", "to love", "محبت کرنا"),
        ("*leben", "to live", "زندگی گزارنا"),
        ("*der Vormittag, -e", "late morning (9–12)", "دوپہر سے پہلے"),
        ("*der Nachmittag, -e", "afternoon", "سہ پہر"),
        ("der Mittag, -e", "noon", "دوپہر"),
        ("*verkaufen", "to sell", "بیچنا"),
        ("der Käufer, -", "buyer", "خریدار"),
        ("*der Verkäufer, -", "seller", "بیچنے والا"),
        ("*arbeitslos", "unemployed", "بے روزگار"),
        ("*kostenlos", "free of charge", "مفت"),
        ("sinnlos", "pointless", "بے مقصد"),
        ("untersuchen", "to examine", "معائنہ کرنا"),
        ("behandeln", "to treat", "علاج کرنا"),
        ("*das Formular, -e", "form", "فارم"),
        ("*ergänzen", "to complete", "مکمل کرنا"),
        ("*das Geburtsdatum, Geburtsdaten", "date of birth", "تاریخ پیدائش"),
        ("*der Geburtsort, -e", "place of birth", "جائے پیدائش"),
        ("das Geschlecht, -er", "gender", "جنس"),
        ("*die Aussprache, -n", "pronunciation", "تلفظ"),
        ("aus|sprechen, er spricht aus, hat ausgesprochen", "to pronounce", "تلفظ ادا کرنا"),
        ("*bedeuten", "to mean", "مطلب ہونا"),
        ("*buchstabieren", "to spell", "ہجے کرنا"),
        ("*das Gespräch, -e", "conversation", "گفتگو"),
        ("fast richtig", "almost correct", "تقریباً صحیح"),
    ],
    "Woche 5: Stadt, Präsentation, Wetter": [
        ("*die Stunde, -n", "hour", "گھنٹہ"),
        ("*die Minute, -n", "minute", "منٹ"),
        ("die Sekunde, -n", "second", "سیکنڈ"),
        ("*bekannt", "well-known", "مشہور"),
        ("*der Bahnhof, \"-e", "train station", "ریلوے اسٹیشن"),
        ("der Hafen, \"-", "port", "بندرگاہ"),
        ("*der Fluss, \"-e", "river", "دریا"),
        ("der Turm, \"-e", "tower", "مینار"),
        ("*hoch", "high, tall", "اونچا"),
        ("*dort", "there", "وہاں"),
        ("bauen", "to build", "تعمیر کرنا"),
        ("der Besucher, -", "visitor", "ملاقاتی"),
        ("die Ausstellung, -en", "exhibition", "نمائش"),
        ("*die Aufgabe, -n", "task", "کام"),
        ("präsentieren", "to present", "پیش کرنا"),
        ("die Folie, -n", "slide", "سلائیڈ"),
        ("die Aufmerksamkeit (Sg.)", "attention", "توجہ"),
        ("*die Verspätung, -en", "delay", "تاخیر"),
        ("*der Weg, -e", "way", "راستہ"),
        ("*der Ort, -e", "place", "جگہ"),
        ("*das Rathaus, \"-er", "town hall", "ٹاؤن ہال"),
        ("die Kirche, -n", "church", "گرجا گھر"),
        ("*schön", "beautiful", "خوبصورت"),
        ("*schon", "already", "پہلے ہی"),
        ("ach so", "oh, I see (unexpected)", "اچھا، یہ بات ہے"),
        ("*links", "left", "بائیں"),
        ("*rechts", "right", "دائیں"),
        ("*geradeaus", "straight ahead", "سیدھا"),
        ("*das Wetter (Sg.)", "weather", "موسم"),
        ("*kalt", "cold", "ٹھنڈا"),
        ("*heiß", "hot", "گرم"),
        ("neblig", "foggy", "دھند والا"),
        ("regnerisch", "rainy", "بارش والا"),
        ("windig", "windy", "ہوا دار"),
        ("*sonnig", "sunny", "دھوپ والا"),
        ("angenehm", "pleasant", "خوشگوار"),
        ("unangenehm", "unpleasant", "ناخوشگوار"),
        ("*gestern", "yesterday", "کل (گزرا ہوا)"),
        ("*heute", "today", "آج"),
        ("*morgen", "tomorrow", "کل (آنے والا)"),
        ("übermorgen", "the day after tomorrow", "پرسوں (آنے والا)"),
        ("vorgestern", "the day before yesterday", "پرسوں (گزرا ہوا)"),
        ("*jetzt", "now", "اب"),
        ("*kaputt", "broken", "ٹوٹا ہوا"),
    ],
    "Woche 6–7: Essen, Einkaufen, Uhrzeit": [
        ("*die Metzgerei, -en", "butcher's shop", "قصائی کی دکان"),
        ("das Angebot, -e", "offer", "پیشکش"),
        ("der Einkaufswagen, -", "shopping trolley", "شاپنگ ٹرالی"),
        ("*der Einkaufszettel, -", "shopping list", "خریداری کی فہرست"),
        ("*wechseln", "to change", "بدلنا"),
        ("*noch etwas", "anything else", "کچھ اور"),
        ("*die Tüte, -n", "(plastic) bag", "شاپر"),
        ("das Mehl (Sg.)", "flour", "آٹا"),
        ("*schmecken", "to taste", "ذائقہ ہونا"),
        ("gleichfalls", "same to you", "آپ کو بھی"),
        ("*satt", "full (not hungry)", "پیٹ بھرا ہوا"),
        ("die Mahlzeit, -en", "meal", "کھانا"),
        ("*der Alltag (Sg.)", "everyday life", "روزمرہ زندگی"),
        ("*vielleicht", "maybe", "شاید"),
        ("die Mensa, Mensen", "cafeteria", "کینٹین"),
        ("*die Nachricht, -en", "message", "پیغام"),
        ("*duschen", "to shower", "شاور لینا"),
        ("baden", "to have a bath", "ٹب میں نہانا"),
        ("*spazieren gehen", "to go for a walk", "سیر کرنا"),
        ("der Spaziergang, \"-e", "walk", "چہل قدمی"),
        ("*der Wochentag, -e", "weekday", "ہفتے کا دن"),
        ("*das Wochenende, -n", "weekend", "ہفتے کا آخر"),
        ("*die Uhrzeit, -en", "time (of day)", "وقت"),
        ("*früh", "early", "جلدی"),
        ("*spät", "late", "دیر سے"),
    ],
    "Woche 8–9: Modalverben, Gesundheit, Feiern": [
        ("*die Verabredung, -en", "appointment", "ملاقات"),
        ("hinterlassen, er hinterlässt, hat hinterlassen", "to leave (a message)", "چھوڑنا"),
        ("*der Vorteil, -e", "advantage", "فائدہ"),
        ("*der Nachteil, -e", "disadvantage", "نقصان"),
        ("*verdienen", "to earn", "کمانا"),
        ("*verlieren, er verliert, hat verloren", "to lose", "کھونا"),
        ("*erfolgreich", "successful", "کامیاب"),
        ("fröhlich", "cheerful", "خوش"),
        ("*die Prüfung, -en", "exam", "امتحان"),
        ("aus|ruhen (sich)", "to rest", "آرام کرنا"),
        ("*die Schmerzen (Pl.)", "pain", "درد"),
        ("*der Kopf, \"-e", "head", "سر"),
        ("*der Rücken, -", "back", "کمر"),
        ("*der Hals, \"-e", "throat, neck", "گلا"),
        ("*der Zahn, \"-e", "tooth", "دانت"),
        ("*das Ohr, -en", "ear", "کان"),
        ("die Brust, \"-e", "chest", "سینہ"),
        ("die Schulter, -n", "shoulder", "کندھا"),
        ("das Gelenk, -e", "joint", "جوڑ"),
        ("der Muskel, -n", "muscle", "پٹھا"),
        ("*das Bein, -e", "leg", "ٹانگ"),
        ("*die Grippe, -n", "flu", "فلو"),
        ("*das Fieber (Sg.)", "fever", "بخار"),
        ("*das Schmerzmittel, -", "painkiller", "درد کی دوا"),
        ("*die Beschwerde, -n", "complaint, symptom", "تکلیف"),
        ("*der Geburtstag, -e", "birthday", "سالگرہ"),
        ("*die Hochzeit, -en", "wedding", "شادی"),
        ("*feiern", "to celebrate", "جشن منانا"),
        ("klettern", "to climb", "چڑھنا"),
        ("*wandern", "to hike", "پیدل سفر کرنا"),
        ("*glauben", "to believe, to think", "یقین کرنا، سوچنا"),
        ("*die Überraschung, -en", "surprise", "سرپرائز"),
        ("*das Datum, Daten", "date", "تاریخ"),
        ("der Zwilling, -e", "twin", "جڑواں"),
    ],
    "Woche 10–11: Trennbare Verben, Brief, Restaurant": [
        ("*ein|laden, er lädt ein, hat eingeladen", "to invite", "دعوت دینا"),
        ("*die Einladung, -en", "invitation", "دعوت نامہ"),
        ("*ab|holen", "to pick up", "لینے جانا"),
        ("*an|rufen, er ruft an, hat angerufen", "to call (on the phone)", "فون کرنا"),
        ("ein|sammeln", "to collect", "اکٹھا کرنا"),
        ("*auf|stehen, er steht auf, ist aufgestanden", "to get up", "اٹھنا"),
        ("mit|machen", "to take part", "حصہ لینا"),
        ("*der Treffpunkt, -e", "meeting point", "ملنے کی جگہ"),
        ("*der Brief, -e", "letter", "خط"),
        ("*verboten", "forbidden", "ممنوع"),
        ("*erlauben", "to allow", "اجازت دینا"),
        ("*die Bestellung, -en", "order", "آرڈر"),
        ("*bestellen", "to order", "آرڈر کرنا"),
        ("die Schorle, -n", "juice/wine with sparkling water", "سوڈا ملا جوس"),
        ("*die Speisekarte, -n", "menu", "مینو"),
        ("*bezahlen", "to pay", "ادائیگی کرنا"),
        ("*zusammen", "together", "اکٹھے"),
        ("*getrennt", "separately", "الگ الگ"),
        ("*das Trinkgeld, -er", "tip", "بخشش"),
        ("*ungefähr", "approximately", "تقریباً"),
        ("*fertig", "finished, ready", "تیار، مکمل"),
        ("*mit|nehmen, er nimmt mit, hat mitgenommen", "to take along", "ساتھ لے جانا"),
        ("an|nehmen, er nimmt an, hat angenommen", "to accept", "قبول کرنا"),
        ("die Reihenfolge, -n", "order, sequence", "ترتیب"),
        ("*die Anzeige, -n", "advertisement", "اشتہار"),
    ],
    "Woche 13: Wohnung, Beruf, Perfekt": [
        ("*die Möbel (Pl.)", "furniture", "فرنیچر"),
        ("*das Gerät, -e", "device", "آلہ"),
        ("*der Lieblingsort, -e", "favourite place", "پسندیدہ جگہ"),
        ("*die Wohnungssuche (Sg.)", "flat search", "فلیٹ کی تلاش"),
        ("*dunkel", "dark", "اندھیرا"),
        ("*hell", "bright", "روشن"),
        ("*ruhig", "quiet", "پرسکون"),
        ("*fehlen", "to be missing", "غائب ہونا"),
        ("*an|fangen, er fängt an, hat angefangen", "to start", "شروع کرنا"),
        ("*betreuen", "to take care of", "دیکھ بھال کرنا"),
        ("*der Erzieher, -", "educator, carer", "نگہبان، مربی"),
        ("der Segellehrer, -", "sailing teacher", "کشتی رانی کا استاد"),
        ("*der Künstler, -", "artist", "فنکار"),
        ("*der Kellner, -", "waiter", "ویٹر"),
        ("*reden", "to talk (one-way, e.g. a presentation)", "بات کرنا، تقریر کرنا"),
        ("*neugierig", "curious", "متجسس"),
        ("eilig", "in a hurry", "جلدی میں"),
        ("unregelmäßig", "irregular", "بے قاعدہ"),
        ("*passieren, es passiert, ist passiert", "to happen", "واقع ہونا"),
        ("*draußen", "outside", "باہر"),
        ("*das Geld (Sg.)", "money", "پیسہ"),
        ("*holen", "to fetch", "لانا"),
        ("*planen", "to plan", "منصوبہ بنانا"),
    ],
}


def main():
    data = json.loads(OUT.read_text(encoding="utf-8"))
    names = {f.name for f in fields(Entry)}
    entries = [Entry(**{k: v for k, v in e.items() if k in names})
               for e in data["entries"] if e["chapter"] != CHAPTER]

    added = 0
    for i, (topic, words) in enumerate(WORDS.items()):
        for german, en, ur in words:
            important = german.startswith("*")
            german = german.lstrip("*")
            row = Row(CHAPTER, TITLE, f"W{i + 1}", topic, 0,
                      de=[Seg(german, important, False)], en=[Seg(en, False, False)])
            e = parse_row(row, len(entries))
            if e is None:
                print("skipped:", german)
                continue
            e.ur = ur
            entries.append(e)
            added += 1

    for idx, e in enumerate(entries):
        e.id = idx
    build_helpers(entries)

    chapters = [c for c in data["chapters"] if c["id"] != CHAPTER]
    chapters.append({"id": CHAPTER, "title": TITLE})
    for c in chapters:
        es = [e for e in entries if e.chapter == c["id"]]
        c["count"] = len(es)
        c["nouns"] = sum(1 for e in es if e.pos == "noun" and e.article in ("der", "die", "das"))
        c["verbs"] = sum(1 for e in es if e.pos == "verb")
        c["important"] = sum(1 for e in es if e.important)
    data["chapters"] = sorted(chapters, key=lambda c: c["id"])
    data["entries"] = [asdict(e) for e in entries]
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    c = data["chapters"][-1]
    print(f"Added {added} lecture words as Kapitel {CHAPTER} "
          f"({c['nouns']} nouns, {c['verbs']} verbs, {c['important']} important)")


if __name__ == "__main__":
    main()
