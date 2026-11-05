"""
Lexicon for the sentence generator: everyday A1 nouns, verbs and subjects with
German grammar data, English and Urdu (Urdu script) translations.

Urdu notes
- ur_g is the Urdu gender (m/f): it decides میرا/میری, کا/کی, رکھا/رکھی.
- ur_obl is the oblique form used before postpositions (کمرہ -> کمرے میں).
- Urdu verb stems are joined directly to endings: خرید + تا ہوں = خریدتا ہوں.
- Verb forms are masculine by default (کرتا ہوں); 'sie' (she) and Sara use
  feminine forms (کرتی ہے).
"""

# ---------------------------------------------------------------- subjects
SUBJECTS = {
    "ich": dict(de="ich", p="1s", en="I", be="am", have="have", s3=False,
                ur="میں", ko="مجھے", paas="میرے پاس", T="تا ہوں", P="رہا ہوں",
                C="چکا ہوں", tha="تھا", pur="میر", pde="mein", pen="my", f=False),
    "du": dict(de="du", p="2s", en="you", be="are", have="have", s3=False,
               ur="تم", ko="تمہیں", paas="تمہارے پاس", T="تے ہو", P="رہے ہو",
               C="چکے ہو", tha="تھے", pur="تمہار", pde="dein", pen="your", f=False),
    "er": dict(de="er", p="3s", en="he", be="is", have="has", s3=True,
               ur="وہ", ko="اسے", paas="اس کے پاس", T="تا ہے", P="رہا ہے",
               C="چکا ہے", tha="تھا", pur="اس ک", pde="sein", pen="his", f=False),
    "sie": dict(de="sie", p="3s", en="she", be="is", have="has", s3=True,
                ur="وہ", ko="اسے", paas="اس کے پاس", T="تی ہے", P="رہی ہے",
                C="چکی ہے", tha="تھی", pur="اس ک", pde="ihr", pen="her", f=True),
    "wir": dict(de="wir", p="1p", en="we", be="are", have="have", s3=False,
                ur="ہم", ko="ہمیں", paas="ہمارے پاس", T="تے ہیں", P="رہے ہیں",
                C="چکے ہیں", tha="تھے", pur="ہمار", pde="unser", pen="our", f=False),
    "ihr": dict(de="ihr", p="2p", en="you (all)", be="are", have="have", s3=False,
                ur="تم سب", ko="تم سب کو", paas="تم سب کے پاس", T="تے ہو", P="رہے ہو",
                C="چکے ہو", tha="تھے", pur="تم سب ک", pde="euer", pen="your", f=False),
    "sie_pl": dict(de="sie", p="3p", en="they", be="are", have="have", s3=False,
                   ur="وہ", ko="انہیں", paas="ان کے پاس", T="تے ہیں", P="رہے ہیں",
                   C="چکے ہیں", tha="تھے", pur="ان ک", pde="ihr", pen="their", f=False),
    "Sie": dict(de="Sie", p="3p", en="you", be="are", have="have", s3=False,
                ur="آپ", ko="آپ کو", paas="آپ کے پاس", T="تے ہیں", P="رہے ہیں",
                C="چکے ہیں", tha="تھے", pur="آپ ک", pde="Ihr", pen="your", f=False),
    "Ali": dict(de="Ali", p="3s", en="Ali", be="is", have="has", s3=True,
                ur="علی", ko="علی کو", paas="علی کے پاس", T="تا ہے", P="رہا ہے",
                C="چکا ہے", tha="تھا", pur="علی ک", pde="sein", pen="his", f=False, name=True),
    "Sara": dict(de="Sara", p="3s", en="Sara", be="is", have="has", s3=True,
                 ur="سارہ", ko="سارہ کو", paas="سارہ کے پاس", T="تی ہے", P="رہی ہے",
                 C="چکی ہے", tha="تھی", pur="سارہ ک", pde="ihr", pen="her", f=True, name=True),
}
PRONOUN_SUBJECTS = ["ich", "du", "er", "sie", "wir", "ihr", "sie_pl", "Sie"]
MAIN_SUBJECTS = ["ich", "du", "er", "sie", "wir", "Sie", "Ali", "Sara"]

# ---------------------------------------------------------------- nouns
N = {}


def noun(lemma, g, pl, en, en_pl, ur, ur_g, kinds, ur_obl=None, ur_pl=None, ur_pl_obl=None):
    N[lemma] = dict(lemma=lemma, g=g, pl=pl, en=en, en_pl=en_pl, ur=ur,
                    ur_obl=ur_obl or ur, ur_g=ur_g, kinds=set(kinds.split()),
                    ur_pl=ur_pl or ur, ur_pl_obl=ur_pl_obl or ur_pl or ur)


