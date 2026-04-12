#!/usr/bin/env python3
"""Add16x16 workbench / forge / chemistry_table tiles to items-sheet (row y=224)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

REPO = Path(__file__).resolve().parents[1]
SHEET = REPO / "packages/website/public/sheets/items-sheet.png"
TILE = 16
BLK = (0, 0, 0, 255)
T = (0, 0, 0, 0)
W0 = (95, 62, 48, 255)
W1 = (119, 82, 66, 255)
W2 = (167, 121, 103, 255)
M0 = (85, 88, 92, 255)
M1 = (118, 120, 125, 255)
M2 = (168, 170, 175, 255)
ORG = (220, 90, 40, 255)
RED = (200, 55, 45, 255)
YLW = (255, 200, 70, 255)
GRN = (52, 180, 130, 255)
GR2 = (40, 130, 95, 255)
GLS = (200, 230, 255, 255)
STN = (90, 88, 95, 255)


def tile() -> Image.Image:
    return Image.new("RGBA", (TILE, TILE), T)


def outline_rect(d: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill) -> None:
    d.rectangle(box, fill=fill, outline=BLK, width=1)


def outline_oval(d: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill) -> None:
    d.ellipse(box, fill=fill, outline=BLK, width=1)


def spr_chemistry_table() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (2, 11, 14, 14), W1)
    outline_rect(d, (3, 12, 6, 13), GR2)
    outline_oval(d, (8, 4, 12, 9), GLS)
    d.rectangle((9, 2, 11, 5), fill=GRN, outline=BLK)
    d.point((10, 1), BLK)
    return im


def spr_forge() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (2, 10, 14, 14), STN)
    d.polygon([(8, 3), (4, 10), (12, 10)], fill=M1, outline=BLK)
    outline_oval(d, (5, 11, 11, 14), RED)
    d.point((7, 12), YLW)
    d.point((9, 12), ORG)
    return im


def spr_workbench() -> Image.Image:
    im = tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (2, 9, 14, 14), W2)
    d.line([(4, 9), (4, 4)], fill=W0, width=2)
    outline_rect(d, (9, 5, 13, 8), M1)
    d.line([(10, 6), (12, 7)], fill=M2, width=1)
    return im


# Pasted at these sheet coordinates (must match environment-configs.ts)
PATCHES: list[tuple[int, int, callable]] = [
    (0, 224, spr_chemistry_table),
    (16, 224, spr_forge),
    (32, 224, spr_workbench),
]


def main() -> None:
    img = Image.open(SHEET).convert("RGBA")
    w, h = img.size
    nh = max(h, 240)
    if nh > h:
        out = Image.new("RGBA", (w, nh), T)
        out.paste(img, (0, 0))
        img = out
    for gx, gy, fn in PATCHES:
        img.paste(fn(), (gx, gy))
    img.save(SHEET, format="PNG")
    print(f"Wrote {SHEET} ({img.size[0]}x{img.size[1]}), crafting stations at y=224.")


if __name__ == "__main__":
    main()
