#!/usr/bin/env bash
set -e

echo "=== Voice Scheduling Agent - Development ==="
echo ""

# Start backend
echo "[1/2] Starting backend on http://localhost:8000 ..."
cd backend
source venv/bin/activate 2>/dev/null || {
  echo "  Creating virtual environment..."
  python3 -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
}
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --ws-ping-interval 30 --ws-ping-timeout 120 &
BACKEND_PID=$!
cd ..

# Start frontend
echo "[2/2] Starting frontend on http://localhost:5173 ..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "=== Both servers running ==="
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  API docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
