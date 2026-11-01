#!/bin/bash
set -e
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo 'Node.js is required (https://nodejs.org)'; read -r -p 'Press Enter'; exit 1
fi
node scripts/serve_standalone.mjs
