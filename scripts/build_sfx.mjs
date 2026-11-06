// Generates the background sounds for the Hören test with ElevenLabs sound effects (once).
// Existing files are skipped, so re-running costs nothing unless you add a new sound.
//   node --env-file=.env.local scripts/build_sfx.mjs
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../public/audio/sfx");

// name -> prompt, seconds, loop
const SOUNDS = {
  bahnhof: ["Ambience of a busy German train station hall: distant train arriving, people walking, rolling suitcases, low murmur", 10, true],
  bus: ["Ambience inside a city bus while driving: engine hum, soft road noise, quiet passengers", 10, true],
  cafe: ["Ambience of a small cafe: quiet chatter, cups and spoons clinking, coffee machine in the background", 10, true],
  kaufhaus: ["Ambience of a department store: shoppers walking, soft murmur, shopping trolleys, large indoor space", 10, true],
  flughafen: ["Ambience of an airport terminal: people walking, rolling suitcases, large hall echo, distant murmur", 10, true],
  strasse: ["Ambience of a quiet city street: a few cars passing, footsteps, light wind, birds far away", 10, true],
  gong: ["Classic three-tone public announcement chime, ding dong ding, like in a German train station", 2, false],
  beep: ["Single answering machine beep tone", 1, false],
};

const { ElevenLabsClient } = await import("@elevenlabs/elevenlabs-js");
const client = new ElevenLabsClient();
mkdirSync(OUT, { recursive: true });

for (const [name, [text, seconds, loop]] of Object.entries(SOUNDS)) {
  const file = join(OUT, `${name}.mp3`);
  if (existsSync(file)) continue;
  const audio = await client.textToSoundEffects.convert({
    text,
    modelId: "eleven_text_to_sound_v3",
    durationSeconds: seconds,
    promptInfluence: 0.5,
    loop,
    outputFormat: "mp3_44100_64",
  });
  writeFileSync(file, Buffer.from(await new Response(audio).arrayBuffer()));
  console.log("made", name);
}
console.log("done");
