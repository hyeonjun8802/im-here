#!/bin/bash
set -e
cd "$(dirname "$0")"
if ! command -v npm >/dev/null 2>&1; then echo 'Node.js 22 or later is required: https://nodejs.org'; read -p 'Press Enter'; exit 1; fi
npm install
npm run download:assets
npm run dev
