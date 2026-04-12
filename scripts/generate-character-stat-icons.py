#!/usr/bin/env python3
"""Build packages/website/public/ui/character-stat-icons.png (160x16, order matches CHARACTER_STAT_KEYS)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

REPO = Path(__file__).resolve().parents[1]
OUT = REPO / "packages/website/public/ui/character-stat-icons.png"
TILE = 16
BLK = (0, 0, 0, 255)
T = (0, 0, 0, 0)
RD = (200, 64, 64, 255)
RD2 = (150, 40, 40, 255)
WHI = (235, 235, 238, 255)
M1 = (118, 118, 122, 255)
M0 = (85, 85, 90, 255)
CY = (90, 200, 220, 255)
AU = (230, 200, 70, 255)
GR = (72, 160, 90, 255)
BLU = (80, 120, 200, 255)
ORG = (210, 130, 60, 255)


def tile() -> Image.Image:
    return Image.new("RGBA", (TILE, TILE), T)


def outline_rect(d: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill) -> None:
    d.rectangle(box, fill=fill, outline=BLK, width=1)


def outline_oval(d: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill) -> None:
    d.ellipse(box, fill=fill, outline=BLK, width=1)


def icon_health() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    d.polygon([(8, 4), (5, 7), (5, 10), (8, 13), (11, 10), (11, 7)], fill=RD, outline=BLK)
    d.point((8, 8), RD2)
    return im


def icon_evade() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    d.arc([2, 4, 14, 14], start=200, end=340, fill=BLK, width=2)
    d.polygon([(12, 3), (14, 6), (10, 6)], fill=CY, outline=BLK)
    return im


def icon_accuracy() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    d.line([(8, 2), (8, 14)], fill=BLK, width=1)
    d.line([(2, 8), (14, 8)], fill=BLK, width=1)
    outline_oval(d, (5, 5, 11, 11), T)
    d.ellipse([5, 5, 11, 11], outline=BLK, width=1)
    d.point((8, 8), RD)
    return im


def icon_reload() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (5, 4, 11, 11), M1)
    d.line([(7, 6), (9, 6)], fill=M0, width=1)
    d.polygon([(12, 12), (14, 14), (10, 14)], fill=AU, outline=BLK)
    return im


def icon_run() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    d.line([(3, 6), (1, 8)], fill=BLK, width=1)
    d.line([(5, 6), (3, 8)], fill=BLK, width=1)
    d.line([(7, 6), (5, 8)], fill=BLK, width=1)
    outline_oval(d, (8, 9, 13, 13), ORG)
    return im


def icon_luck() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    d.polygon([(8, 2), (9, 6), (13, 6), (10, 9), (11, 13), (8, 11), (5, 13), (6, 9), (3, 6), (7, 6)], fill=GR, outline=BLK)
    return im


def icon_stamina() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (4, 3, 6, 13), M0)
    d.rectangle((5, 5, 5, 11), fill=AU, outline=BLK)
    outline_rect(d, (9, 5, 12, 12), BLU)
    d.line([(10, 7), (11, 9), (10, 11)], fill=WHI, width=1)
    return im


def icon_recovery() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    d.arc([3, 3, 13, 13], start=30, end=270, fill=BLK, width=2)
    d.polygon([(11, 2), (13, 5), (9, 5)], fill=GR, outline=BLK)
    d.polygon([(5, 14), (3, 11), (7, 11)], fill=GR, outline=BLK)
    return im


def icon_hp_recovery() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (4, 6, 10, 12), WHI)
    d.line([(5, 8), (9, 8)], fill=RD, width=1)
    d.line([(7, 6), (7, 10)], fill=RD, width=1)
    d.polygon([(11, 4), (13, 6), (11, 8)], fill=GR, outline=BLK)
    return im


def icon_strength() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (3, 7, 6, 10), M1)
    outline_rect(d, (10, 7, 13, 10), M1)
    d.rectangle((6, 8, 10, 9), fill=M0, outline=BLK)
    return im


# Order MUST match packages/game-shared/src/util/character-stats.ts CHARACTER_STAT_KEYS
SPRITES = [
    icon_health,
    icon_evade,
    icon_accuracy,
    icon_reload,
    icon_run,
    icon_luck,
    icon_stamina,
    icon_recovery,
    icon_hp_recovery,
    icon_strength,
]


def main() -> None:
    assert len(SPRITES) == 10
    row = Image.new("RGBA", (TILE * len(SPRITES), TILE), T)
    for i, fn in enumerate(SPRITES):
        row.paste(fn(), (i * TILE, 0))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    row.save(OUT, format="PNG")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
