#!/usr/bin/env python3
"""Build four low-glare, square-ended transparent PNG HUD frames.
Existing v1000 artwork stays the source of truth; keep central medallion & slots.
Runs in CI once, commits generated assets, not during the browser render loop.
"""
from PIL import Image
from pathlib import Path
import math

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public/assets/ui/afterday-premium-v1000"
OUT = ROOT / "public/assets/ui/hud-square-fade"
OUT.mkdir(parents=True, exist_ok=True)
VARIANTS = [
    ("mobile/compact_complete_hud_frame.png","hud_compact_a_square_fade.png",(1000,210),106,104),
    ("desktop/compact_complete_hud_frame.png","hud_compact_b_square_fade.png",(1700,190),186,191),
    ("desktop/complete_empty_hud_frame.png","hud_full_a_square_fade.png",(1700,350),174,204),
    ("desktop/complete_empty_hud_frame.png","hud_full_b_square_fade.png",(1700,380),164,180),
]
def smooth(x):
    x = max(0., min(1., x))
    return x*x*(3-2*x)

def create(src, dest, dims, lcap, rcap):
    original = Image.open(SRC / src).convert("RGBA")
    if original.size != dims:
        original = original.resize(dims, Image.Resampling.LANCZOS)
    w,h=original.size
    px=original.load()
    # The panel extends through the body, but not through the medallion crown.
    # Use only columns far away from the circle to determine its top/bottom.
    ys=[y for y in range(h) if px[int(w*.30),y][3]>115 and px[int(w*.75),y][3]>115]
    if not ys:
        raise ValueError(f"Cannot locate horizontal panel in {src}")
    top,bottom=min(ys),max(ys)
    out=original.copy()
    dst=out.load()
    for is_left,cap in [(True,lcap),(False,rcap)]:
        limit=cap+36
        for i in range(limit):
            x=i if is_left else w-1-i
            distance=x if is_left else w-1-x
            donor_x=int(w*.74 + 34*math.sin(i*.044)+12*math.sin(i*.113))
            donor_x=max(int(w*.67),min(int(w*.80),donor_x))
            t=smooth((distance-cap+26)/62)
            blend=1.0-t if distance>cap-26 else 1.0
            fade=smooth((distance+1)/max(34,w*.034))
            saturation=.21+.68*min(1.,distance/max(1,cap))
            for y in range(h):
                old=px[x,y]
                if top<=y<=bottom:
                    donor=px[donor_x,y]
                    color=tuple(int(14*(1-saturation)+donor[0]*saturation) if z==0
                           else int(31*(1-saturation)+donor[1]*saturation) if z==1
                           else int(46*(1-saturation)+donor[2]*saturation)
                           for z in range(3))
                    new=(*color,int(255*fade))
                else:
                    new=(0,0,0,0)
                dst[x,y]=tuple(round(new[k]*blend+old[k]*(1-blend)) for k in range(4))
    out.save(OUT/dest,optimize=True)
    print(f"CREATED {dest} {w}x{h} panel={top}:{bottom}")

if __name__=="__main__":
    for x in VARIANTS: create(*x)
