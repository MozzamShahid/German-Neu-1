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

# speaker in hoeren.json -> (Piper model, speaker id)
SPEAKERS = {
    "f": ("de_DE-kerstin-low", None),
    "f2": ("de_DE-ramona-low", None),
    "m": ("de_DE-thorsten-high", None),
    "m2": ("de_DE-karlsson-low", None),
    "a": ("de_DE-mls-medium", 7),  # announcer
}


def jobs(manifest: dict) -> list[tuple[str, str, str]]:
    out = []
    for test in json.loads(HOEREN.read_text(encoding="utf-8"))["tests"]:
        for item in test["items"]:
            for i, line in enumerate(item["lines"]):
                out.append((f"{item['id']}-{i}", line["sp"], line["de"]))
    for test in json.loads(SPRECHEN.read_text(encoding="utf-8"))["tests"]:
        for part, cards in (("c2", test["cards2"]), ("c3", test["cards3"])):
            for i, card in enumerate(cards):
                out.append((f"sp-{test['id']}-{part}-{i}-0", "f", card["partner"]))
    todo = []
    for key, sp, text in out:
        rec = manifest.get(key)
        if rec and (OUT / rec["file"]).exists():
            # keep ElevenLabs recordings; redo Piper ones only if the text changed
            if rec.get("engine") != "piper" or rec["hash"] == piper_hash(sp, text):
                continue
        todo.append((key, sp, text))
    return todo


def piper_hash(sp: str, text: str) -> str:
    model, sid = SPEAKERS[sp]
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
    for n, (key, sp, text) in enumerate(todo, 1):
        model, sid = SPEAKERS[sp]
        if model not in loaded:
            loaded[model] = PiperVoice.load(str(VOICE_DIR / f"{model}.onnx"))
        voice = loaded[model]
        pcm = b"".join(c.audio_int16_bytes for c in voice.synthesize(text, syn_config=SynthesisConfig(speaker_id=sid, length_scale=1.1)))
        enc = lameenc.Encoder()
        enc.set_bit_rate(48)
        enc.set_in_sample_rate(voice.config.sample_rate)
        enc.set_channels(1)
        enc.set_quality(5)
        (OUT / f"{key}.mp3").write_bytes(enc.encode(pcm) + enc.flush())
        manifest[key] = {"file": f"{key}.mp3", "hash": piper_hash(sp, text), "engine": "piper"}
        if n % 20 == 0 or n == len(todo):
            print(f"{n}/{len(todo)}")
    MANIFEST.write_text(json.dumps(dict(sorted(manifest.items())), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
