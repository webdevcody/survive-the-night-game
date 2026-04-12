#!/usr/bin/env python3
"""
144×16 strip: All + professions in PROFESSION_IDS order (game-shared professions.ts).
Output: packages/website/public/ui/crafting-tab-icons.png
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

REPO = Path(__file__).resolve().parents[1]
OUT = REPO / "packages/website/public/ui/crafting-tab-icons.png"
TILE = 16
BLK = (0, 0, 0, 255)
T = (0, 0, 0, 0)
M1 = (118, 120, 125, 255)
M0 = (85, 88, 92, 255)
M2 = (168, 170, 175, 255)
W1 = (119, 82, 66, 255)
W2 = (167, 121, 103, 255)
AU = (230, 200, 70, 255)
GRN = (72, 145, 82, 255)
GR2 = (52, 110, 62, 255)
BLU = (80, 130, 200, 255)
GLS = (200, 230, 255, 255)
RD = (190, 60, 55, 255)
ORG = (210, 120, 55, 255)


def tile() -> Image.Image:
    return Image.new("RGBA", (TILE, TILE), T)


def outline_rect(d: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill) -> None:
    d.rectangle(box, fill=fill, outline=BLK, width=1)


def outline_oval(d: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill) -> None:
    d.ellipse(box, fill=fill, outline=BLK, width=1)


def icon_all() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (3, 3, 13, 13), M0)
    d.line([(6, 6), (10, 10)], fill=AU, width=1)
    d.line([(10, 6), (6, 10)], fill=AU, width=1)
    return im


def icon_scavenging() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (4, 5, 12, 12), ORG)
    d.arc([5, 3, 11, 8], 0, 180, fill=BLK, width=1)
    return im


def icon_scrapping() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (2, 6, 6, 12), M1)
    d.polygon([(10, 3), (13, 8), (8, 8)], fill=W2, outline=BLK)
    return im


def icon_crafting() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (3, 9, 13, 13), W2)
    d.line([(5, 4), (5, 9)], fill=W1, width=2)
    outline_rect(d, (9, 5, 13, 8), M1)
    return im


def icon_gunsmithing() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (3, 6, 11, 9), M1)
    outline_rect(d, (10, 7, 12, 8), M0)
    return im


def icon_chemistry() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    outline_oval(d, (6, 3, 10, 8), GLS)
    outline_rect(d, (7, 8, 9, 13), GRN)
    return im


def icon_tailoring() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    d.line([(8, 3), (8, 12)], fill=BLK, width=1)
    outline_oval(d, (4, 5, 8, 9), BLU)
    outline_oval(d, (9, 7, 13, 11), RD)
    return im


def icon_cooking() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (3, 6, 13, 10), M1)
    d.arc([4, 3, 12, 9], 0, 180, fill=BLK, width=1)
    d.point((8, 8), ORG)
    return im


def icon_engineering() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    outline_oval(d, (3, 3, 13, 13), M0)
    d.rectangle((7, 2, 9, 14), fill=M2, outline=BLK)
    d.rectangle((2, 7, 14, 9), fill=M2, outline=BLK)
    return im


# Order: "all" then PROFESSION_IDS from professions.ts
SPRITES = [
    icon_all,
    icon_scavenging,
    icon_scrapping,
    icon_crafting,
    icon_gunsmithing,
    icon_chemistry,
    icon_tailoring,
    icon_cooking,
    icon_engineering,
]


def main() -> None:
    assert len(SPRITES) == 9  # "all" + len(PROFESSION_IDS)
    row = Image.new("RGBA", (TILE * len(SPRITES), TILE), T)
    for i, fn in enumerate(SPRITES):
        row.paste(fn(), (i * TILE, 0))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    row.save(OUT, format="PNG")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
