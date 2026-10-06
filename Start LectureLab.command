#!/bin/bash
# Double-click to run LectureLab locally on http://localhost:8888
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
[ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1
if ! command -v npm >/dev/null 2>&1; then echo "Node.js is not installed. Get it from https://nodejs.org"; read -r; exit 1; fi
echo "Node $(node -v)"
if [ ! -d node_modules ] || [ package.json -nt node_modules ]; then
  echo "Installing dependencies (first run takes a minute or two)…"
  npm install || { echo "npm install failed"; read -r; exit 1; }
  touch node_modules
fi
( sleep 12; open "http://localhost:8888" ) &
npm run dev
