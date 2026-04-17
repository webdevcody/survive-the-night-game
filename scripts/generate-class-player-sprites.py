#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

from PIL import Image

TILE = 16
FRAMES = 3

ROOT = Path(__file__).resolve().parent.parent
SHEET_PATH = ROOT / "packages/website/public/sheets/characters-sheet.png"

SRC_ROWS = {
    "up": 96,
    "down": 112,
    "left": 128,
}

CLASS_LAYOUTS = {
    "survivor": {
        "start_x": 0,
        "rows": {"up": 176, "down": 144, "left": 160},
    },
    "scavenger": {
        "start_x": 64,
        "rows": {"up": 176, "down": 144, "left": 160},
    },
    "medic": {
        "start_x": 112,
        "rows": {"up": 176, "down": 144, "left": 160},
    },
}

BASE_BODY = (27, 36, 45, 255)
BASE_LEGS = (61, 95, 123, 255)

CLASS_PALETTES = {
    "survivor": {
        "body": (54, 84, 50, 255),
        "legs": (90, 127, 72, 255),
        "accent": (117, 79, 42, 255),
        "accent_light": (160, 118, 70, 255),
        "mark": (175, 214, 121, 255),
    },
    "scavenger": {
        "body": (82, 69, 44, 255),
        "legs": (144, 103, 52, 255),
        "accent": (190, 121, 49, 255),
        "accent_light": (225, 170, 79, 255),
        "mark": (112, 85, 56, 255),
    },
    "medic": {
        "body": (198, 205, 208, 255),
        "legs": (77, 132, 136, 255),
        "accent": (176, 54, 54, 255),
        "accent_light": (239, 104, 104, 255),
        "mark": (245, 241, 231, 255),
    },
}


def put_if_opaque(tile: Image.Image, x: int, y: int, color: tuple[int, int, int, int]) -> None:
    if not (0 <= x < TILE and 0 <= y < TILE):
        return
    if tile.getpixel((x, y))[3] == 0:
        return
    tile.putpixel((x, y), color)


def recolor_base(tile: Image.Image, palette: dict[str, tuple[int, int, int, int]]) -> None:
    for y in range(TILE):
        for x in range(TILE):
            pixel = tile.getpixel((x, y))
            if pixel == BASE_BODY:
                tile.putpixel((x, y), palette["body"])
            elif pixel == BASE_LEGS:
                tile.putpixel((x, y), palette["legs"])


def paint_survivor(tile: Image.Image, direction: str, frame: int) -> None:
    p = CLASS_PALETTES["survivor"]
    if direction == "down":
      strap = [(5, 6), (6, 7), (7, 8), (8, 9), (9, 10)]
      for x, y in strap:
          put_if_opaque(tile, x, y, p["accent"])
      for x, y in [(10, 6), (11, 7), (4, 6)]:
          put_if_opaque(tile, x, y, p["accent_light"])
      for x, y in [(6, 5), (9, 5)]:
          put_if_opaque(tile, x, y, p["mark"])
    elif direction == "up":
      for x in range(4, 12):
          put_if_opaque(tile, x, 6, p["accent"])
      for x in range(4, 12):
          put_if_opaque(tile, x, 7, p["accent"])
      for x, y in [(5, 8), (10, 8), (6, 9), (9, 9)]:
          put_if_opaque(tile, x, y, p["accent_light"])
    else:
      for x, y in [(9, 6), (10, 6), (10, 7), (11, 7), (10, 8), (11, 8), (10, 9)]:
          put_if_opaque(tile, x, y, p["accent"])
      if frame == 1:
          put_if_opaque(tile, 11, 9, p["accent_light"])


def paint_scavenger(tile: Image.Image, direction: str, frame: int) -> None:
    p = CLASS_PALETTES["scavenger"]
    if direction == "down":
      for x, y in [(5, 5), (6, 5), (7, 5), (8, 5), (9, 5), (10, 5)]:
          put_if_opaque(tile, x, y, p["accent"])
      for x, y in [(4, 7), (5, 7), (10, 7), (11, 7), (5, 10), (10, 10)]:
          put_if_opaque(tile, x, y, p["mark"])
    elif direction == "up":
      for x in range(4, 12):
          put_if_opaque(tile, x, 5, p["accent"])
      for x in range(4, 12):
          put_if_opaque(tile, x, 6, p["accent_light"])
      for x, y in [(4, 8), (5, 8), (10, 8), (11, 8), (5, 9), (10, 9)]:
          put_if_opaque(tile, x, y, p["mark"])
    else:
      for x, y in [(9, 6), (10, 6), (11, 6), (10, 7), (11, 7), (10, 8), (11, 8), (9, 9)]:
          put_if_opaque(tile, x, y, p["accent"])
      for x, y in [(7, 5), (8, 5), (7, 6)]:
          put_if_opaque(tile, x, y, p["accent_light"])
      if frame == 2:
          put_if_opaque(tile, 10, 9, p["mark"])


def paint_medic(tile: Image.Image, direction: str, frame: int) -> None:
    p = CLASS_PALETTES["medic"]
    if direction == "down":
      cross = [(7, 7), (6, 8), (7, 8), (8, 8), (7, 9)]
      for x, y in cross:
          put_if_opaque(tile, x, y, p["accent"])
      for x, y in [(5, 6), (9, 6), (5, 10), (9, 10)]:
          put_if_opaque(tile, x, y, p["mark"])
    elif direction == "up":
      cross = [(7, 7), (6, 8), (7, 8), (8, 8), (7, 9)]
      for x, y in cross:
          put_if_opaque(tile, x, y, p["accent"])
      for x, y in [(5, 6), (9, 6)]:
          put_if_opaque(tile, x, y, p["mark"])
    else:
      for x, y in [(9, 7), (10, 7), (11, 7), (10, 8), (11, 8), (10, 9)]:
          put_if_opaque(tile, x, y, p["accent"])
      for x, y in [(7, 6), (8, 6), (7, 7)]:
          put_if_opaque(tile, x, y, p["mark"])
      if frame == 1:
          put_if_opaque(tile, 10, 6, p["accent_light"])


PAINTERS = {
    "survivor": paint_survivor,
    "scavenger": paint_scavenger,
    "medic": paint_medic,
}


def main() -> None:
    sheet = Image.open(SHEET_PATH).convert("RGBA")

    for class_id, layout in CLASS_LAYOUTS.items():
        start_x = layout["start_x"]
        for direction, src_y in SRC_ROWS.items():
            dst_y = layout["rows"][direction]
            for frame in range(FRAMES):
                src_x = frame * TILE
                tile = sheet.crop((src_x, src_y, src_x + TILE, src_y + TILE))
                recolor_base(tile, CLASS_PALETTES[class_id])
                PAINTERS[class_id](tile, direction, frame)
                sheet.paste(tile, (start_x + frame * TILE, dst_y))

    sheet.save(SHEET_PATH)


if __name__ == "__main__":
    main()
