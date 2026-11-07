#!/usr/bin/env python3
"""Restore the 4 originally supplied PNG dimensions from approved v1004 art.

Unlike stretching the whole image, the middle medallion is scaled uniformly
and only the two flat wings are horizontally resized. This keeps it round.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public/assets/ui/hud-approved-v1004"
OUT = ROOT / "public/assets/ui/hud-reference-v1006"
OUT.mkdir(parents=True, exist_ok=True)
SPECS = {
    "hud_compact_mobile_ref_v1006.png": ("hud_mobile_high_v1004.png", 1000, 210),
    "hud_compact_desktop_ref_v1006.png": ("hud_desktop_high_v1004.png", 1700, 190),
    "hud_full_a_ref_v1006.png": ("hud_desktop_high_v1004.png", 1700, 350),
    "hud_full_b_ref_v1006.png": ("hud_desktop_high_v1004.png", 1700, 380),
}

def render(image, width, height):
    w, h = image.size
    first, last = round(w * .39), round(w * .61)
    center_width = round((last - first) * height / h)
    left_width = (width - center_width) // 2
    right_width = width - left_width - center_width
    assert left_width > 0 and center_width > 0 and right_width > 0
    result = Image.new("RGBA", (width, height))
    for box, x, out_width in [
        ((0, 0, first, h), 0, left_width),
        ((first, 0, last, h), left_width, center_width),
        ((last, 0, w, h), left_width + center_width, right_width),
    ]:
        resized = image.crop(box).resize((out_width, height), Image.Resampling.LANCZOS)
        result.alpha_composite(resized, (x, 0))
    return result

def main():
    for name, (original_name, width, height) in SPECS.items():
        image = Image.open(SRC / original_name).convert("RGBA")
        target = render(image, width, height)
        target.save(OUT / name, optimize=True)
        assert Image.open(OUT / name).size == (width, height)
        assert target.getpixel((int(width*.15),height - 1))[3] < 20
        assert target.getpixel((int(width*.50),int(height*.85)))[3] > 100
        print("PASS", name, width, height, "bytes", (OUT / name).stat().st_size)

if __name__ == "__main__":
    main()
