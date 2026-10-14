#!/usr/bin/env python3
"""Import the user's personally downloaded Tiny Swords Free Pack into Nobby World.

Usage:
    python3 scripts/import_tiny_swords.py
    python3 scripts/import_tiny_swords.py "~/Downloads/Tiny Swords (Free Pack).zip"

Copies the COMPLETE useful pack to assets/tiny-swords/, preserving directory structure.
Does not download third-party content and does not require Pillow or pip.
"""
from __future__ import annotations

import os
import sys
import zipfile
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
TARGET = PROJECT / "assets" / "tiny-swords"
PREFIX = "Tiny Swords (Free Pack)/"


def discover_zip() -> Path:
    candidates = [
        PROJECT / "Tiny Swords (Free Pack).zip",
        Path.home() / "Downloads" / "Tiny Swords (Free Pack).zip",
        Path.home() / "Desktop" / "Tiny Swords (Free Pack).zip",
    ]
    candidates += sorted((Path.home() / "Downloads").glob("Tiny*Swords*.zip"))
    for candidate in candidates:
        if candidate.is_file() and zipfile.is_zipfile(candidate):
            return candidate
    raise FileNotFoundError(
        "Tiny Swords (Free Pack).zip nicht gefunden. Lade die Original-ZIP von "
        "https://pixelfrog-assets.itch.io/tiny-swords in ~/Downloads/ herunter "
        "oder gib den Dateipfad als erstes Argument an."
    )


def main() -> int:
    path = Path(os.path.expanduser(sys.argv[1])).resolve() if len(sys.argv) > 1 else discover_zip()
    if not path.is_file() or not zipfile.is_zipfile(path):
        raise SystemExit(f"Keine gültige ZIP-Datei: {path}")
    count, bytes_written = 0, 0
    with zipfile.ZipFile(path) as archive:
        for item in archive.infolist():
            name = item.filename
            if item.is_dir() or not name.startswith(PREFIX):
                continue
            relative = Path(name[len(PREFIX):])
            if not relative.parts or (
                any(part.startswith(".") for part in relative.parts)
                or any(part in (".DS_Store", "__MACOSX", "..") for part in relative.parts)
            ):
                continue
            if relative.suffix.lower() not in (".png", ".aseprite"):
                continue
            dest = TARGET / relative
            if not dest.resolve().is_relative_to(TARGET.resolve()):
                raise RuntimeError("Unsicherer ZIP-Eintrag: " + name)
            dest.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(item) as source, dest.open("wb") as sink:
                while True:
                    chunk = source.read(131072)
                    if not chunk:
                        break
                    sink.write(chunk)
                    bytes_written += len(chunk)
            count += 1
    required = (
        "Terrain/Tileset/Tilemap_color1.png",
        "Terrain/Resources/Wood/Trees/Tree1.png",
        "Units/Blue Units/Monk/Idle.png",
        "Units/Blue Units/Monk/Run.png",
    )
    missing = [name for name in required if not (TARGET / name).is_file()]
    if missing:
        raise RuntimeError("Dateien fehlen im Pack: " + ", ".join(missing))
    print(f"Tiny Swords importiert: {count} Dateien, {bytes_written / 1048576:.2f} MiB")
    print(f"Ziel: {TARGET}")
    print("Spiel: http://localhost:8088/ (Browser neu laden, ggf. Cmd+Shift+R)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
