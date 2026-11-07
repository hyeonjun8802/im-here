#!/usr/bin/env python3
"""Render four responsive PNGs from the image explicitly approved for v1004.

The approved image is stored as compact WebP inside five ASCII chunks for
deterministic binary transport. No old artwork is substituted.
"""
from __future__ import annotations

import base64
from hashlib import sha256
from pathlib import Path
from PIL import Image
from io import BytesIO

ROOT = Path(__file__).resolve().parents[1]
PART_DIR = ROOT / "scripts/hud-v1004"
OUT = ROOT / "public/assets/ui/hud-approved-v1004"
SOURCE_SHA256 = "8d589c554f7d879a0d8ab96fe44e445b0b3cfba840206d909cacc44c37b15f41"
SPEC = {
    "hud_desktop_high_v1004.png": (1700, 226, False),
    "hud_desktop_low_v1004.png": (850, 113, False),
    "hud_mobile_high_v1004.png": (1000, 214, True),
    "hud_mobile_low_v1004.png": (500, 107, True),
}

def restore_approved_image() -> Image.Image:
    data = "".join((PART_DIR / f"approved_source.part{i}.b64").read_text(encoding="ascii").strip() for i in range(5))
    decoded = base64.b64decode(data, validate=True)
    assert sha256(decoded).hexdigest() == SOURCE_SHA256, "Approved image checksum mismatch"
    image = Image.open(BytesIO(decoded)).convert("RGBA")
    assert image.size == (900, 120), image.size
    return image

def render(image: Image.Image, width: int, height: int, mobile: bool) -> Image.Image:
    if not mobile:
        return image.resize((width, height), Image.Resampling.LANCZOS)
    src_w, src_h = image.size
    x1, x2 = round(src_w * 930 / 2172), round(src_w * 1242 / 2172)
    t1, t2 = round(width * .390), round(width * .610)
    a = image.crop((0, 0, x1, src_h)).resize((t1, height), Image.Resampling.LANCZOS)
    b = image.crop((x1, 0, x2, src_h)).resize((t2 - t1, height), Image.Resampling.LANCZOS)
    c = image.crop((x2, 0, src_w, src_h)).resize((width - t2, height), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", (width, height))
    for x, part in [(0, a), (t1, b), (t2, c)]:
        out.alpha_composite(part, (x, 0))
    return out

def main() -> None:
    source = restore_approved_image()
    OUT.mkdir(parents=True, exist_ok=True)
    for filename, (width, height, mobile) in SPEC.items():
        dst = OUT / filename
        frame = render(source, width, height, mobile)
        frame.save(dst, format="PNG", optimize=True, compress_level=9)
        assert Image.open(dst).size == (width, height)
        assert frame.getpixel((width // 6, 0))[3] < 30
        assert frame.getpixel((width // 2, height - 1))[3] < 240
        assert frame.getpixel((width // 6, height - 1))[3] < 30
        print(f"OK {dst.relative_to(ROOT)} {width}x{height} {dst.stat().st_size} bytes")

if __name__ == "__main__":
    main()
