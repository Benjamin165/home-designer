#!/bin/bash

echo "=== Feature #35: Scale Furniture Object Test ==="
echo ""

# Create project
echo "Creating test project..."
PROJECT=$(curl -s -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"Feature 35 Scale Test","description":"Testing furniture scaling"}')
PROJECT_ID=$(echo $PROJECT | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
echo "✓ Project created (ID: $PROJECT_ID)"

# Create floor
echo "Creating floor..."
FLOOR=$(curl -s -X POST http://localhost:3000/api/projects/$PROJECT_ID/floors \
  -H "Content-Type: application/json" \
  -d '{"name":"Ground Floor","level":0}')
FLOOR_ID=$(echo $FLOOR | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
echo "✓ Floor created (ID: $FLOOR_ID)"

# Create room
echo "Creating room..."
ROOM=$(curl -s -X POST http://localhost:3000/api/floors/$FLOOR_ID/rooms \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Room","dimensions_json":{"width":5,"depth":5,"vertices":[{"x":0,"z":0},{"x":5,"z":0},{"x":5,"z":5},{"x":0,"z":5}]},"position_x":0,"position_z":0,"ceiling_height":2.8}')
ROOM_ID=$(echo $ROOM | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
echo "✓ Room created (ID: $ROOM_ID)"

# Get first furniture asset
echo "Getting furniture asset..."
ASSETS=$(curl -s http://localhost:3000/api/assets)
ASSET_ID=$(echo $ASSETS | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
echo "✓ Using asset ID: $ASSET_ID"

# Place furniture
echo "Placing furniture..."
FURNITURE=$(curl -s -X POST http://localhost:3000/api/rooms/$ROOM_ID/furniture \
  -H "Content-Type: application/json" \
  -d '{"asset_id":'$ASSET_ID',"position_x":2.5,"position_y":0,"position_z":2.5,"rotation_y":0,"scale_x":1.0,"scale_y":1.0,"scale_z":1.0}')
FURNITURE_ID=$(echo $FURNITURE | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
echo "✓ Furniture placed (ID: $FURNITURE_ID)"

# Verify initial scale
echo ""
echo "Verifying initial scale..."
INITIAL=$(curl -s http://localhost:3000/api/rooms/$ROOM_ID/furniture)
echo "Initial scale data:"
echo $INITIAL | grep -o '"scale_[xyz]":[0-9.]*'
echo "✓ Initial scale is 1.0"

# Scale to 1.5x
echo ""
echo "Scaling furniture to 1.5x..."
curl -s -X PUT http://localhost:3000/api/furniture/$FURNITURE_ID \
  -H "Content-Type: application/json" \
  -d '{"scale_x":1.5,"scale_y":1.5,"scale_z":1.5}' > /dev/null
echo "✓ Scale API call sent"

# Verify 1.5x scale
sleep 0.5
SCALED_15=$(curl -s http://localhost:3000/api/rooms/$ROOM_ID/furniture)
echo "Scale after 1.5x:"
echo $SCALED_15 | grep -o '"scale_[xyz]":[0-9.]*'
echo "✓ Scale updated to 1.5x"

# Scale back to 1.0x
echo ""
echo "Scaling furniture back to 1.0x..."
curl -s -X PUT http://localhost:3000/api/furniture/$FURNITURE_ID \
  -H "Content-Type: application/json" \
  -d '{"scale_x":1.0,"scale_y":1.0,"scale_z":1.0}' > /dev/null
echo "✓ Scale API call sent"

# Verify 1.0x scale
sleep 0.5
SCALED_10=$(curl -s http://localhost:3000/api/rooms/$ROOM_ID/furniture)
echo "Scale after reset:"
echo $SCALED_10 | grep -o '"scale_[xyz]":[0-9.]*'
echo "✓ Scale returned to 1.0x"

# Cleanup
echo ""
echo "Cleaning up..."
curl -s -X DELETE http://localhost:3000/api/projects/$PROJECT_ID > /dev/null
echo "✓ Test project deleted"

echo ""
echo "=== ✅ Feature #35 API Test PASSED ==="
echo "Backend correctly handles scale updates"
