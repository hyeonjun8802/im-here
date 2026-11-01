#!/bin/bash
# Optional local QA capture. Browser rendering happens on the user's Mac GPU,
# not in the restricted build environment. Does not mutate save data.
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install Node.js and run this file again."
  read -r -p 'Press Enter to close...' _; exit 1
fi
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if [ ! -x "$CHROME" ]; then
 CHROME="/Applications/Chromium.app/Contents/MacOS/Chromium"
fi
if [ ! -x "$CHROME" ]; then
 echo "Chrome/Chromium not found in /Applications."
 read -r -p 'Press Enter to close...' _; exit 1
fi
PORT=5261 node scripts/serve_standalone.mjs >/tmp/afterday_qa_local_server.log 2>&1 &
SERVER_PID=$!
PROFILE="$(mktemp -d /tmp/afterday-qa-chrome.XXXXXX)"
cleanup(){ kill "$SERVER_PID" 2>/dev/null || true; rm -rf "$PROFILE"; }
trap cleanup EXIT
for i in {1..60}; do
 if curl -fs http://127.0.0.1:5261/ >/dev/null 2>&1; then break; fi
 sleep .2
done
mkdir -p SCREENSHOTS
OUT="$PWD/SCREENSHOTS/AFTERDAY_V290_ACTUAL_GAME.png"
"$CHROME" --headless=new --disable-gpu-sandbox --enable-webgl \
 --user-data-dir="$PROFILE" --window-size=1536,940 --hide-scrollbars \
 --virtual-time-budget=13000 --screenshot="$OUT" \
 'http://127.0.0.1:5261/?showcase=1' >/tmp/afterday_qa_chrome.log 2>&1 || {
   cat /tmp/afterday_qa_chrome.log; echo 'Screenshot failed';
   read -r -p 'Press Enter to close...' _; exit 1;
 }
if [ ! -s "$OUT" ]; then echo "Screenshot not created"; exit 1; fi
open "$OUT" || true
printf 'Actual game screenshot saved at: %s\n' "$OUT"
read -r -p 'Press Enter to close...' _
