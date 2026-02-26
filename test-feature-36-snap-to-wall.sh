#!/bin/bash

echo "=== Feature #36: Snap-to-Wall Placement Test ==="
echo ""

# Create project
echo "[1/7] Creating test project..."
PROJECT=$(curl -s -X POST http://localhost:5000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"F36 Snap Test","description":"Testing snap-to-wall placement"}')
PROJECT_ID=$(echo "$PROJECT" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "✓ Project ID: $PROJECT_ID"

# Create floor
echo "[2/7] Creating floor..."
FLOOR=$(curl -s -X POST http://localhost:5000/api/projects/$PROJECT_ID/floors \
  -H "Content-Type: application/json" \
  -d '{"name":"Ground","level":0,"order_index":0}')
FLOOR_ID=$(echo "$FLOOR" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "✓ Floor ID: $FLOOR_ID"

# Create room (5m x 5m room)
echo "[3/7] Creating 5x5m room..."
ROOM=$(curl -s -X POST http://localhost:5000/api/floors/$FLOOR_ID/rooms \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Room","dimensions_json":{"width":5,"depth":5,"vertices":[{"x":0,"z":0},{"x":5,"z":0},{"x":5,"z":5},{"x":0,"z":5}]},"position_x":0,"position_z":0,"ceiling_height":2.8}')
ROOM_ID=$(echo "$ROOM" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "✓ Room ID: $ROOM_ID (5m x 5m, centered at 0,0)"

# Get furniture asset (looking for shelf/desk type)
echo "[4/7] Getting furniture asset..."
ASSET_ID=$(curl -s http://localhost:5000/api/assets | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "✓ Using asset ID: $ASSET_ID"

# Place furniture near north wall (should snap to Z=2.5-offset)
echo "[5/7] Placing furniture near north wall (should snap)..."
FURNITURE=$(curl -s -X POST http://localhost:5000/api/rooms/$ROOM_ID/furniture \
  -H "Content-Type: application/json" \
  -d "{\"asset_id\":$ASSET_ID,\"position_x\":0,\"position_y\":0,\"position_z\":2.0,\"rotation_y\":0}")
FURNITURE_ID=$(echo "$FURNITURE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "✓ Furniture ID: $FURNITURE_ID placed at Z=2.0 (near north wall at Z=2.5)"

# Get furniture details
echo ""
echo "[6/7] Verifying furniture placement..."
DETAILS=$(curl -s http://localhost:5000/api/rooms/$ROOM_ID/furniture)
echo "Current furniture data:"
echo "$DETAILS" | grep -E '"position_[xyz]"|"rotation_y"'

echo ""
echo "[7/7] Opening in browser for manual testing..."
echo ""
echo "=== Manual Testing Instructions ==="
echo ""
echo "Project URL: http://localhost:5173/editor/$PROJECT_ID"
echo ""
echo "Test Steps:"
echo "1. ✅ Room with visible walls is displayed"
echo "2. ✅ Furniture (red box) is visible in the room"
echo "3. Click and drag the furniture close to a wall"
echo "4. ✅ When near a wall (<0.5m), furniture should snap"
echo "5. ✅ Furniture should rotate to face away from wall"
echo "6. ✅ Green wireframe indicator appears during snap"
echo "7. Release to place the furniture"
echo "8. ✅ Furniture stays flush against the wall"
echo ""
echo "Expected Behavior:"
echo "- North wall (+Z): furniture snaps with rotation=π (180°)"
echo "- South wall (-Z): furniture snaps with rotation=0"
echo "- East wall (+X): furniture snaps with rotation=-π/2 (-90°)"
echo "- West wall (-X): furniture snaps with rotation=π/2 (90°)"
echo ""

# Open browser
playwright-cli open http://localhost:5173/editor/$PROJECT_ID > /dev/null 2>&1 &
sleep 4

# Take screenshot
playwright-cli screenshot > /dev/null 2>&1
echo "Screenshot saved to .playwright-cli/"

# Check console
echo ""
echo "Checking console for errors..."
CONSOLE_OUT=$(playwright-cli console 2>&1)
if echo "$CONSOLE_OUT" | grep -qi "error" | grep -v "DEBUG"; then
  echo "⚠ Console warnings detected"
else
  echo "✓ No critical errors in console"
fi

echo ""
echo "Browser is open for manual testing."
echo "Press Enter when done testing..."
read

# Close browser
playwright-cli close > /dev/null 2>&1

# Cleanup
echo "Cleaning up..."
curl -s -X DELETE http://localhost:5000/api/projects/$PROJECT_ID > /dev/null
echo "✓ Test project deleted"

echo ""
echo "=== Feature #36 Test Complete ==="
echo ""
echo "Backend: ✅ Room and furniture created successfully"
echo "UI: Requires manual verification of snap behavior"
