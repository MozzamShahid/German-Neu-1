// Lecture notes (Week 2 – Week 13), cleaned up: English + Urdu explanation,
// tables and example sentences (German · English · Urdu).

export interface Lesson {
  id: string; // matches a grammar topic where possible
  week: string;
  title: string;
  en: string[];
  ur: string[];
  tables?: { caption?: string; head: string[]; rows: string[][] }[];
  examples?: [string, string, string][];
  optional?: boolean;
}

export const LESSONS: Lesson[] = [
  {
    id: "wortstellung",
    week: "Woche 2, 4, 5",
    title: "Satzbau – the verb is always in position 2",
    en: [
      "Statement (Aussagesatz): the conjugated verb is ALWAYS in position 2. Position 1 can be the subject, a time word or a question word.",
      "W-Frage: W-word + verb + subject (Wo wohnst du?).",
      "Ja/Nein-Frage: the verb comes FIRST (Wohnst du in Lahore?).",
      "Imperativ (request with Sie): verb first + Sie (Gehen Sie rechts!).",
      "If a time word comes first, the subject moves behind the verb: Heute lerne ich Deutsch.",
    ],
    ur: [
      "جرمن جملے میں فعل ہمیشہ دوسری جگہ پر آتا ہے۔",
      "سوالیہ لفظ (W-Wort) والا سوال: سوالیہ لفظ + فعل + فاعل۔",
      "ہاں/نہیں والا سوال: فعل سب سے پہلے۔",
      "اگر وقت کا لفظ پہلے آئے تو فاعل فعل کے بعد چلا جاتا ہے۔",
    ],
    tables: [
      {
        caption: "W-Wörter",
        head: ["German", "English", "اردو"],
        rows: [
          ["wo?", "where?", "کہاں؟"],
          ["woher?", "where from?", "کہاں سے؟"],
          ["wohin?", "where to?", "کہاں کو؟"],
          ["was?", "what?", "کیا؟"],
          ["wer?", "who?", "کون؟"],
          ["wann?", "when?", "کب؟"],
          ["wie?", "how?", "کیسے؟"],
          ["welche?", "which?", "کون سا؟"],
        ],
      },
      {
        caption: "Positions",
        head: ["1", "2 (verb)", "3 …", "end"],
        rows: [
          ["Ich", "wohne", "in Lahore.", ""],
          ["Wo", "wohnst", "du?", ""],
          ["Heute", "lerne", "ich Deutsch.", ""],
          ["—", "Wohnst", "du in Lahore?", "(verb first)"],
          ["Ich", "kann", "Deutsch", "sprechen."],
        ],
      },
    ],
    examples: [
      ["Woher kommen Sie?", "Where are you from?", "آپ کہاں سے ہیں؟"],
      ["Ich komme aus Pakistan.", "I come from Pakistan.", "میں پاکستان سے ہوں۔"],
      ["Wo wohnst du? – Ich wohne in Lahore.", "Where do you live? – I live in Lahore.", "تم کہاں رہتے ہو؟ – میں لاہور میں رہتا ہوں۔"],
      ["Trinken Sie Wasser? – Ja, ich trinke Wasser.", "Do you drink water? – Yes, I drink water.", "کیا آپ پانی پیتے ہیں؟ – جی، میں پانی پیتا ہوں۔"],
      ["Gehen Sie geradeaus!", "Go straight ahead!", "سیدھے جائیے!"],
    ],
  },
  {
    id: "konjugation",
    week: "Woche 2",
    title: "Verben im Präsens – sein, haben, regular verbs",
    en: [
      "Remove -en from the infinitive and add the ending: ich -e, du -st, er/sie/es -t, wir -en, ihr -t, sie/Sie -en.",
      "Every name (Ali, Sara, mein Bruder …) belongs to the er/sie/es group, so it takes -t: Jan kommt.",
      "Stems ending in -t/-d add an extra e: du arbeitest, er arbeitet. Stems ending in -s/-ß/-z only add -t for du: du heißt.",
      "Some verbs change their vowel for du and er/sie/es: sprechen → du sprichst, lesen → er liest, fahren → du fährst.",
    ],
    ur: [
      "فعل سے ‎-en ہٹائیں اور ending لگائیں: ich ‎-e، du ‎-st، er/sie/es ‎-t، wir ‎-en، ihr ‎-t، sie/Sie ‎-en۔",
      "ہر نام (علی، سارہ) er/sie/es والے گروپ میں آتا ہے، اس لیے ‎-t لگتا ہے۔",
      "sein اور haben بے قاعدہ ہیں، انہیں یاد کریں۔",
    ],
    tables: [
      {
        head: ["", "wohnen", "heißen", "arbeiten", "sein", "haben"],
        rows: [
          ["ich", "wohne", "heiße", "arbeite", "bin", "habe"],
          ["du", "wohnst", "heißt", "arbeitest", "bist", "hast"],
          ["er/sie/es", "wohnt", "heißt", "arbeitet", "ist", "hat"],
          ["wir", "wohnen", "heißen", "arbeiten", "sind", "haben"],
          ["ihr", "wohnt", "heißt", "arbeitet", "seid", "habt"],
          ["sie/Sie", "wohnen", "heißen", "arbeiten", "sind", "haben"],
        ],
      },
      {
        caption: "Vowel change (du / er)",
        head: ["Infinitiv", "du", "er/sie/es"],
        rows: [
          ["sprechen", "sprichst", "spricht"],
          ["lesen", "liest", "liest"],
          ["essen", "isst", "isst"],
          ["nehmen", "nimmst", "nimmt"],
          ["fahren", "fährst", "fährt"],
          ["schlafen", "schläfst", "schläft"],
        ],
      },
    ],
    examples: [
      ["Ich heiße Mozzam.", "My name is Mozzam.", "میرا نام موزم ہے۔"],
      ["Wie heißt du?", "What is your name?", "تمہارا نام کیا ہے؟"],
      ["Sie heißt Alycia, sie kommt aus Indonesien und wohnt in Jakarta.", "Her name is Alycia, she comes from Indonesia and lives in Jakarta.", "اس کا نام ایلیسیا ہے، وہ انڈونیشیا سے ہے اور جکارتہ میں رہتی ہے۔"],
      ["Ich spreche Englisch, Urdu und Deutsch.", "I speak English, Urdu and German.", "میں انگریزی، اردو اور جرمن بولتا ہوں۔"],
    ],
  },
  {
    id: "pronomen",
    week: "Woche 2",
    title: "Personalpronomen – and how to tell Sie from sie",
    en: [
      "ich (I), du (you), er (he), sie (she), es (it), wir (we), ihr (you all), sie (they), Sie (you, formal).",
      "Look at the verb ending: sie kommt (-t) = she. sie kommen (-en) = they. Sie kommen = you (formal), always with a capital S.",
      "If two or more people talk about themselves, use wir.",
    ],
    ur: [
      "Sie (بڑا S) = آپ (رسمی)، sie کے ساتھ ‎-t = وہ (عورت)، sie کے ساتھ ‎-en = وہ سب۔",
      "der کے لیے er، die کے لیے sie، das کے لیے es استعمال کریں۔",
    ],
    tables: [
      {
        head: ["German", "English", "اردو"],
        rows: [
          ["ich", "I", "میں"],
          ["du", "you", "تم"],
          ["er / sie / es", "he / she / it", "وہ"],
          ["wir", "we", "ہم"],
          ["ihr", "you (all)", "تم سب"],
          ["sie", "they", "وہ سب"],
          ["Sie", "you (formal)", "آپ"],
        ],
      },
    ],
    examples: [
      ["Sara kommt aus Indonesien. Sie wohnt in Jakarta.", "Sara comes from Indonesia. She lives in Jakarta.", "سارہ انڈونیشیا سے ہے۔ وہ جکارتہ میں رہتی ہے۔"],
      ["Herr Khan, wo wohnen Sie?", "Mr Khan, where do you live?", "خان صاحب، آپ کہاں رہتے ہیں؟"],
    ],
  },
  {
    id: "artikel",
    week: "Woche 4, 5, 8",
    title: "Artikel – der/die/das, ein/kein, Plural, mein/dein",
    en: [
      "Bestimmter Artikel: der (masculine), die (feminine), das (neuter). Every plural uses die.",
      "Unbestimmter Artikel: ein / eine. Negation: kein / keine (plural: keine).",
      "Compound nouns take the article of their LAST word: der Kindergarten (der Garten), das Wohnzimmer (das Zimmer).",
      "Possessive (mein, dein …) works like ein/kein: mein Bruder, meine Schwester, mein Auto, meine Eltern.",
    ],
    ur: [
      "جمع (Plural) میں ہمیشہ die آتا ہے۔",
      "دو الفاظ مل کر نیا لفظ بنے تو آخری لفظ کا article لگتا ہے: der Kindergarten۔",
      "mein، dein وغیرہ ein کی طرح بدلتے ہیں۔",
    ],
    tables: [
      {
        head: ["", "bestimmt", "unbestimmt", "negativ"],
        rows: [
          ["Maskulin", "der", "ein", "kein"],
          ["Neutrum", "das", "ein", "kein"],
          ["Feminin", "die", "eine", "keine"],
          ["Plural", "die", "—", "keine"],
        ],
      },
      {
        caption: "Possessivartikel (Nominativ)",
        head: ["Person", "m / n", "f / Pl", "اردو"],
        rows: [
          ["ich", "mein", "meine", "میرا"],
          ["du", "dein", "deine", "تمہارا"],
          ["er / es", "sein", "seine", "اس کا"],
          ["sie", "ihr", "ihre", "اس کا (عورت)"],
          ["wir", "unser", "unsere", "ہمارا"],
          ["ihr", "euer", "eure", "تم سب کا"],
          ["sie / Sie", "ihr / Ihr", "ihre / Ihre", "ان کا / آپ کا"],
        ],
      },
    ],
    examples: [
      ["Das ist kein Tisch, das ist ein Stuhl.", "That is not a table, that is a chair.", "یہ میز نہیں ہے، یہ ایک کرسی ہے۔"],
      ["das Buch → die Bücher", "the book → the books", "کتاب ← کتابیں"],
      ["Das ist meine Schwester.", "This is my sister.", "یہ میری بہن ہے۔"],
    ],
  },
  {
    id: "modalverben",
    week: "Woche 7, 8, 11",
    title: "Modalverben – können, müssen, wollen, sollen, möchten, mögen",
    en: [
      "The modal verb is in position 2 and is conjugated. The second verb goes to the END in the infinitive (-en).",
      "ich and er/sie/es have the SAME form: ich kann, er kann.",
      "W-Frage: Was kannst du spielen? · Ja/Nein: Willst du Fußball spielen?",
    ],
    ur: [
      "Modal verb دوسری جگہ پر بدلتا ہے، اور اصل فعل آخر میں اپنی اصل شکل (‎-en) میں آتا ہے۔",
      "ich اور er کی شکل ایک جیسی ہوتی ہے: ich kann، er kann۔",
    ],
    tables: [
      {
        head: ["", "können", "müssen", "wollen", "sollen", "möchten", "mögen"],
        rows: [
          ["ich", "kann", "muss", "will", "soll", "möchte", "mag"],
          ["du", "kannst", "musst", "willst", "sollst", "möchtest", "magst"],
          ["er/sie/es", "kann", "muss", "will", "soll", "möchte", "mag"],
          ["wir", "können", "müssen", "wollen", "sollen", "möchten", "mögen"],
          ["ihr", "könnt", "müsst", "wollt", "sollt", "möchtet", "mögt"],
          ["sie/Sie", "können", "müssen", "wollen", "sollen", "möchten", "mögen"],
          ["اردو", "سکنا", "ضرور کرنا", "چاہنا", "چاہیے", "چاہوں گا", "پسند کرنا"],
        ],
      },
    ],
    examples: [
      ["Ich kann Fußball spielen.", "I can play football.", "میں فٹ بال کھیل سکتا ہوں۔"],
      ["Du musst Deutsch lernen.", "You have to learn German.", "تمہیں جرمن سیکھنی ہے۔"],
      ["Wir wollen nach Berlin fahren.", "We want to go to Berlin.", "ہم برلن جانا چاہتے ہیں۔"],
      ["Sie sollen viel Wasser trinken.", "You should drink a lot of water.", "آپ کو بہت پانی پینا چاہیے۔"],
      ["Möchtest du Tee trinken?", "Would you like to drink tea?", "کیا تم چائے پینا چاہو گے؟"],
    ],
  },
  {
    id: "trennbar",
    week: "Woche 10",
    title: "Trennbare Verben – the verb breaks in two",
    en: [
      "The verb part goes to position 2, the prefix goes to the END: aufstehen → Ich stehe um 7 Uhr auf.",
      "With a modal verb it does NOT break: Ich muss um 7 Uhr aufstehen.",
      "Common prefixes: auf, an, ein, mit, ab, fern, vor.",
    ],
    ur: [
      "trennbares Verb دو حصوں میں ٹوٹتا ہے: فعل دوسری جگہ پر، prefix جملے کے آخر میں۔",
      "Modal verb کے ساتھ یہ نہیں ٹوٹتا، پورا آخر میں آتا ہے۔",
    ],
    tables: [
      {
        head: ["Verb", "Satz", "English", "اردو"],
        rows: [
          ["aufstehen", "Ich stehe um 7 Uhr auf.", "to get up", "اٹھنا"],
          ["anrufen", "Ich rufe meine Mutter an.", "to call", "فون کرنا"],
          ["einladen", "Ich lade dich zu meinem Geburtstag ein.", "to invite", "دعوت دینا"],
          ["abholen", "Ich hole Sara ab.", "to pick up", "لینے جانا"],
          ["einkaufen", "Wir kaufen am Samstag ein.", "to shop", "خریداری کرنا"],
          ["fernsehen", "Am Abend sehe ich fern.", "to watch TV", "ٹی وی دیکھنا"],
          ["mitkommen", "Kommst du mit?", "to come along", "ساتھ آنا"],
          ["anfangen", "Der Tag fängt um 10 Uhr an.", "to start", "شروع ہونا"],
        ],
      },
    ],
    examples: [
      ["Bei Regen ruft sie alle an.", "If it rains, she calls everyone.", "بارش ہو تو وہ سب کو فون کرتی ہے۔"],
      ["Marc und Anne sammeln Geld ein.", "Marc and Anne collect money.", "مارک اور این پیسے اکٹھے کرتے ہیں۔"],
      ["Am Samstag können viele Freunde mitkommen.", "On Saturday many friends can come along.", "ہفتے کو بہت سے دوست ساتھ آ سکتے ہیں۔"],
    ],
  },
  {
    id: "vergangenheit",
    week: "Woche 11, 13",
    title: "Vergangenheit – war, hatte and the Perfekt",
    en: [
      "Präteritum of sein and haben: ich war (I was), ich hatte (I had).",
      "Perfekt = haben/sein (position 2, conjugated) + Partizip II (at the END).",
      "About 90% of verbs use haben. Verbs of movement or change use sein: fahren → ist gefahren. Exceptions with sein: bleiben, passieren.",
      "Partizip II: regular ge- … -t (gelernt); irregular ge- … -en (geschrieben); -ieren verbs have no ge- (studiert); separable verbs put ge in the middle (aufgestanden).",
    ],
    ur: [
      "Perfekt = haben/sein دوسری جگہ پر + Partizip II آخر میں۔",
      "زیادہ تر (۹۰٪) فعل haben کے ساتھ آتے ہیں۔ حرکت ہو تو sein۔ bleiben اور passieren استثنا ہیں (sein)۔",
    ],
    tables: [
      {
        head: ["", "sein → war", "haben → hatte"],
        rows: [
          ["ich", "war", "hatte"],
          ["du", "warst", "hattest"],
          ["er/sie/es", "war", "hatte"],
          ["wir", "waren", "hatten"],
          ["ihr", "wart", "hattet"],
          ["sie/Sie", "waren", "hatten"],
        ],
      },
      {
        caption: "Partizip II",
        head: ["Type", "Infinitiv", "Perfekt"],
        rows: [
          ["regular ge-…-t", "lernen / machen / holen / planen", "hat gelernt / gemacht / geholt / geplant"],
          ["irregular ge-…-en", "schreiben / nehmen / singen", "hat geschrieben / genommen / gesungen"],
          ["-ieren (no ge-)", "studieren / passieren", "hat studiert / ist passiert"],
          ["movement → sein", "fahren / kommen / fließen", "ist gefahren / gekommen / geflossen"],
          ["exception → sein", "bleiben", "ist geblieben"],
        ],
      },
    ],
    examples: [
      ["Ich habe Deutsch gelernt.", "I have learned German.", "میں جرمن سیکھ چکا ہوں۔"],
      ["Ich habe Hausaufgaben gemacht.", "I have done my homework.", "میں ہوم ورک کر چکا ہوں۔"],
      ["Wir sind nach Berlin gefahren.", "We went to Berlin.", "ہم برلن گئے۔"],
      ["Ich hatte ein Fahrrad, aber jetzt habe ich ein Auto.", "I had a bicycle, but now I have a car.", "میرے پاس سائیکل تھی، لیکن اب گاڑی ہے۔"],
      ["Ich war Lehrer, aber jetzt bin ich arbeitslos.", "I was a teacher, but now I am unemployed.", "میں استاد تھا، لیکن اب بے روزگار ہوں۔"],
    ],
  },
  {
    id: "zahlen",
    week: "Woche 2, 4, 9",
    title: "Zahlen & Datum",
    en: [
      "21–99: ones BEFORE tens, joined with und: 55 = fünfundfünfzig, 47 = siebenundvierzig.",
      "Big numbers are written as one word: 524 = fünfhundertvierundzwanzig, 7245 = siebentausendzweihundertfünfundvierzig.",
      "Dates use ordinals: am ersten, zweiten, dritten … neunzehnten (+ten), from 20: zwanzigsten, einundzwanzigsten (+sten). Day and month are not joined with und.",
      "Years: 1918 = neunzehnhundertachtzehn, 2026 = zweitausendsechsundzwanzig (not “zwanzighundert…”).",
    ],
    ur: [
      "جرمن میں اکائی پہلے اور دہائی بعد میں: ۴۷ = sieben-und-vierzig (سات اور چالیس)۔",
      "تاریخ کے لیے ‎-ten (۱ سے ۱۹) اور ‎-sten (۲۰ کے بعد)۔",
    ],
    tables: [
      {
        head: ["", "", "", ""],
        rows: [
          ["1 eins", "6 sechs", "11 elf", "16 sechzehn"],
          ["2 zwei", "7 sieben", "12 zwölf", "17 siebzehn"],
          ["3 drei", "8 acht", "13 dreizehn", "18 achtzehn"],
          ["4 vier", "9 neun", "14 vierzehn", "19 neunzehn"],
          ["5 fünf", "10 zehn", "15 fünfzehn", "20 zwanzig"],
          ["30 dreißig", "40 vierzig", "50 fünfzig", "100 hundert"],
        ],
      },
    ],
    examples: [
      ["Wie ist deine Telefonnummer? – null drei zwei null …", "What is your phone number? – zero three two zero …", "تمہارا فون نمبر کیا ہے؟"],
      ["Ich habe am einundzwanzigsten September Geburtstag.", "My birthday is on the 21st of September.", "میری سالگرہ اکیس ستمبر کو ہے۔"],
      ["Wir sind Zwillinge.", "We are twins.", "ہم جڑواں ہیں۔"],
    ],
  },
  {
    id: "uhrzeit",
    week: "Woche 7, 8",
    title: "Uhrzeit – official and informal time, am/um/zum",
    en: [
      "Official (24 h, radio, train): hour + Uhr + minutes: 16:45 = sechzehn Uhr fünfundvierzig. After 12 o'clock add 12 (2 pm = 14 Uhr).",
      "Informal (12 h): Viertel nach (:15), halb + NEXT hour (:30 → halb acht = 7:30!), Viertel vor + next hour (:45). Use nach for minutes after and vor for minutes before. kurz vor / kurz nach = just before / after.",
      "um + clock time (um 8 Uhr) · am + day / part of the day (am Montag, am Abend) · zum + meal (zum Frühstück) · von … bis (from … to).",
      "Wie spät ist es? / Wie viel Uhr ist es? = What time is it?",
    ],
    ur: [
      "Viertel nach = سوا، halb = ساڑھے (اگلا گھنٹہ!)، Viertel vor = پونے۔ halb acht = ساڑھے سات۔",
      "um گھڑی کے وقت کے ساتھ، am دن کے ساتھ، zum کھانے کے ساتھ۔",
    ],
    tables: [
      {
        head: ["Time", "informal", "official", "اردو"],
        rows: [
          ["7:15", "Viertel nach sieben", "sieben Uhr fünfzehn", "سوا سات"],
          ["7:30", "halb acht", "sieben Uhr dreißig", "ساڑھے سات"],
          ["6:45", "Viertel vor sieben", "sechs Uhr fünfundvierzig", "پونے سات"],
          ["1:28", "achtundzwanzig nach eins", "ein Uhr achtundzwanzig", "ایک بج کر ۲۸ منٹ"],
          ["1:55", "fünf vor zwei", "ein Uhr fünfundfünfzig", "دو بجنے میں پانچ منٹ"],
          ["1:58", "kurz vor zwei", "ein Uhr achtundfünfzig", "دو بجنے والے ہیں"],
          ["20:15", "Viertel nach acht", "zwanzig Uhr fünfzehn", "سوا آٹھ (رات)"],
        ],
      },
      {
        caption: "Tageszeiten",
        head: ["German", "English", "اردو"],
        rows: [
          ["der Morgen / am Morgen", "morning", "صبح"],
          ["der Vormittag (9–12)", "late morning", "دوپہر سے پہلے"],
          ["der Mittag", "noon", "دوپہر"],
          ["der Nachmittag (12–18)", "afternoon", "سہ پہر"],
          ["der Abend / am Abend", "evening", "شام"],
          ["das Frühstück · Mittagessen · Abendessen", "breakfast · lunch · dinner", "ناشتہ · دوپہر کا کھانا · رات کا کھانا"],
        ],
      },
    ],
    examples: [
      ["Ich lerne um sechs Uhr.", "I study at six o'clock.", "میں چھ بجے پڑھتا ہوں۔"],
      ["Ich treffe Ali am Montagabend.", "I am meeting Ali on Monday evening.", "میں پیر کی شام علی سے ملتا ہوں۔"],
      ["Ich arbeite von Montag bis Freitag.", "I work from Monday to Friday.", "میں پیر سے جمعہ تک کام کرتا ہوں۔"],
      ["Wann gehst du ins Kino?", "When are you going to the cinema?", "تم سنیما کب جا رہے ہو؟"],
    ],
  },
  {
    id: "wortbildung",
    week: "Woche 4, 6, 9",
    title: "Wortbildung – build new words",
    en: [
      "-los = without: die Arbeit → arbeitslos (unemployed), die Kosten → kostenlos (free), der Sinn → sinnlos.",
      "verb + -er = the person: kaufen → der Käufer, verkaufen → der Verkäufer (always der).",
      "+ -in = female: der Lehrer → die Lehrerin, der Arzt → die Ärztin (always die).",
      "verb + -ung = noun (always die): einladen → die Einladung, wohnen → die Wohnung.",
      "-chen = small (always das): das Brot → das Brötchen.",
      "body part + Schmerzen = pain: Kopfschmerzen, Rückenschmerzen, Zahnschmerzen, Halsschmerzen.",
    ],
    ur: [
      "‎-los = بغیر (بے): arbeitslos = بے روزگار۔ ‎-er = کرنے والا۔ ‎-in = مؤنث۔ ‎-ung ہمیشہ die۔ ‎-chen ہمیشہ das (چھوٹا)۔",
      "جسم کا حصہ + Schmerzen = درد: Kopfschmerzen = سر درد۔",
    ],
    tables: [
      {
        caption: "Körper",
        head: ["German", "English", "اردو", "… + Schmerzen"],
        rows: [
          ["der Kopf", "head", "سر", "Kopfschmerzen"],
          ["der Rücken", "back", "کمر", "Rückenschmerzen"],
          ["der Hals", "throat", "گلا", "Halsschmerzen"],
          ["der Zahn", "tooth", "دانت", "Zahnschmerzen"],
          ["das Ohr", "ear", "کان", "Ohrenschmerzen"],
          ["das Bein", "leg", "ٹانگ", "Beinschmerzen"],
          ["die Brust", "chest", "سینہ", "—"],
          ["die Schulter", "shoulder", "کندھا", "—"],
        ],
      },
    ],
    examples: [
      ["Was für Beschwerden haben Sie? – Ich habe Kopfschmerzen.", "What symptoms do you have? – I have a headache.", "آپ کو کیا تکلیف ہے؟ – مجھے سر درد ہے۔"],
      ["Ich gebe Ihnen ein Schmerzmittel. Bitte einmal pro Tag, vier Tage lang.", "I'll give you a painkiller. Once a day, for four days.", "میں آپ کو درد کی دوا دیتا ہوں۔ دن میں ایک بار، چار دن تک۔"],
    ],
  },
  {
    id: "akkusativ",
    week: "Woche 6, 11, 13",
    optional: true,
    title: "Akkusativ – the direct object (was? wen?)",
    en: [
      "Nominativ = the subject (the main role). Akkusativ = the direct object (the second thing): Ich kaufe den Computer.",
      "In Akkusativ ONLY masculine changes: der → den, ein → einen, kein → keinen, mein → meinen. die / das / plural stay the same.",
      "Akkusativ verbs: haben, brauchen, kaufen, möchten, machen, kochen, essen, trinken, suchen, sehen, nehmen, stellen.",
      "Akkusativ prepositions (always): für, ohne, durch, gegen, um.",
      "Pronouns: mich, dich, ihn / sie / es, uns, euch, sie / Sie.",
    ],
    ur: [
      "Akkusativ = دوسری چیز (کیا؟ کس کو؟)۔ صرف masculine بدلتا ہے: der → den، ein → einen۔",
      "für، ohne، durch، gegen، um کے بعد ہمیشہ Akkusativ۔",
    ],
    tables: [
      {
        head: ["", "Nominativ", "Akkusativ"],
        rows: [
          ["Maskulin", "der / ein / kein / mein", "den / einen / keinen / meinen"],
          ["Neutrum", "das / ein / kein", "das / ein / kein"],
          ["Feminin", "die / eine / keine", "die / eine / keine"],
          ["Plural", "die / – / keine", "die / – / keine"],
        ],
      },
      {
        caption: "Pronomen",
        head: ["Nominativ", "ich", "du", "er", "sie", "es", "wir", "ihr", "sie/Sie"],
        rows: [["Akkusativ", "mich", "dich", "ihn", "sie", "es", "uns", "euch", "sie/Sie"]],
      },
    ],
    examples: [
      ["Ich kaufe einen Tisch. Das ist für den Flur.", "I'm buying a table. It is for the hallway.", "میں ایک میز خریدتا ہوں۔ یہ راہداری کے لیے ہے۔"],
      ["Ich kaufe für dich.", "I'm buying for you.", "میں تمہارے لیے خریدتا ہوں۔"],
      ["Für wen ist das? – Für meinen Bruder.", "Who is that for? – For my brother.", "یہ کس کے لیے ہے؟ – میرے بھائی کے لیے۔"],
    ],
  },
  {
    id: "dativ",
    week: "Woche 13",
    optional: true,
    title: "Dativ – the indirect object (wem? to whom?)",
    en: [
      "In Dativ EVERYTHING changes: der → dem, das → dem, die → der, plural → den (+ n on the noun: den Kindern).",
      "Dativ verbs: helfen, danken, gefallen, gehören, antworten, schmecken; with a person + a thing: geben, schenken, zeigen, bringen (person = Dativ, thing = Akkusativ).",
      "Dativ prepositions (always): mit, bei, von, aus, zu, nach, seit. Short forms: zum (zu dem), zur (zu der), beim (bei dem), vom (von dem).",
      "Pronouns: mir, dir, ihm / ihr / ihm, uns, euch, ihnen / Ihnen.",
    ],
    ur: [
      "Dativ میں سب بدلتا ہے: der → dem، die → der، das → dem، Plural → den۔",
      "mit، bei، von، aus، zu، nach، seit کے بعد ہمیشہ Dativ۔",
      "gefallen: Die Wohnung gefällt mir = مجھے فلیٹ پسند ہے۔",
    ],
    tables: [
      {
        head: ["", "Nominativ", "Akkusativ", "Dativ"],
        rows: [
          ["M (der)", "der / ein", "den / einen", "dem / einem"],
          ["N (das)", "das / ein", "das / ein", "dem / einem"],
          ["F (die)", "die / eine", "die / eine", "der / einer"],
          ["Plural", "die / –", "die / –", "den / – (+n: den Kindern)"],
        ],
      },
      {
        caption: "Pronomen",
        head: ["Nominativ", "ich", "du", "er", "sie", "es", "wir", "ihr", "sie/Sie"],
        rows: [
          ["Akkusativ", "mich", "dich", "ihn", "sie", "es", "uns", "euch", "sie/Sie"],
          ["Dativ", "mir", "dir", "ihm", "ihr", "ihm", "uns", "euch", "ihnen/Ihnen"],
        ],
      },
    ],
    examples: [
      ["Ich helfe dem Mann.", "I help the man.", "میں اس آدمی کی مدد کرتا ہوں۔"],
      ["Die Wohnung gefällt mir.", "I like the flat.", "مجھے فلیٹ پسند ہے۔"],
      ["Ich schenke meiner Mutter eine Uhr.", "I give my mother a watch.", "میں اپنی امی کو ایک گھڑی تحفے میں دیتا ہوں۔"],
      ["Ich fahre mit dem Bus.", "I go by bus.", "میں بس سے جاتا ہوں۔"],
    ],
  },
  {
    id: "wechsel",
    week: "Woche 13",
    optional: true,
    title: "Wechselpräpositionen – Wo? (Dativ) or Wohin? (Akkusativ)",
    en: [
      "Nine prepositions can take Akkusativ OR Dativ: an, auf, hinter, in, neben, über, unter, vor, zwischen.",
      "Wohin? (movement to a place) → Akkusativ: Ich lege das Buch auf den Tisch.",
      "Wo? (position, no movement) → Dativ: Das Buch liegt auf dem Tisch.",
      "stellen (put upright) / legen (put flat) = movement → Akkusativ. stehen / liegen = position → Dativ.",
      "auf = on (touching), über = above (not touching), an = at/on the side (touching), neben = next to, in = inside, unter = under, vor = in front, hinter = behind, zwischen = between.",
      "Short forms: in dem = im, in das = ins, an dem = am, an das = ans.",
    ],
    ur: [
      "Wohin؟ (کہاں کو، حرکت) → Akkusativ۔ Wo؟ (کہاں، حرکت نہیں) → Dativ۔",
      "stellen / legen = رکھنا (حرکت)، stehen / liegen = پڑا ہونا (حرکت نہیں)۔",
      "auf = اوپر چھو کر، über = اوپر بغیر چھوئے، neben = ساتھ، unter = نیچے، vor = سامنے، hinter = پیچھے، zwischen = درمیان۔",
    ],
    tables: [
      {
        head: ["Wohin? → Akkusativ", "Wo? → Dativ"],
        rows: [
          ["Ich stelle den Stuhl in den Flur.", "Der Stuhl steht im (in dem) Flur."],
          ["Ich lege das Buch auf den Tisch.", "Das Buch liegt auf dem Tisch."],
          ["Ich hänge das Bild an die Wand.", "Das Bild hängt an der Wand."],
          ["Wir gehen in die Küche.", "Wir sind in der Küche."],
        ],
      },
    ],
    examples: [
      ["Ich stelle den Stuhl in den Flur.", "I put the chair in the hallway.", "میں کرسی راہداری میں رکھتا ہوں۔"],
      ["Der Stuhl steht in dem Flur.", "The chair is in the hallway.", "کرسی راہداری میں رکھی ہے۔"],
    ],
  },
  {
    id: "redemittel",
    week: "Woche 2, 5, 9, 10, 11",
    title: "Redemittel – Brief, Präsentation, Restaurant, Arzt, Wetter",
    en: [
      "Formal letter (boss, people you don't know): Sehr geehrte Frau … / Sehr geehrter Herr … · Sie / Ihnen · Mit freundlichen Grüßen.",
      "Informal letter (friends): Liebe Sara / Lieber Ali · du / dir · Viele Grüße.",
      "Presentation: Sehr geehrte Damen und Herren · Wir präsentieren das Thema … · Nächste Folie · Jetzt kommt Herr … · Vielen Dank für Ihre Aufmerksamkeit.",
      "Restaurant: Die Speisekarte, bitte · Ich möchte bestellen · Für mich bitte … · Zusammen oder getrennt? · Trinkgeld = tip.",
      "Class: Das verstehe ich nicht · Bitte noch einmal · Bitte ein bisschen langsamer · Was bedeutet das?",
    ],
    ur: [
      "رسمی خط: Sehr geehrte/r … اور آخر میں Mit freundlichen Grüßen۔ غیر رسمی: Liebe/r … اور آخر میں Viele Grüße۔",
    ],
    tables: [
      {
        caption: "Wetter",
        head: ["German", "English", "اردو"],
        rows: [
          ["Wie ist das Wetter heute?", "What's the weather like today?", "آج موسم کیسا ہے؟"],
          ["Es ist kalt / heiß.", "It is cold / hot.", "سردی / گرمی ہے۔"],
          ["Es ist sonnig / windig / neblig.", "It is sunny / windy / foggy.", "دھوپ / ہوا / دھند ہے۔"],
          ["Es regnet. / Es schneit.", "It's raining. / It's snowing.", "بارش / برف باری ہو رہی ہے۔"],
          ["gestern · heute · morgen · übermorgen", "yesterday · today · tomorrow · day after tomorrow", "کل · آج · کل · پرسوں"],
        ],
      },
    ],
    examples: [
      ["Sehr geehrter Herr Khan, … Mit freundlichen Grüßen, Hamza Hayat", "Dear Mr Khan, … Kind regards, Hamza Hayat", "محترم خان صاحب، … نیک تمناؤں کے ساتھ، حمزہ حیات"],
      ["Lieber Mozzam, … Viele Grüße, Hamza", "Dear Mozzam, … Best wishes, Hamza", "پیارے موزم، … بہت سی دعائیں، حمزہ"],
      ["Zum Geburtstag viel Glück, lieber Hassan!", "Happy birthday, dear Hassan!", "سالگرہ مبارک، پیارے حسن!"],
    ],
  },
  {
    id: "pruefung",
    week: "Woche 4, 13",
    title: "Prüfung A1 – exam tips",
    en: [
      "Four parts: Lesen, Hören, Schreiben, Sprechen – 15 points each = 60. You need 36/60 (60%).",
      "Hören: use the Beispiel (example) time to read ALL questions before the audio starts. Each question has 3 options – tick one, never leave blank. Watch the small words: diese Woche, names, places (Rathaus, Schule …).",
      "Lesen: read the questions first, then the text.",
      "Schreiben: every keyword of the task must appear in your text (usually 2 questions to ask, 1 to answer). Forms: check what is missing (fehlen) – Wohnungsnummer, Datum, Zeit, Name, Aktivität.",
      "Spelling and phone numbers often come up: Buchstabieren Sie bitte Ihren Vornamen / Nachnamen.",
    ],
    ur: [
      "چار حصے، ہر ایک ۱۵ نمبر = ۶۰۔ پاس ہونے کے لیے ۳۶ نمبر چاہئیں۔",
      "Hören میں مثال (Beispiel) کے دوران سارے سوال پڑھ لیں۔ کوئی سوال خالی نہ چھوڑیں۔",
      "Schreiben میں سوال کے سارے keywords اپنے جواب میں ضرور لکھیں۔",
    ],
  },
];
