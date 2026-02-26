#!/bin/bash
echo "Stopping backend server..."
ps aux | grep "node.*src/server.js" | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null || true
sleep 2

echo "Starting backend server..."
cd "$(dirname "$0")"
node src/server.js &

sleep 3
echo "Server restarted. Testing foreign keys..."
curl -s http://localhost:5000/api/health/schema | grep foreignKeysEnabled
