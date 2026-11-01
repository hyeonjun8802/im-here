#!/usr/bin/env python3
"""Compose documented BEFORE/AFTER GLB offline screenshots; NO invented gameplay."""
from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1];qa=root/'docs/qa/v350'
labels=[('shelter','안쪽 침대 · 베개 · 침구'),('tank','물탱크 · 표식 · 노후 흔적'),('storage','생존 보급 상자 · 식별 라벨')]
F='/usr/share/fonts/truetype/nanum/NanumGothic.ttf'
if not Path(F).exists():F='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
font=ImageFont.truetype(F,25);small=ImageFont.truetype(F,19);title=ImageFont.truetype(F,32)
CW,CH=560,404;W=1200;H=1490
canvas=Image.new('RGB',(W,H),(239,241,240));d=ImageDraw.Draw(canvas)
d.text((36,24),'AFTERDAY v3.5   |   실제 GLB 에셋 전·후 검수',fill=(28,44,50),font=title)
d.text((37,69),'별도 VTK 3D 오프스크린 렌더 · 실제 게임 브라우저 스크린샷 아님',fill=(82,95,100),font=small)
for i,(key,label) in enumerate(labels):
 y=118+i*445
 d.text((35,y),label,fill=(43,54,52),font=font)
 for j,version in enumerate(['before','after']):
  x=35+j*580
  img=Image.open(qa/f'{key}_{version}.png').convert('RGB').resize((CW,CH),Image.Resampling.LANCZOS)
  canvas.paste(img,(x,y+35))
  badge='기존 v3.4' if j==0 else '수정 v3.5'
  d.rounded_rectangle((x+10,y+46,x+151,y+87),radius=7,fill=(27,37,42) if j==0 else (42,73,62))
  d.text((x+22,y+51),badge,fill=(255,255,255),font=small)
canvas.save(qa/'AFTERDAY_V350_GLBS_BEFORE_AFTER.png',optimize=True)

before=root.parent/'AFTERDAY_v340_work/public/assets/models/afterday'
after=root/'public/assets/models/afterday'
records=[]
for name in ['afterday_shelter_pbr.glb','afterday_water_tank_pbr.glb','afterday_storage_pbr.glb']:
 line={'name':name}
 for version,path in [('before',before/name),('after',after/name)]:
  raw=path.read_bytes();size=int.from_bytes(raw[12:16],'little');doc=json.loads(raw[20:20+size]);
  prims=sum(len(m['primitives']) for m in doc['meshes'])
  vertices=sum(doc['accessors'][p['attributes']['POSITION']]['count'] for m in doc['meshes'] for p in m['primitives'])
  line[version]={'bytes':len(raw),'meshes':len(doc['meshes']),'primitives':prims,'vertices':vertices}
 records.append(line)
(qa/'asset_inventory_v350.json').write_text(json.dumps({'method':'GLB JSON header geometry counts, not browser rendering','assets':records},ensure_ascii=False,indent=2))
print('Montage:',qa/'AFTERDAY_V350_GLBS_BEFORE_AFTER.png')
print(json.dumps(records,ensure_ascii=False,indent=2))
