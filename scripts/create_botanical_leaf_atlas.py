from PIL import Image, ImageDraw,ImageFilter
import math,random
from pathlib import Path
random.seed(72019)
N=512
im=Image.new('RGBA',(N,N),(0,0,0,0));p=im.load()
# Rich leaf surface with tapered natural silhouette, broken edge and longitudinal veins.
for y in range(24,488):
    v=(y-24)/464
    taper=max(0,math.sin(math.pi*v))**.79
    mid=(N/2)+7*math.sin(v*2.3)-3*math.sin(v*8)
    half=183*taper*(1+.04*math.sin(v*26)+.022*math.sin(v*91))
    for x in range(max(0,int(mid-half-2)),min(N,int(mid+half+3))):
        k=abs(x-mid)/max(.001,half)
        if k>=1:continue
        vignette=(1-k*k)**.24
        vein=math.exp(-((x-mid)/3.1)**2)
        veins=0
        for j in range(7):
            vy=.11+j*.116
            reach=(v-vy)
            if reach>0:
                vx=mid+math.copysign(118, x-mid)*min(1,reach/.15)*math.sin(math.pi*min(1,reach/.16))*.8
                veins=max(veins,math.exp(-((abs(x-mid)-abs(vx-mid)) /3.2)**2)*math.exp(-((reach-.07)/.08)**2))
        noise=random.random()*.08-.04
        shade=.65+.26*vignette+.19*vein+.09*veins+noise
        col=(int(max(0,min(255,69*shade))),int(max(0,min(255,119*shade))),int(max(0,min(255,42*shade))))
        p[x,y]=(*col,255)
# Dappled naturally tinted spots, not hard triangles.
d=ImageDraw.Draw(im,'RGBA')
for i in range(420):
    x=random.randrange(90,422);y=random.randrange(50,460)
    if im.getpixel((x,y))[3]>0:
        r=random.randrange(1,5)
        d.ellipse((x-r,y-r,x+r,y+r),fill=(30,68,24,random.randrange(14,45)))
# Reapply irregular smooth silhouette alpha via low-radius blur.
r,g,b,a=im.split();a=a.filter(ImageFilter.GaussianBlur(1.0));im.putalpha(a)
out=Path(__file__).resolve().parents[1]/'public/assets/materials/botany/leaf_veined.png'
im.save(out,optimize=True)
print(out, out.stat().st_size)
