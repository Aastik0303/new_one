#!/bin/bash
set -e
echo "============================================"
echo "  NeuralNexus Backend — FastAPI Server"
echo "============================================"

cd "$(dirname "$0")/backend"

if [ ! -d ".venv" ]; then
  echo "[1/3] Creating virtual environment..."
  python3 -m venv .venv
fi

echo "[2/3] Installing dependencies..."
source .venv/bin/activate
pip install --quiet --upgrade pip
pip install --quiet pydantic-settings
pip install --quiet -r requirements.txt

echo "[3/3] Starting FastAPI server on http://localhost:8000 ..."
echo ""
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
