#!/bin/bash

# Home Designer - Development Environment Setup Script
# This script sets up and starts the development environment for the Home Designer application

set -e  # Exit on error

echo "========================================="
echo "  Home Designer - Environment Setup"
echo "========================================="
echo ""

# Check Node.js version
echo "Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js 20+ and try again."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "Warning: Node.js version $NODE_VERSION detected. Node.js 20+ is recommended."
fi
echo "✓ Node.js $(node -v) detected"
echo ""

# Install backend dependencies
echo "Installing backend dependencies..."
if [ -d "backend" ]; then
    cd backend
    npm install
    cd ..
    echo "✓ Backend dependencies installed"
else
    echo "Note: Backend directory not found yet. Will be created during implementation."
fi
echo ""

# Install frontend dependencies
echo "Installing frontend dependencies..."
if [ -d "frontend" ]; then
    cd frontend
    npm install
    cd ..
    echo "✓ Frontend dependencies installed"
else
    echo "Note: Frontend directory not found yet. Will be created during implementation."
fi
echo ""

# Initialize database
echo "Initializing database..."
if [ -d "backend" ] && [ -f "backend/src/db/init.js" ]; then
    node backend/src/db/init.js
    echo "✓ Database initialized"
else
    echo "Note: Database initialization script not found yet. Will be created during implementation."
fi
echo ""

# Start development servers
echo "========================================="
echo "  Starting Development Servers"
echo "========================================="
echo ""

# Kill any existing processes on the ports
echo "Checking for existing processes..."
if command -v lsof &> /dev/null; then
    lsof -ti:5000 | xargs kill -9 2>/dev/null || true
    lsof -ti:5173 | xargs kill -9 2>/dev/null || true
    echo "✓ Ports cleared"
fi
echo ""

# Start backend server
if [ -d "backend" ]; then
    echo "Starting backend server on http://localhost:5000..."
    cd backend
    npm run dev &
    BACKEND_PID=$!
    cd ..
    echo "✓ Backend server started (PID: $BACKEND_PID)"
else
    echo "Note: Backend not ready yet."
fi
echo ""

# Start frontend server
if [ -d "frontend" ]; then
    echo "Starting frontend server on http://localhost:5173..."
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    echo "✓ Frontend server started (PID: $FRONTEND_PID)"
else
    echo "Note: Frontend not ready yet."
fi
echo ""

# Wait for servers to start
echo "Waiting for servers to start..."
sleep 3
echo ""

echo "========================================="
echo "  🎉 Home Designer is ready!"
echo "========================================="
echo ""
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:5000"
echo "  API Docs: http://localhost:5000/api-docs (if available)"
echo ""
echo "  Press Ctrl+C to stop all servers"
echo ""
echo "========================================="
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping servers..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    # Kill any remaining processes on the ports
    if command -v lsof &> /dev/null; then
        lsof -ti:5000 | xargs kill -9 2>/dev/null || true
        lsof -ti:5173 | xargs kill -9 2>/dev/null || true
    fi
    echo "✓ All servers stopped"
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT SIGTERM

# Keep script running
wait
