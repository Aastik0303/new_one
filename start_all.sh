#!/bin/bash
echo "Starting NeuralNexus — Full Stack AI Platform"
echo ""
# Start backend in background
./start_backend.sh &
BACKEND_PID=$!

# Wait a bit then start frontend
sleep 3
./start_frontend.sh &
FRONTEND_PID=$!

echo ""
echo "====================================="
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:5173"
echo "  API Docs: http://localhost:8000/docs"
echo "====================================="
echo ""
echo "Press Ctrl+C to stop all servers"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
