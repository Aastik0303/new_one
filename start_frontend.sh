#!/bin/bash
set -e
echo "============================================"
echo "  NeuralNexus Frontend — React + Vite"
echo "============================================"

cd "$(dirname "$0")/frontend"

echo "[1/2] Installing npm dependencies..."
npm install

echo "[2/2] Starting Vite dev server on http://localhost:5173 ..."
echo ""
npm run dev
