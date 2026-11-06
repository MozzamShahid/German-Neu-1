"""Free Hören / Sprechen audio with the offline Piper voices (same voices as build_voices.py).

Fills every line of src/data/hoeren.json and every Sprechen partner line that has NO recording yet
(the ElevenLabs ones from build_hoeren_audio.mjs are kept). Writes public/audio/hoeren/<key>.mp3 and
marks the entry in src/data/hoeren-audio.json with "engine": "piper".

    .venv/Scripts/python scripts/build_hoeren_piper.py            # generate missing lines
    .venv/Scripts/python scripts/build_hoeren_piper.py --dry-run
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_voices import VOICE_DIR  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
HOEREN = ROOT / "src/data/hoeren.json"
SPRECHEN = ROOT / "src/data/sprechen.json"
MANIFEST = ROOT / "src/data/hoeren-audio.json"
OUT = ROOT / "public/audio/hoeren"

MLS = "de_DE-mls-medium"
# speakers of the multi-speaker MLS model, sorted by measured pitch (female ~185–230 Hz, male ~95–135 Hz)
MLS_FEMALE = [98, 63, 114, 201, 84, 211, 125, 117, 118, 181, 12, 15]
MLS_MALE = [61, 99, 226, 29, 122, 229, 128, 67, 227, 3, 158, 88]

# voice pools per role; every conversation gets its own voices from the pool, so learners hear many speakers
POOLS = {
    "female": [("de_DE-kerstin-low", None), ("de_DE-ramona-low", None)] + [(MLS, i) for i in MLS_FEMALE],
    "male": [("de_DE-thorsten-high", None), ("de_DE-karlsson-low", None)] + [(MLS, i) for i in MLS_MALE],
}
ROLE_POOL = {"f": "female", "f2": "female", "m": "male", "m2": "male"}
ANNOUNCERS = [("de_DE-thorsten-high", None), (MLS, 7), (MLS, 61), (MLS, 211), (MLS, 99), (MLS, 181)]
NARRATOR = ("de_DE-thorsten-high", None)  # "Aufgabe eins", "Sie hören den Text noch einmal."


def stable(s: str) -> int:
    return int(hashlib.sha1(s.encode()).hexdigest()[:8], 16)


def voice_for(item_id: str, sp: str, taken: list) -> tuple:
    """Same item + role always gets the same voice; two roles in one conversation never share a voice."""
    if sp == "sys":
        return NARRATOR
    pool = ANNOUNCERS if sp == "a" else POOLS[ROLE_POOL[sp]]
    i = stable(f"{item_id}|{sp}") % len(pool)
    while pool[i] in taken:
        i = (i + 1) % len(pool)
    return pool[i]


NUMBERS = ["eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn",
           "elf", "zwölf", "dreizehn", "vierzehn", "fünfzehn"]
SYSTEM_LINES = [(f"sys-aufgabe-{i}", f"Aufgabe {w}.") for i, w in enumerate(NUMBERS, 1)] + [
    ("sys-noch-einmal", "Sie hören den Text noch einmal."),
]


def jobs(manifest: dict) -> list:
    out = []
    for test in json.loads(HOEREN.read_text(encoding="utf-8"))["tests"]:
        for item in test["items"]:
            roles: dict = {}
            for sp in dict.fromkeys(line["sp"] for line in item["lines"]):
                roles[sp] = voice_for(item["id"], sp, list(roles.values()))
            for i, line in enumerate(item["lines"]):
                out.append((f"{item['id']}-{i}", roles[line["sp"]], line["de"]))
    for test in json.loads(SPRECHEN.read_text(encoding="utf-8"))["tests"]:
        for part, cards in (("c2", test["cards2"]), ("c3", test["cards3"])):
            for i, card in enumerate(cards):
                key = f"sp-{test['id']}-{part}-{i}-0"
                role = "f" if stable(key) % 2 else "m"
                out.append((key, voice_for(key, role, []), card["partner"]))
    out += [(key, NARRATOR, text) for key, text in SYSTEM_LINES]
    todo = []
    for key, voice, text in out:
        rec = manifest.get(key)
        if rec and (OUT / rec["file"]).exists():
            # keep ElevenLabs recordings; redo Piper ones only if the text or voice changed
            if rec.get("engine") != "piper" or rec["hash"] == piper_hash(voice, text):
                continue
        todo.append((key, voice, text))
    return todo


def piper_hash(voice: tuple, text: str) -> str:
    model, sid = voice
    return hashlib.sha1(f"piper|{model}|{sid}|{text}".encode()).hexdigest()[:10]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else {}
    todo = jobs(manifest)
    print(f"{len(todo)} lines to generate with Piper")
    if args.dry_run or not todo:
        return

    import lameenc
    from piper import PiperVoice, SynthesisConfig

    loaded: dict[str, PiperVoice] = {}
    OUT.mkdir(parents=True, exist_ok=True)
    for n, (key, voice, text) in enumerate(todo, 1):
        model, sid = voice
        if model not in loaded:
            loaded[model] = PiperVoice.load(str(VOICE_DIR / f"{model}.onnx"))
        pv = loaded[model]
        pcm = b"".join(c.audio_int16_bytes for c in pv.synthesize(text, syn_config=SynthesisConfig(speaker_id=sid, length_scale=1.1)))
        enc = lameenc.Encoder()
        enc.set_bit_rate(48)
        enc.set_in_sample_rate(pv.config.sample_rate)
        enc.set_channels(1)
        enc.set_quality(5)
        (OUT / f"{key}.mp3").write_bytes(enc.encode(pcm) + enc.flush())
        manifest[key] = {"file": f"{key}.mp3", "hash": piper_hash(voice, text), "engine": "piper"}
        if n % 20 == 0 or n == len(todo):
            print(f"{n}/{len(todo)}")
    MANIFEST.write_text(json.dumps(dict(sorted(manifest.items())), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
