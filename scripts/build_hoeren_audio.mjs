// Generates the Hören mock-test audio with ElevenLabs (German voices), once per line.
// Files go to public/audio/hoeren/<itemId>-<line>.mp3 and src/data/hoeren-audio.json records a hash
// per line, so re-running only spends credits on new or changed lines.
//
//   node --env-file=.env.local scripts/build_hoeren_audio.mjs --dry-run   # count characters, no API calls
//   node --env-file=.env.local scripts/build_hoeren_audio.mjs              # all tests
//   node --env-file=.env.local scripts/build_hoeren_audio.mjs --test t1    # one test
//
// The SDK reads ELEVENLABS_API_KEY from the environment (.env.local). Never put the key here.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "src/data/hoeren.json");
const SPRECHEN = join(ROOT, "src/data/sprechen.json");
const MANIFEST = join(ROOT, "src/data/hoeren-audio.json");
const OUT_DIR = join(ROOT, "public/audio/hoeren");

const MODEL = process.env.HOEREN_MODEL || "eleven_v4";
// premade voices that are verified for German
const VOICES = {
  f: "XrExE9yKIg1WjnnlVkGX", // Matilda (female)
  f2: "pFZP5JQG7iQjIQuC4Bku", // Lily (female)
  m: "cjVigY5qzO86Huf0OWal", // Eric (male)
  m2: "nPczCjzI2devNBz1zQrb", // Brian (male)
  a: "onwK4e9ZLuTAKqWW03F9", // Daniel (announcer)
};

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const onlyTest = args.includes("--test") ? args[args.indexOf("--test") + 1] : null;
// lines made with the free Piper voices (scripts/build_hoeren_piper.py) are kept unless you pass --replace-piper
const replacePiper = args.includes("--replace-piper");
const keep = (key, hash, file) =>
  existsSync(join(OUT_DIR, file)) && (manifest[key]?.hash === hash || (manifest[key]?.engine === "piper" && !replacePiper));

const data = JSON.parse(readFileSync(DATA, "utf8"));
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : {};

const jobs = [];
for (const test of data.tests) {
  if (onlyTest && test.id !== onlyTest) continue;
  for (const item of test.items) {
    item.lines.forEach((line, i) => {
      const voiceId = VOICES[line.sp];
      if (!voiceId) throw new Error(`Unknown speaker "${line.sp}" in ${item.id}`);
      const key = `${item.id}-${i}`;
      const hash = createHash("sha1").update(`${MODEL}|${voiceId}|${line.de}`).digest("hex").slice(0, 10);
      const file = `${key}.mp3`;
      if (keep(key, hash, file)) return;
      jobs.push({ key, file, hash, voiceId, text: line.de });
    });
  }
}

// Sprechen: the partner's questions / requests (key sp-<test>-c2-<i>-0 / sp-<test>-c3-<i>-0)
const sprechen = JSON.parse(readFileSync(SPRECHEN, "utf8"));
for (const test of sprechen.tests) {
  if (onlyTest && test.id !== onlyTest) continue;
  for (const [part, cards] of [["c2", test.cards2], ["c3", test.cards3]]) {
    cards.forEach((card, i) => {
      const key = `sp-${test.id}-${part}-${i}-0`;
      const voiceId = VOICES.f;
      const hash = createHash("sha1").update(`${MODEL}|${voiceId}|${card.partner}`).digest("hex").slice(0, 10);
      if (keep(key, hash, `${key}.mp3`)) return;
      jobs.push({ key, file: `${key}.mp3`, hash, voiceId, text: card.partner });
    });
  }
}

const chars = jobs.reduce((s, j) => s + j.text.length, 0);
console.log(`${jobs.length} lines to generate, ${chars} characters, model ${MODEL}`);
if (dryRun || jobs.length === 0) process.exit(0);

const { ElevenLabsClient } = await import("@elevenlabs/elevenlabs-js");
const client = new ElevenLabsClient();
mkdirSync(OUT_DIR, { recursive: true });

let done = 0;
for (const j of jobs) {
  const audio = await client.textToSpeech.convert(j.voiceId, {
    text: j.text,
    modelId: MODEL,
    languageCode: "de",
    outputFormat: "mp3_44100_64",
    voiceSettings: { stability: 0.6, similarityBoost: 0.75 },
  });
  const buf = Buffer.from(await new Response(audio).arrayBuffer());
  writeFileSync(join(OUT_DIR, j.file), buf);
  manifest[j.key] = { file: j.file, hash: j.hash };
  // save after every line so an interruption keeps what was already paid for
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(MANIFEST, JSON.stringify(sorted, null, 2) + "\n");
  console.log(`${++done}/${jobs.length} ${j.key}`);
}
console.log("done");
