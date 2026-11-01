#!/usr/bin/env python3
"""Bundle the exact local Three.js 0.180 distribution for offline standalone.

Uses node_modules/three when available, or the already packaged three vendor
modules when offline. The dist tree is replaced only after staging succeeds.
"""
from pathlib import Path
import json,shutil,tempfile

root=Path(__file__).resolve().parents[1]
out=root/'dist'
local_three=root/'node_modules'/'three'
use_local=(local_three/'build'/'three.module.js').is_file()
assert use_local or (out/'vendor'/'three'/'build'/'three.module.js').is_file(), 'Three.js distribution missing'
with tempfile.TemporaryDirectory(prefix='afterday-release-',dir=str(root)) as tmp:
    staged=Path(tmp)/'dist'
    staged.mkdir()
    shutil.copytree(root/'src',staged/'src')
    shutil.copytree(root/'public'/'assets',staged/'assets')
    if use_local:
        shutil.copytree(local_three/'build',staged/'vendor'/'three'/'build',ignore=shutil.ignore_patterns('*.min.js','*.cjs','*.map','*.webgpu*','*.tsl*'))
        shutil.copytree(local_three/'examples'/'jsm',staged/'vendor'/'three'/'examples'/'jsm')
    else:
        shutil.copytree(out/'vendor'/'three',staged/'vendor'/'three')
    imports={'imports':{'three':'./vendor/three/build/three.module.js','three/addons/':'./vendor/three/examples/jsm/'}}
    script='<script type="importmap">'+json.dumps(imports,separators=(',',':'))+'</script>'
    for f in ['index.html','character.html']:
        content=(root/f).read_text()
        content=content.replace('</head>',script+'</head>',1).replace('src="/src/characterPreviewV190.js"','src="./src/characterPreviewV190.js"')
        (staged/f).write_text(content)
    # Release replaces the previous distribution only after all copies complete.
    shutil.rmtree(out)
    shutil.move(str(staged),str(out))
print('Standalone ES-module release created:',out)