# people
noun("Mann", "m", "Männer", "man", "men", "آدمی", "m", "person")
noun("Frau", "f", "Frauen", "woman", "women", "عورت", "f", "person")
noun("Kind", "n", "Kinder", "child", "children", "بچہ", "m", "person", ur_obl="بچے", ur_pl="بچے", ur_pl_obl="بچوں")
noun("Bruder", "m", "Brüder", "brother", "brothers", "بھائی", "m", "person family")
noun("Schwester", "f", "Schwestern", "sister", "sisters", "بہن", "f", "person family")
noun("Vater", "m", "Väter", "father", "fathers", "ابو", "m", "person family")
noun("Mutter", "f", "Mütter", "mother", "mothers", "امی", "f", "person family")
noun("Freund", "m", "Freunde", "friend", "friends", "دوست", "m", "person", ur_pl_obl="دوستوں")
noun("Freundin", "f", "Freundinnen", "(female) friend", "friends", "سہیلی", "f", "person")
noun("Lehrer", "m", "Lehrer", "teacher", "teachers", "استاد", "m", "person")
noun("Lehrerin", "f", "Lehrerinnen", "(female) teacher", "teachers", "استانی", "f", "person")
noun("Arzt", "m", "Ärzte", "doctor", "doctors", "ڈاکٹر", "m", "person")
noun("Oma", "f", "Omas", "grandma", "grandmas", "دادی", "f", "person family")
noun("Opa", "m", "Opas", "grandpa", "grandpas", "دادا", "m", "person family")
noun("Eltern", "pl", "Eltern", "parents", "parents", "والدین", "m", "person family plonly")
# things
noun("Tisch", "m", "Tische", "table", "tables", "میز", "f", "thing furniture")
noun("Stuhl", "m", "Stühle", "chair", "chairs", "کرسی", "f", "thing furniture upright")
noun("Schrank", "m", "Schränke", "cupboard", "cupboards", "الماری", "f", "thing furniture upright")
noun("Computer", "m", "Computer", "computer", "computers", "کمپیوٹر", "m", "thing upright buy")
noun("Fernseher", "m", "Fernseher", "TV", "TVs", "ٹی وی", "m", "thing upright buy")
noun("Kühlschrank", "m", "Kühlschränke", "fridge", "fridges", "فریج", "m", "thing")
noun("Schlüssel", "m", "Schlüssel", "key", "keys", "چابی", "f", "thing flat small")
noun("Stift", "m", "Stifte", "pen", "pens", "قلم", "m", "thing flat small buy")
noun("Rucksack", "m", "Rucksäcke", "backpack", "backpacks", "بیگ", "m", "thing buy")
noun("Kuchen", "m", "Kuchen", "cake", "cakes", "کیک", "m", "food buy")
noun("Apfel", "m", "Äpfel", "apple", "apples", "سیب", "m", "food buy")
noun("Kaffee", "m", "Kaffees", "coffee", "coffees", "کافی", "f", "drink")
noun("Tee", "m", "Tees", "tea", "teas", "چائے", "f", "drink")
noun("Saft", "m", "Säfte", "juice", "juices", "جوس", "m", "drink")
noun("Bus", "m", "Busse", "bus", "buses", "بس", "f", "vehicle")
noun("Zug", "m", "Züge", "train", "trains", "ٹرین", "f", "vehicle")
noun("Park", "m", "Parks", "park", "parks", "پارک", "m", "area")
noun("Flur", "m", "Flure", "hallway", "hallways", "راہداری", "f", "room")
noun("Balkon", "m", "Balkone", "balcony", "balconies", "بالکونی", "f", "room")
noun("Lampe", "f", "Lampen", "lamp", "lamps", "لیمپ", "m", "thing upright small buy")
noun("Tasche", "f", "Taschen", "bag", "bags", "تھیلا", "m", "thing buy", ur_obl="تھیلے")
noun("Flasche", "f", "Flaschen", "bottle", "bottles", "بوتل", "f", "thing upright small")
noun("Wohnung", "f", "Wohnungen", "flat", "flats", "فلیٹ", "m", "thing")
noun("Küche", "f", "Küchen", "kitchen", "kitchens", "باورچی خانہ", "m", "room", ur_obl="باورچی خانے")
noun("Milch", "f", "-", "milk", "milk", "دودھ", "m", "drink")
noun("Banane", "f", "Bananen", "banana", "bananas", "کیلا", "m", "food buy", ur_obl="کیلے", ur_pl="کیلے")
noun("Pizza", "f", "Pizzas", "pizza", "pizzas", "پیزا", "m", "food buy")
noun("Uhr", "f", "Uhren", "watch", "watches", "گھڑی", "f", "thing buy gift")
noun("Tür", "f", "Türen", "door", "doors", "دروازہ", "m", "thing", ur_obl="دروازے")
noun("Zeitung", "f", "Zeitungen", "newspaper", "newspapers", "اخبار", "m", "thing flat small read")
noun("Jacke", "f", "Jacken", "jacket", "jackets", "جیکٹ", "f", "thing flat buy gift")
noun("Schule", "f", "Schulen", "school", "schools", "اسکول", "m", "area")
noun("Buch", "n", "Bücher", "book", "books", "کتاب", "f", "thing flat small buy gift read")
noun("Handy", "n", "Handys", "mobile phone", "mobile phones", "موبائل", "m", "thing flat small buy gift")
noun("Auto", "n", "Autos", "car", "cars", "گاڑی", "f", "vehicle buy")
noun("Fahrrad", "n", "Fahrräder", "bicycle", "bicycles", "سائیکل", "f", "vehicle buy")
noun("Brot", "n", "Brote", "bread", "breads", "ڈبل روٹی", "f", "food buy")
noun("Wasser", "n", "-", "water", "water", "پانی", "m", "drink")
noun("Bett", "n", "Betten", "bed", "beds", "بستر", "m", "thing furniture")
noun("Sofa", "n", "Sofas", "sofa", "sofas", "صوفہ", "m", "thing furniture upright", ur_obl="صوفے")
noun("Regal", "n", "Regale", "shelf", "shelves", "شیلف", "m", "thing furniture upright")
noun("Fenster", "n", "Fenster", "window", "windows", "کھڑکی", "f", "thing")
noun("Geschenk", "n", "Geschenke", "present", "presents", "تحفہ", "m", "thing gift", ur_obl="تحفے")
noun("Zimmer", "n", "Zimmer", "room", "rooms", "کمرہ", "m", "room", ur_obl="کمرے")
noun("Wohnzimmer", "n", "Wohnzimmer", "living room", "living rooms", "ڈرائنگ روم", "m", "room")
noun("Kino", "n", "Kinos", "cinema", "cinemas", "سنیما", "m", "area")
noun("Bild", "n", "Bilder", "picture", "pictures", "تصویر", "f", "thing gift")
noun("Monat", "m", "Monate", "month", "months", "مہینہ", "m", "time", ur_obl="مہینے")
noun("Woche", "f", "Wochen", "week", "weeks", "ہفتہ", "m", "time", ur_obl="ہفتے")
noun("Jahr", "n", "Jahre", "year", "years", "سال", "m", "time")

