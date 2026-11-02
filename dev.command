#!/bin/bash
# Bấm đúp trong Finder: chạy app ở http://localhost:5173 (Ctrl+C để dừng).
cd "$(dirname "$0")" || exit 1
npm install --prefer-offline --no-audit --no-fund && npm run dev
read -r -p "Nhấn Enter để đóng..."
