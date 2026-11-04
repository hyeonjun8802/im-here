#!/usr/bin/env python3
"""AFTERDAY premium appearance QA — compare REAL images, never synthesize results.

Examples:
  python3 scripts/compare_premium_frames_v600.py \
    --before docs/qa/baseline-v520/01_clear_day_desktop.png \
    --after docs/qa/live-v600/01_clear_day_desktop.png \
    --reference /path/to/licensed-frostpunk-reference.jpg \
    --output docs/qa/comparisons/day
  python3 scripts/compare_premium_frames_v600.py --before before.png --after after.png
"""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageStat, ImageDraw, ImageFont, ImageFilter

def measurements(img):
    image=img.convert("RGB")
    preview=image.copy()
    preview.thumbnail((600,600))
    rgb=list(preview.getdata())
    count=max(1,len(rgb))
    lum=[.2126*r+.7152*g+.0722*b for r,g,b in rgb]
    val=sorted(lum)
    hsv=preview.convert("HSV")
    saturation=ImageStat.Stat(hsv.getchannel("S")).mean[0]/255
    edge=ImageStat.Stat(preview.convert("L").filter(ImageFilter.FIND_EDGES)).mean[0]/255
    return {
       "size":list(image.size),
       "mean_luminance_0_1":round(sum(lum)/count/255,4),
       "shadow_p10_0_1":round(val[int((count-1)*.10)]/255,4),
       "median_luminance_0_1":round(val[int((count-1)*.5)]/255,4),
       "bright_p90_0_1":round(val[int((count-1)*.9)]/255,4),
       "black_clipping_fraction":round(sum(x<7 for x in val)/count,4),
       "white_clipping_fraction":round(sum(x>247 for x in val)/count,4),
       "mean_saturation_0_1":round(saturation,4),
       "edge_response_0_1":round(edge,4)
    }

def compare(before,after,reference,output):
    paths=[Path(before),Path(after)]
    names=["AFTERDAY · BEFORE","AFTERDAY · AFTER"]
    if reference:
        paths.append(Path(reference));names.append("REFERENCE · FROSTPUNK")
    for p in paths:
        if not p.is_file():
            raise FileNotFoundError(f"Actual screenshot/reference must exist, nothing is fabricated: {p}")
    images=[Image.open(p).convert("RGB") for p in paths]
    metrics={title:measurements(img) for title,img in zip(names,images)}
    basewidth=720;tileheight=470;top=48
    montage=Image.new("RGB",(basewidth*len(images),tileheight+top),(19,23,28))
    draw=ImageDraw.Draw(montage)
    for i,(title,img) in enumerate(zip(names,images)):
        img.thumbnail((basewidth-18,tileheight-14),Image.Resampling.LANCZOS)
        at=(basewidth*i+(basewidth-img.width)//2,top+(tileheight-img.height)//2)
        montage.paste(img,at)
        draw.text((basewidth*i+18,15),title,fill=(232,228,220))
        if i:
            draw.line([(basewidth*i,0),(basewidth*i,tileheight+top)],fill=(93,103,110),width=2)
    output=Path(output);output.mkdir(parents=True,exist_ok=True)
    montage.save(output/"side_by_side.jpg",quality=92,subsampling=0)
    disclaimer=("Brightness, saturation, and edge metrics are measured only from the "
        "provided screenshots. Reference imagery may have different cameras, weather, "
        "UI, and composition: numerical similarity is NOT proof of visual quality. "
        "An art director must compare time-of-day, hierarchy, materials, and silhouettes.")
    payload={"sources":dict(zip(names,[str(p) for p in paths])),
       "metrics":metrics,"interpretation_limit":disclaimer}
    (output/"metrics.json").write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(payload,ensure_ascii=False,indent=2))
    return payload

if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--before",required=True,help="Genuine baseline game screenshot")
    parser.add_argument("--after",required=True,help="Genuine updated game screenshot")
    parser.add_argument("--reference",help="Frostpunk screenshot you have permission to use for review")
    parser.add_argument("--output",default="docs/qa/premium-v600-comparison")
    args=parser.parse_args()
    compare(args.before,args.after,args.reference,args.output)