# ---------------------------------------------------------------- verbs
# Present tense: either `table` (6 forms: 1s 2s 3s 1p 2p 3p) or regular with an
# optional stem change for du/er (`s23`). pp = Partizip II, aux = haben|sein.
# ur = Urdu verb stem that takes تا/تی/تے endings.
V = {}


def verb(inf, en, en3, en_pp, ur, pp, aux="haben", s23=None, table=None, sep=None, en_ing=None):
    V[inf] = dict(inf=inf, en=en, en3=en3, en_pp=en_pp, ur=ur, pp=pp, aux=aux,
                  s23=s23, table=table, sep=sep,
                  en_ing=en_ing or (en[:-1] + "ing" if en.endswith("e") else en + "ing"))


verb("kaufen", "buy", "buys", "bought", "خرید", "gekauft")
verb("brauchen", "need", "needs", "needed", "-", "gebraucht")
verb("haben", "have", "has", "had", "-", "gehabt", table=["habe", "hast", "hat", "haben", "habt", "haben"])
verb("sein", "be", "is", "been", "-", "gewesen", aux="sein", table=["bin", "bist", "ist", "sind", "seid", "sind"])
verb("möchten", "would like", "would like", "-", "-", "-", table=["möchte", "möchtest", "möchte", "möchten", "möchtet", "möchten"])
verb("mögen", "like", "likes", "liked", "-", "gemocht", table=["mag", "magst", "mag", "mögen", "mögt", "mögen"])
verb("suchen", "look for", "looks for", "looked for", "ڈھونڈ", "gesucht", en_ing="looking for")
verb("sehen", "see", "sees", "seen", "دیکھ", "gesehen", s23="sieh")
verb("essen", "eat", "eats", "eaten", "کھا", "gegessen", s23="iss")
verb("trinken", "drink", "drinks", "drunk", "پی", "getrunken")
verb("nehmen", "take", "takes", "taken", "لی", "genommen", table=["nehme", "nimmst", "nimmt", "nehmen", "nehmt", "nehmen"])
verb("lesen", "read", "reads", "read", "پڑھ", "gelesen", s23="lies")
verb("besuchen", "visit", "visits", "visited", "مل", "besucht")
verb("kochen", "cook", "cooks", "cooked", "پکا", "gekocht")
verb("helfen", "help", "helps", "helped", "-", "geholfen", s23="hilf")
verb("danken", "thank", "thanks", "thanked", "-", "gedankt")
verb("antworten", "answer", "answers", "answered", "-", "geantwortet")
verb("gehören", "belong", "belongs", "belonged", "-", "gehört")
verb("gefallen", "please", "pleases", "pleased", "-", "gefallen", s23="gefäll")
verb("schmecken", "taste", "tastes", "tasted", "-", "geschmeckt")
verb("geben", "give", "gives", "given", "دی", "gegeben", s23="gib")
verb("schenken", "give", "gives", "given", "دی", "geschenkt")
verb("zeigen", "show", "shows", "shown", "دکھا", "gezeigt")
verb("bringen", "bring", "brings", "brought", "لا", "gebracht")
verb("stellen", "put", "puts", "put", "رکھ", "gestellt", en_ing="putting")
verb("stehen", "stand", "stands", "stood", "-", "gestanden")
verb("legen", "put", "puts", "put", "رکھ", "gelegt", en_ing="putting")
verb("liegen", "lie", "lies", "lain", "-", "gelegen")
verb("wohnen", "live", "lives", "lived", "رہ", "gewohnt")
verb("kommen", "come", "comes", "come", "آ", "gekommen", aux="sein")
verb("heißen", "be called", "is called", "-", "-", "geheißen")
verb("sprechen", "speak", "speaks", "spoken", "بول", "gesprochen", s23="sprich")
verb("lernen", "learn", "learns", "learned", "سیکھ", "gelernt")
verb("arbeiten", "work", "works", "worked", "کام کر", "gearbeitet")
verb("spielen", "play", "plays", "played", "کھیل", "gespielt")
verb("machen", "do", "does", "done", "کر", "gemacht")
verb("fahren", "go", "goes", "gone", "جا", "gefahren", aux="sein", s23="fähr")
verb("gehen", "go", "goes", "gone", "جا", "gegangen", aux="sein")
verb("schlafen", "sleep", "sleeps", "slept", "سو", "geschlafen", s23="schläf")
verb("hören", "listen to", "listens to", "listened to", "سن", "gehört", en_ing="listening to")
verb("schreiben", "write", "writes", "written", "لکھ", "geschrieben")
verb("singen", "sing", "sings", "sung", "گا", "gesungen")
verb("planen", "plan", "plans", "planned", "منصوبہ بنا", "geplant", en_ing="planning")
verb("studieren", "study", "studies", "studied", "پڑھ", "studiert")
verb("telefonieren", "phone", "phones", "phoned", "فون پر بات کر", "telefoniert")
verb("passieren", "happen", "happens", "happened", "-", "passiert", aux="sein")
verb("bleiben", "stay", "stays", "stayed", "رہ", "geblieben", aux="sein")
verb("fliegen", "fly", "flies", "flown", "جا", "geflogen", aux="sein")
verb("können", "can", "can", "-", "سک", "gekonnt", table=["kann", "kannst", "kann", "können", "könnt", "können"])
verb("müssen", "must", "must", "-", "-", "gemusst", table=["muss", "musst", "muss", "müssen", "müsst", "müssen"])
verb("wollen", "want", "wants", "-", "چاہ", "gewollt", table=["will", "willst", "will", "wollen", "wollt", "wollen"])
verb("sollen", "should", "should", "-", "-", "gesollt", table=["soll", "sollst", "soll", "sollen", "sollt", "sollen"])
# separable verbs: table / s23 refer to the base verb without the prefix
verb("aufstehen", "get up", "gets up", "got up", "اٹھ", "aufgestanden", aux="sein", sep="auf", en_ing="getting up")
verb("anrufen", "call", "calls", "called", "فون کر", "angerufen", sep="an")
verb("einkaufen", "go shopping", "goes shopping", "gone shopping", "خریداری کر", "eingekauft", sep="ein", en_ing="going shopping")
verb("fernsehen", "watch TV", "watches TV", "watched TV", "ٹی وی دیکھ", "ferngesehen", sep="fern", s23="sieh", en_ing="watching TV")
verb("abholen", "pick up", "picks up", "picked up", "لینے جا", "abgeholt", sep="ab", en_ing="picking up")
verb("einladen", "invite", "invites", "invited", "بلا", "eingeladen", sep="ein",
     table=["lade", "lädst", "lädt", "laden", "ladet", "laden"], en_ing="inviting")
verb("mitkommen", "come along", "comes along", "come along", "ساتھ آ", "mitgekommen", aux="sein", sep="mit", en_ing="coming along")
verb("anfangen", "start", "starts", "started", "شروع ہو", "angefangen", sep="an",
     table=["fange", "fängst", "fängt", "fangen", "fangt", "fangen"])
verb("mitbringen", "bring along", "brings along", "brought along", "ساتھ لا", "mitgebracht", sep="mit", en_ing="bringing along")

PERSON_INDEX = {"1s": 0, "2s": 1, "3s": 2, "1p": 3, "2p": 4, "3p": 5}
