#!/usr/bin/env python3
"""
256×16 horizontal strip: ability icons in `ABILITY_IDS` order
(packages/game-shared/src/util/ability-tree.ts).

Output: packages/website/public/ui/ability-icons.png

Requires Pillow, e.g. `uv run --with pillow python scripts/generate-ability-icons.py`
or `python3 -m venv .venv && .venv/bin/pip install pillow && .venv/bin/python scripts/generate-ability-icons.py`.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

REPO = Path(__file__).resolve().parents[1]
OUT = REPO / "packages/website/public/ui/ability-icons.png"
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
GR2 = (52, 110, 62, 255)
BLU = (80, 120, 200, 255)
BL2 = (60, 90, 160, 255)
ORG = (210, 130, 60, 255)
YLW = (240, 210, 70, 255)
PRP = (140, 90, 180, 255)
GLS = (200, 230, 255, 255)


def tile() -> Image.Image:
    return Image.new("RGBA", (TILE, TILE), T)


def outline_rect(d: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill) -> None:
    d.rectangle(box, fill=fill, outline=BLK, width=1)


def outline_oval(d: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill) -> None:
    d.ellipse(box, fill=fill, outline=BLK, width=1)


def icon_sprint() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    # Boot
    outline_oval(d, (7, 6, 13, 12), M1)
    d.polygon([(6, 12), (10, 12), (9, 14), (4, 14)], fill=M0, outline=BLK)
    # Speed lines
    d.line([(2, 5), (5, 5)], fill=BLK, width=1)
    d.line([(1, 7), (4, 7)], fill=BLK, width=1)
    d.line([(2, 9), (5, 9)], fill=BLK, width=1)
    return im


def icon_regenerate() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    d.polygon([(8, 3), (5, 6), (5, 9), (8, 12), (11, 9), (11, 6)], fill=GR, outline=BLK)
    d.point((8, 8), GR2)
    return im


def icon_adrenaline() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    d.polygon([(9, 2), (7, 6), (9, 6), (8, 14), (10, 8), (8, 8), (11, 2)], fill=YLW, outline=BLK)
    d.polygon([(4, 4), (3, 7), (5, 7), (4, 12), (6, 8), (5, 7), (6, 4)], fill=RD, outline=BLK)
    return im


def icon_stealth() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    outline_oval(d, (3, 5, 13, 12), M0)
    d.ellipse([5, 7, 7, 9], fill=WHI, outline=BLK)
    d.ellipse([9, 7, 11, 9], fill=WHI, outline=BLK)
    d.line([(2, 4), (14, 11)], fill=BLK, width=1)
    return im


def icon_pack_rat() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (5, 5, 11, 12), BL2)
    d.line([(8, 5), (8, 4), (6, 4), (6, 5)], fill=BLK, width=1)
    outline_rect(d, (6, 7, 10, 10), M1)
    return im


def icon_hercules() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (2, 7, 5, 10), M1)
    outline_rect(d, (11, 7, 14, 10), M1)
    d.rectangle((5, 8, 11, 9), fill=M0, outline=BLK)
    d.rectangle((7, 6, 9, 8), fill=ORG, outline=BLK)
    return im


def icon_combat_shield() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    d.polygon([(8, 3), (4, 5), (4, 10), (8, 13), (12, 10), (12, 5)], fill=BLU, outline=BLK)
    d.line([(8, 6), (8, 10)], fill=BLK, width=1)
    d.line([(6, 8), (10, 8)], fill=BLK, width=1)
    return im


def icon_track_star() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (4, 4, 6, 11), M0)
    d.rectangle((5, 6, 5, 9), fill=AU, outline=BLK)
    outline_rect(d, (8, 3, 12, 12), BLU)
    d.polygon([(10, 4), (9, 7), (11, 7)], fill=YLW, outline=BLK)
    return im


def icon_combat_roll() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    d.arc([3, 4, 13, 13], start=200, end=520, fill=BLK, width=2)
    d.polygon([(12, 4), (14, 7), (10, 7)], fill=CY, outline=BLK)
    return im


def icon_brawler() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    outline_oval(d, (5, 6, 11, 12), ORG)
    d.line([(5, 4), (5, 7)], fill=BLK, width=2)
    d.line([(11, 4), (11, 7)], fill=BLK, width=2)
    return im


def icon_head_shot() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    outline_oval(d, (5, 4, 11, 10), M1)
    d.line([(8, 2), (8, 14)], fill=BLK, width=1)
    d.line([(2, 8), (14, 8)], fill=BLK, width=1)
    d.ellipse([6, 6, 10, 9], outline=BLK, width=1)
    d.point((8, 7), RD)
    return im


def icon_aim_knee() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    # Bent leg silhouette
    d.line([(10, 3), (10, 8), (6, 11), (6, 14)], fill=BLK, width=2)
    outline_oval(d, (8, 9, 12, 12), RD)
    d.line([(3, 5), (8, 10)], fill=CY, width=1)
    d.polygon([(2, 5), (4, 3), (4, 7)], fill=CY, outline=BLK)
    return im


def icon_detox() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (6, 3, 10, 11), GLS)
    d.line([(8, 5), (8, 9)], fill=GR, width=1)
    outline_oval(d, (5, 11, 11, 14), GR)
    d.line([(3, 4), (5, 6)], fill=PRP, width=1)
    return im


def icon_lock_picking() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    outline_oval(d, (8, 5, 13, 10), AU)
    d.rectangle((8, 8, 9, 12), fill=M1, outline=BLK)
    d.line([(3, 3), (8, 8)], fill=M0, width=1)
    d.line([(3, 3), (3, 6)], fill=M0, width=1)
    return im


def icon_counter_attack() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    d.polygon([(12, 3), (10, 6), (13, 6)], fill=RD, outline=BLK)
    d.line([(6, 8), (12, 8)], fill=BLK, width=2)
    d.polygon([(4, 8), (7, 5), (7, 11)], fill=CY, outline=BLK)
    return im


def icon_sneak() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    outline_oval(d, (5, 5, 11, 9), M1)
    d.line([(4, 10), (12, 10)], fill=BLK, width=1)
    d.line([(3, 12), (5, 10)], fill=BLK, width=1)
    d.line([(13, 12), (11, 10)], fill=BLK, width=1)
    d.line([(2, 7), (4, 6)], fill=BLK, width=1)
    return im


# Order MUST match packages/game-shared/src/util/ability-tree.ts ABILITY_IDS
SPRITES = [
    icon_sprint,
    icon_regenerate,
    icon_adrenaline,
    icon_stealth,
    icon_pack_rat,
    icon_hercules,
    icon_combat_shield,
    icon_track_star,
    icon_combat_roll,
    icon_brawler,
    icon_head_shot,
    icon_aim_knee,
    icon_detox,
    icon_lock_picking,
    icon_counter_attack,
    icon_sneak,
]


def main() -> None:
    assert len(SPRITES) == 16
    row = Image.new("RGBA", (TILE * len(SPRITES), TILE), T)
    for i, fn in enumerate(SPRITES):
        row.paste(fn(), (i * TILE, 0))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    row.save(OUT, format="PNG")
    print(f"Wrote {OUT} ({row.width}x{row.height})")


if __name__ == "__main__":
    main()
