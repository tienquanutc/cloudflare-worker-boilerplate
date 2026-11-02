#!/bin/bash
# Bấm đúp trong Finder: kiểm tra (typecheck + test), build rồi deploy lên Cloudflare.
cd "$(dirname "$0")" || exit 1
npm install --prefer-offline --no-audit --no-fund && npm run deploy
read -r -p "Nhấn Enter để đóng..."
