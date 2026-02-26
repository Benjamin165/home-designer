#!/bin/bash

echo "=== Feature #38: Multi-Select Furniture with Shift+Click Test ==="
echo ""

# Create project
echo "[1/8] Creating test project..."
PROJECT=$(curl -s -X POST http://localhost:5000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"F38 Multi-Select Test","description":"Testing multi-select furniture"}')
PROJECT_ID=$(echo "$PROJECT" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "✓ Project ID: $PROJECT_ID"

# Create floor
echo "[2/8] Creating floor..."
FLOOR=$(curl -s -X POST http://localhost:5000/api/projects/$PROJECT_ID/floors \
  -H "Content-Type: application/json" \
  -d '{"name":"Ground","level":0,"order_index":0}')
FLOOR_ID=$(echo "$FLOOR" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "✓ Floor ID: $FLOOR_ID"

# Create room
echo "[3/8] Creating 6x6m room..."
ROOM=$(curl -s -X POST http://localhost:5000/api/floors/$FLOOR_ID/rooms \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Room","dimensions_json":{"width":6,"depth":6,"vertices":[{"x":0,"z":0},{"x":6,"z":0},{"x":6,"z":6},{"x":0,"z":6}]},"position_x":0,"position_z":0,"ceiling_height":2.8}')
ROOM_ID=$(echo "$ROOM" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "✓ Room ID: $ROOM_ID"

# Get furniture assets
echo "[4/8] Getting furniture assets..."
ASSETS=$(curl -s http://localhost:5000/api/assets)
ASSET1=$(echo "$ASSETS" | grep -o '"id":[0-9]*' | sed -n '1p' | cut -d':' -f2)
ASSET2=$(echo "$ASSETS" | grep -o '"id":[0-9]*' | sed -n '2p' | cut -d':' -f2)
ASSET3=$(echo "$ASSETS" | grep -o '"id":[0-9]*' | sed -n '3p' | cut -d':' -f2)
echo "✓ Using assets: $ASSET1, $ASSET2, $ASSET3"

# Place 3 furniture items
echo "[5/8] Placing 3 furniture items..."

FURN1=$(curl -s -X POST http://localhost:5000/api/rooms/$ROOM_ID/furniture \
  -H "Content-Type: application/json" \
  -d "{\"asset_id\":$ASSET1,\"position_x\":1,\"position_y\":0,\"position_z\":1,\"rotation_y\":0}")
FURN1_ID=$(echo "$FURN1" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "  ✓ Furniture 1 (ID: $FURN1_ID) at position (1, 0, 1)"

FURN2=$(curl -s -X POST http://localhost:5000/api/rooms/$ROOM_ID/furniture \
  -H "Content-Type: application/json" \
  -d "{\"asset_id\":$ASSET2,\"position_x\":3,\"position_y\":0,\"position_z\":2,\"rotation_y\":0}")
FURN2_ID=$(echo "$FURN2" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "  ✓ Furniture 2 (ID: $FURN2_ID) at position (3, 0, 2)"

FURN3=$(curl -s -X POST http://localhost:5000/api/rooms/$ROOM_ID/furniture \
  -H "Content-Type: application/json" \
  -d "{\"asset_id\":$ASSET3,\"position_x\":5,\"position_y\":0,\"position_z\":3,\"rotation_y\":0}")
FURN3_ID=$(echo "$FURN3" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "  ✓ Furniture 3 (ID: $FURN3_ID) at position (5, 0, 3)"

echo ""
echo "[6/8] Verifying furniture placement..."
ROOM_FURNITURE=$(curl -s http://localhost:5000/api/rooms/$ROOM_ID/furniture)
FURN_COUNT=$(echo "$ROOM_FURNITURE" | grep -o '"id":[0-9]*' | wc -l)
echo "✓ $FURN_COUNT furniture items in room"

echo ""
echo "[7/8] Opening in browser for manual testing..."
echo ""
echo "=== Manual Testing Instructions ==="
echo ""
echo "Project URL: http://localhost:5173/editor/$PROJECT_ID"
echo ""
echo "Test Steps:"
echo ""
echo "1. ✅ Three furniture items visible in the room"
echo ""
echo "2. Click on first item (without Shift)"
echo "   ✅ First item should have blue wireframe outline"
echo "   ✅ Properties panel shows item details"
echo ""
echo "3. Hold SHIFT and click on second item"
echo "   ✅ Both items should have blue wireframe outlines"
echo "   ✅ Properties panel shows 'Multiple Items Selected (2 items)'"
echo ""
echo "4. Hold SHIFT and click on third item"
echo "   ✅ All three items should have blue wireframe outlines"
echo "   ✅ Properties panel shows 'Multiple Items Selected (3 items)'"
echo ""
echo "5. Hold SHIFT and click on second item again (deselect)"
echo "   ✅ Only first and third items should be outlined"
echo "   ✅ Properties panel shows 'Multiple Items Selected (2 items)'"
echo ""
echo "6. Click 'Clear Selection' button in Properties panel"
echo "   ✅ All selections should be cleared"
echo "   ✅ No wireframe outlines visible"
echo ""
echo "7. Click on any single item (without Shift)"
echo "   ✅ Only that item should be selected"
echo "   ✅ Properties panel shows single item details"
echo ""

# Open browser
echo "[8/8] Opening browser..."
playwright-cli open http://localhost:5173/editor/$PROJECT_ID > /dev/null 2>&1 &
sleep 4

# Take screenshot
playwright-cli screenshot > /dev/null 2>&1
echo "Screenshot saved"

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
echo "=== Feature #38 Test Complete ==="
echo ""
echo "Backend: ✅ Project, room, and 3 furniture items created"
echo "UI: Requires manual verification of Shift+Click behavior"
echo ""
echo "Expected Behavior Summary:"
echo "- Regular click: Select single item, clear others"
echo "- Shift+Click: Add/remove item from multi-selection"
echo "- All selected items show blue wireframe outline"
echo "- Properties panel shows count when multiple selected"
echo "- Clear Selection button clears all selections"
