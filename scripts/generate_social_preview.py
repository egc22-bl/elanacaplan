#!/usr/bin/env python3
"""One-off generator for public/static/og-social.png (1200x630). Run from repo root."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
OUT = Path(__file__).resolve().parent.parent / "public" / "static" / "og-social.png"
FONT_DIR = Path("/System/Library/Fonts/Supplemental")

HEADLINE = (
    "When every team is busy but execution still feels harder than it should."
)
SUBLINE = "Elana Caplan / Diagnostic operational leadership"

# Site tokens (styles.css :root)
FIELD = (18, 23, 34)
FIELD_DEEP = (23, 27, 38)
INK = (235, 230, 215)
INK_SOFT = (196, 191, 178)
SIGNAL = (116, 210, 208)


def load_font(name: str, size: int) -> ImageFont.FreeTypeFont:
    path = FONT_DIR / name
    return ImageFont.truetype(str(path), size)


def wrap_lines(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current: list[str] = []
    for word in words:
        trial = " ".join(current + [word])
        if draw.textlength(trial, font=font) <= max_width:
            current.append(word)
        else:
            if current:
                lines.append(" ".join(current))
            current = [word]
    if current:
        lines.append(" ".join(current))
    return lines


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)

    img = Image.new("RGB", (W, H), FIELD)
    draw = ImageDraw.Draw(img)

    # Subtle vertical gradient + corner glow (site-adjacent)
    for y in range(H):
        t = y / (H - 1) if H > 1 else 0
        r = int(FIELD[0] + (FIELD_DEEP[0] - FIELD[0]) * t)
        g_ = int(FIELD[1] + (FIELD_DEEP[1] - FIELD[1]) * t)
        b = int(FIELD[2] + (FIELD_DEEP[2] - FIELD[2]) * t)
        draw.line([(0, y), (W, y)], fill=(r, g_, b))

    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse((-120, -80, 520, 420), fill=(*SIGNAL, 28))
    gdraw.ellipse((720, 380, 1320, 780), fill=(42, 48, 72, 55))
    img = Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")
    draw = ImageDraw.Draw(img)

    pad_x, pad_y = 88, 96
    text_max = W - 2 * pad_x

    font_head = load_font("Arial Bold.ttf", 46)
    font_sub = load_font("Arial.ttf", 26)

    lines = wrap_lines(draw, HEADLINE, font_head, text_max)
    line_height = int(font_head.size * 1.22)
    block_h = len(lines) * line_height
    sub_gap = 36
    y = pad_y + 8

    for line in lines:
        draw.text((pad_x, y), line, font=font_head, fill=INK)
        y += line_height

    y += sub_gap
    draw.text((pad_x, y), SUBLINE, font=font_sub, fill=INK_SOFT)

    # Thin accent line (signal)
    draw.line([(pad_x, pad_y - 20), (pad_x + 120, pad_y - 20)], fill=SIGNAL, width=3)

    img.save(OUT, format="PNG", optimize=True)
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
