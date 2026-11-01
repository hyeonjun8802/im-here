from PIL import Image,ImageFilter
import numpy as np
from pathlib import Path
rng=np.random.default_rng(29067)
w,h=1024,512
field=np.zeros((h,w),dtype=np.float32)
for width,amp in [(10,.25),(24,.23),(52,.20),(116,.17),(256,.10)]:
    height=max(4,width//2)
    small=(rng.random((height,width))*255).astype(np.uint8)
    # Seam tile approximated by repeating one full period twice and center sampling.
    sample=Image.fromarray(np.tile(small,(3,3)),'L')
    sample=sample.resize((w*3,h*3),Image.Resampling.BICUBIC).crop((w,h,w*2,h*2))
    field+=np.asarray(sample,dtype=np.float32)/255*amp
field=np.clip((field-.28)*1.7,0,1)
result=Image.fromarray((field*255).astype(np.uint8),'L').filter(ImageFilter.GaussianBlur(.7))
out=Path(__file__).resolve().parents[1]/'public/assets/materials/botany/cloud_volume.png'
result.save(out,optimize=True)
print(out, out.stat().st_size)
