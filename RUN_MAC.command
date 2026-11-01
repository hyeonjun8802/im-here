#!/bin/bash
set -e
cd "$(dirname "$0")"
if [ ! -d node_modules ]; then npm install; fi
if [ ! -f public/assets/models/bench-old.glb ]; then npm run download:assets; fi
npm run dev
