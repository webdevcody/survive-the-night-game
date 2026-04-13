#!/usr/bin/env python3
"""
One-off helper: extend items-sheet.png and paint missing 16x16 cells referenced by
item/resource configs (rows y>=160). Run from repo root:

  python3 scripts/patch-items-sheet-sprites.py

Requires: pip install pillow
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

REPO = Path(__file__).resolve().parents[1]
SHEET = REPO / "packages/website/public/sheets/items-sheet.png"
TILE = 16

# Match existing sheet: black outline + muted fills
BLK = (0, 0, 0, 255)
T = (0, 0, 0, 0)
M0 = (85, 85, 88, 255)
M1 = (118, 118, 122, 255)
M2 = (168, 168, 175, 255)
W0 = (95, 62, 48, 255)
W1 = (119, 82, 66, 255)
W2 = (167, 121, 103, 255)
L0 = (92, 58, 38, 255)
L1 = (130, 82, 54, 255)
G0 = (48, 110, 62, 255)
G1 = (72, 145, 82, 255)
PCB = (52, 92, 58, 255)
PC1 = (78, 130, 70, 255)
AU = (210, 190, 60, 255)
RD = (180, 52, 52, 255)
RD2 = (130, 32, 32, 255)
BLU = (70, 110, 180, 255)
WTR = (120, 180, 220, 255)
WHI = (230, 230, 232, 255)
CRM = (240, 228, 200, 255)
ORG = (200, 110, 50, 255)


def new_tile() -> Image.Image:
    return Image.new("RGBA", (TILE, TILE), T)


def outline_oval(d: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill) -> None:
    d.ellipse(box, fill=fill, outline=BLK, width=1)


def outline_rect(d: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill) -> None:
    d.rectangle(box, fill=fill, outline=BLK, width=1)


def paste(sheet: Image.Image, im: Image.Image, gx: int, gy: int) -> None:
    sheet.paste(im, (gx, gy), im)


def spr_scrap_metal() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (4, 6, 13, 12), M1)
    d.line([(6, 8), (11, 10)], fill=M0, width=1)
    d.point((8, 7), M2)
    return im


def spr_mechanical_parts() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    outline_oval(d, (2, 3, 9, 9), M1)
    outline_oval(d, (8, 8, 15, 14), M0)
    d.arc([5, 5, 12, 12], start=200, end=340, fill=BLK, width=1)
    return im


def spr_gun_parts() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (3, 5, 11, 8), M1)
    outline_rect(d, (9, 9, 14, 11), M0)
    outline_oval(d, (5, 11, 9, 15), M2)
    d.point((12, 6), BLK)
    return im


def spr_electronics() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (3, 6, 13, 13), PCB)
    d.line([(5, 8), (11, 8)], fill=AU, width=1)
    d.line([(7, 10), (10, 10)], fill=PC1, width=1)
    outline_rect(d, (10, 4, 14, 7), M1)
    return im


def spr_chemical() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (6, 3, 10, 5), M2)
    outline_rect(d, (5, 5, 11, 13), WTR)
    d.rectangle((6, 9, 10, 12), fill=G1, outline=BLK)
    return im


def spr_leather() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (4, 5, 13, 10), L1)
    d.line([(6, 7), (11, 8)], fill=L0, width=1)
    d.point((9, 6), W2)
    return im


def spr_can() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (5, 4, 11, 13), RD2)
    outline_rect(d, (5, 4, 11, 6), M1)
    d.point((8, 9), CRM)
    return im


def spr_herbs() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    outline_oval(d, (4, 9, 10, 14), G0)
    d.polygon([(8, 3), (5, 10), (11, 10)], fill=G1, outline=BLK)
    d.polygon([(11, 5), (8, 11), (14, 11)], fill=G0, outline=BLK)
    return im


def spr_water() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (6, 4, 10, 6), M1)
    outline_rect(d, (5, 6, 11, 13), BLU)
    d.line([(7, 8), (9, 11)], fill=WTR, width=1)
    return im


def spr_bundle_metal() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (2, 7, 7, 12), M0)
    outline_rect(d, (6, 5, 12, 10), M1)
    outline_rect(d, (9, 8, 14, 13), M2)
    return im


def spr_bundle_parts() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    outline_oval(d, (3, 4, 9, 9), M1)
    outline_rect(d, (8, 7, 14, 11), W1)
    d.line([(5, 11), (12, 5)], fill=M0, width=1)
    return im


def spr_bundle_gun() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (3, 5, 13, 11), W1)
    outline_rect(d, (5, 6, 11, 9), M1)
    d.rectangle((6, 7, 10, 8), fill=M0, outline=BLK)
    d.point((12, 7), BLK)
    return im


def spr_bundle_elec() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (3, 6, 13, 13), W1)
    outline_rect(d, (5, 8, 11, 11), PCB)
    d.line([(6, 9), (10, 9)], fill=AU, width=1)
    return im


def spr_wraps() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (4, 5, 12, 11), W2)
    d.line([(5, 7), (11, 9)], fill=W0, width=1)
    return im


def spr_scout_pack() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (5, 5, 11, 12), ORG)
    outline_rect(d, (7, 3, 9, 6), M1)
    d.line([(7, 8), (9, 8)], fill=BLK, width=1)
    return im


def spr_boots() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    outline_oval(d, (3, 9, 8, 14), L1)
    outline_oval(d, (8, 9, 13, 14), L1)
    d.rectangle((5, 5, 7, 10), fill=L0, outline=BLK)
    d.rectangle((10, 5, 12, 10), fill=L0, outline=BLK)
    return im


def spr_mask() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (4, 7, 12, 11), CRM)
    outline_rect(d, (5, 5, 11, 7), M1)
    d.line([(6, 9), (10, 9)], fill=M0, width=1)
    return im


def spr_poncho() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    d.polygon([(8, 3), (3, 6), (4, 13), (12, 13), (13, 6)], fill=W2, outline=BLK)
    d.line([(8, 6), (8, 11)], fill=W0, width=1)
    return im


def spr_satchel() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (4, 6, 12, 12), ORG)
    d.arc([6, 4, 10, 9], 0, 180, fill=BLK, width=1)
    return im


def spr_plating() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (3, 4, 13, 12), M1)
    d.line([(5, 6), (11, 9)], fill=M0, width=1)
    d.point((7, 8), M2)
    return im


def spr_gloves() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    outline_oval(d, (3, 6, 9, 12), L1)
    outline_oval(d, (8, 7, 14, 13), L1)
    return im


def spr_syringe() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (7, 2, 9, 6), M2)
    outline_rect(d, (6, 6, 10, 13), WHI)
    d.rectangle((7, 9, 9, 12), fill=RD, outline=BLK)
    return im


def spr_stim() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (5, 6, 11, 12), RD2)
    outline_oval(d, (6, 3, 10, 7), M1)
    d.point((8, 9), CRM)
    return im


def spr_hood() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    d.polygon([(8, 3), (4, 7), (4, 12), (12, 12), (12, 7)], fill=W2, outline=BLK)
    d.ellipse([6, 8, 10, 12], fill=W0, outline=BLK)
    return im


def spr_vest() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (4, 5, 12, 12), W2)
    d.line([(8, 5), (8, 12)], fill=W0, width=1)
    d.line([(5, 8), (11, 8)], fill=W0, width=1)
    return im


def spr_pants() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (5, 4, 11, 7), M1)
    outline_rect(d, (5, 7, 8, 13), BLU)
    outline_rect(d, (9, 7, 12, 13), BLU)
    return im


def spr_survivor_boots() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    outline_oval(d, (2, 9, 7, 14), M1)
    outline_oval(d, (9, 9, 14, 14), M1)
    d.rectangle((4, 5, 6, 10), fill=M0, outline=BLK)
    d.rectangle((11, 5, 13, 10), fill=M0, outline=BLK)
    return im


def spr_cloak() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    d.polygon([(8, 2), (2, 6), (3, 14), (13, 14), (14, 6)], fill=G0, outline=BLK)
    d.line([(8, 5), (8, 12)], fill=G1, width=1)
    return im


def spr_duster() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    d.polygon([(8, 2), (3, 5), (4, 14), (12, 14), (13, 5)], fill=L0, outline=BLK)
    outline_rect(d, (6, 6, 10, 11), L1)
    return im


def spr_trail_mix() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (4, 5, 12, 12), ORG)
    d.point((6, 8), AU)
    d.point((9, 7), RD)
    d.point((7, 10), G1)
    return im


def spr_stew_can() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (5, 4, 11, 13), ORG)
    outline_rect(d, (5, 4, 11, 6), M2)
    d.rectangle((6, 8, 10, 11), fill=CRM, outline=BLK)
    return im


def spr_rations() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (4, 6, 12, 11), RD2)
    d.line([(5, 8), (11, 8)], fill=CRM, width=1)
    return im


def spr_protein() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    outline_oval(d, (3, 9, 13, 13), WHI)
    outline_rect(d, (5, 5, 11, 9), RD)
    d.point((7, 7), M2)
    return im


def spr_hearty_stew() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    outline_oval(d, (3, 8, 13, 14), M1)
    d.ellipse([4, 6, 12, 11], fill=ORG, outline=BLK)
    d.point((8, 9), G1)
    return im


def spr_feast() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    d.line([(8, 3), (8, 12)], fill=W1, width=2)
    outline_oval(d, (4, 5, 9, 9), RD)
    outline_oval(d, (9, 6, 14, 10), ORG)
    return im


def spr_paper() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (4, 3, 11, 12), CRM)
    d.polygon([(9, 3), (11, 5), (9, 5)], fill=WHI, outline=BLK)
    d.line([(6, 6), (9, 6)], fill=M1, width=1)
    d.line([(6, 8), (9, 8)], fill=M1, width=1)
    d.line([(6, 10), (8, 10)], fill=M1, width=1)
    return im


def spr_sign() -> Image.Image:
    im = new_tile()
    d = ImageDraw.Draw(im)
    outline_rect(d, (3, 3, 12, 8), W1)
    outline_rect(d, (5, 4, 10, 7), CRM)
    d.point((8, 5), RD2)
    d.line([(6, 6), (9, 6)], fill=M1, width=1)
    d.rectangle((7, 8, 8, 14), fill=W0, outline=BLK)
    d.rectangle((6, 13, 9, 14), fill=W2, outline=BLK)
    return im


PATCHES: list[tuple[int, int, callable]] = [
    (16, 160, spr_scrap_metal),
    (32, 160, spr_mechanical_parts),
    (48, 160, spr_gun_parts),
    (64, 160, spr_electronics),
    (80, 160, spr_chemical),
    (96, 160, spr_leather),
    (112, 160, spr_can),
    (128, 160, spr_herbs),
    (144, 160, spr_water),
    (0, 176, spr_bundle_metal),
    (16, 176, spr_bundle_parts),
    (32, 176, spr_bundle_gun),
    (48, 176, spr_bundle_elec),
    (64, 176, spr_wraps),
    (80, 176, spr_scout_pack),
    (96, 176, spr_boots),
    (112, 176, spr_mask),
    (128, 176, spr_poncho),
    (144, 176, spr_satchel),
    (0, 192, spr_plating),
    (16, 192, spr_gloves),
    (32, 192, spr_syringe),
    (48, 192, spr_stim),
    (64, 192, spr_hood),
    (80, 192, spr_vest),
    (96, 192, spr_pants),
    (112, 192, spr_survivor_boots),
    (128, 192, spr_cloak),
    (144, 192, spr_duster),
    (0, 208, spr_trail_mix),
    (16, 208, spr_stew_can),
    (32, 208, spr_rations),
    (48, 208, spr_protein),
    (64, 208, spr_hearty_stew),
    (80, 208, spr_feast),
    (96, 208, spr_paper),
    (112, 208, spr_sign),
]


def main() -> None:
    old = Image.open(SHEET).convert("RGBA")
    ow, oh = old.size
    nw, nh = max(ow, 160), max(oh, 224)
    out = Image.new("RGBA", (nw, nh), T)
    out.paste(old, (0, 0))
    for gx, gy, fn in PATCHES:
        paste(out, fn(), gx, gy)
    out.save(SHEET, format="PNG")
    print(f"Wrote {SHEET} ({nw}x{nh}), patched {len(PATCHES)} tiles.")


if __name__ == "__main__":
    main()
