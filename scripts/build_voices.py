"""Free offline German audio for every word and sentence in the app (Piper TTS).

Collects all German texts the app can speak (vocab words + examples, grammar sentences, lesson examples,
Lesen texts, Sprechen example) and writes one MP3 per text to public/audio/tts/<key>.mp3.
<key> is an FNV-1a hash of the normalised text; Word.tsx computes the same key in the browser and falls back
to the browser voice when a file is missing. Voices rotate (by key) so learners hear several speakers.

Setup once (the voices are ~60-110 MB each, kept outside the repo in %LOCALAPPDATA%/piper-voices):
    python -m venv .venv
    .venv/Scripts/python -m pip install piper-tts lameenc
    .venv/Scripts/python -m piper.download_voices --data-dir "%LOCALAPPDATA%/piper-voices" ^
        de_DE-thorsten-high de_DE-kerstin-low de_DE-ramona-low de_DE-karlsson-low de_DE-mls-medium
Run (only new texts are generated):
    .venv/Scripts/python scripts/build_voices.py            # all
    .venv/Scripts/python scripts/build_voices.py --dry-run  # just count
    .venv/Scripts/python scripts/build_voices.py --limit 20 # try a few
"""
import argparse
import json
import os
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "audio" / "tts"
VOICE_DIR = Path(os.environ.get("PIPER_VOICES", Path(os.environ.get("LOCALAPPDATA", "~")) / "piper-voices")).expanduser()

# (model, speaker id or None). Change this list to change the mix; existing files are kept,
# delete public/audio/tts to regenerate everything with a new mix.
VOICES = [
    ("de_DE-thorsten-high", None),  # male, best quality
    ("de_DE-kerstin-low", None),  # female
    ("de_DE-ramona-low", None),  # female
    ("de_DE-karlsson-low", None),  # male
    ("de_DE-mls-medium", 3),  # multi-speaker model
]
KBPS = 40


def normalise(text: str) -> str:
    text = unicodedata.normalize("NFC", text).replace("___", "…")
    return re.sub(r"\s+", " ", text).strip()


def key_of(text: str) -> str:
    """FNV-1a 32-bit over UTF-8, same as audioKey() in src/components/Word.tsx."""
    h = 0x811C9DC5
    for b in normalise(text).encode("utf-8"):
        h ^= b
        h = (h * 0x01000193) & 0xFFFFFFFF
    return f"{h:08x}"


def collect() -> list[str]:
    texts: list[str] = []
    vocab = json.loads((ROOT / "src/data/vocab.json").read_text(encoding="utf-8"))
    for e in vocab["entries"]:
        texts.append(f"{e['article']} {e['lemma']}" if e.get("pos") == "noun" and e.get("article") else e["lemma"])
        if e.get("example_de"):
            texts.append(e["example_de"])

    for it in json.loads((ROOT / "src/data/grammar.json").read_text(encoding="utf-8"))["items"]:
        de = it["de"]
        if "___" not in de and " = " not in de and "→" not in de:
            texts.append(de)

    # lesson examples: examples: [["Deutsch", "English", "اردو"], ...] in lessons.ts
    lessons = (ROOT / "src/data/lessons.ts").read_text(encoding="utf-8")
    for block in re.findall(r"examples:\s*\[(.*?)\n\s*\],", lessons, re.S):
        texts += re.findall(r'\[\s*"((?:[^"\\]|\\.)*)"\s*,', block)

    lesen = json.loads((ROOT / "src/data/lesen.json").read_text(encoding="utf-8"))
    for t in lesen["tests"]:
        texts += [x["de"] for x in t["texts"].values()]
    texts.append(json.loads((ROOT / "src/data/sprechen.json").read_text(encoding="utf-8"))["intro"]["example"])

    seen, out = set(), []
    for t in texts:
        n = normalise(t)
        if n and n not in seen:
            seen.add(n)
            out.append(n)
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()

    texts = collect()
    todo = [t for t in texts if not (OUT / f"{key_of(t)}.mp3").exists()]
    if args.limit:
        todo = todo[: args.limit]
    print(f"{len(texts)} texts, {len(todo)} to generate")
    if args.dry_run or not todo:
        return

    import lameenc
    from piper import PiperVoice, SynthesisConfig

    voices = []
    for model, sid in VOICES:
        path = VOICE_DIR / f"{model}.onnx"
        if not path.exists():
            sys.exit(f"Missing voice {path}. See the setup lines at the top of this file.")
        voices.append((PiperVoice.load(str(path)), sid))

    OUT.mkdir(parents=True, exist_ok=True)
    for i, text in enumerate(todo, 1):
        key = key_of(text)
        voice, sid = voices[int(key, 16) % len(voices)]
        cfg = SynthesisConfig(speaker_id=sid, length_scale=1.08)
        pcm = b"".join(chunk.audio_int16_bytes for chunk in voice.synthesize(text, syn_config=cfg))
        enc = lameenc.Encoder()
        enc.set_bit_rate(KBPS)
        enc.set_in_sample_rate(voice.config.sample_rate)
        enc.set_channels(1)
        enc.set_quality(5)
        (OUT / f"{key}.mp3").write_bytes(enc.encode(pcm) + enc.flush())
        if i % 200 == 0 or i == len(todo):
            print(f"{i}/{len(todo)}")


if __name__ == "__main__":
    main()
