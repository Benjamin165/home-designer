# AI Services Integration Guide

## Table of Contents

1. [AI Features Overview](#ai-features-overview)
2. [TRELLIS Integration](#trellis-integration)
3. [Photo-to-Room Reconstruction](#photo-to-room-reconstruction)
4. [Floor Plan Processing](#floor-plan-processing)
5. [Product URL Scraping](#product-url-scraping)
6. [Generation Lifecycle](#generation-lifecycle)
7. [Before/After Comparison](#beforeafter-comparison)
8. [API Key Management](#api-key-management)
9. [Extending AI Features](#extending-ai-features)

---

## AI Features Overview

Home Designer includes several AI-powered features to accelerate the design process and reduce manual work.

### Implemented Features

| Feature | Status | Backend Route | Frontend Component |
|---------|--------|---------------|-------------------|
| **Photo-to-Furniture** | ✅ Partially Implemented | `POST /api/ai/generate-from-photo` | `AIGenerationModal.tsx` |
| **Product URL Scraping** | ✅ Implemented | `POST /api/ai/url-import` | `URLImportModal.tsx` |
| **Generation History** | ✅ Implemented | `GET /api/ai/generation/:id` | - |
| **Photo-to-Room** | 🔨 Planned | - | - |
| **Floor Plan Processing** | 🔨 Planned | - | - |
| **Before/After Comparison** | 🔨 Planned | - | - |

**Legend:**
- ✅ Implemented: Feature is functional with placeholder/mock implementations
- 🔨 Planned: Database schema exists but implementation is pending
- ❌ Not Started: No implementation yet

### Current Implementation Status

**Production-Ready:**
- ✅ Product URL scraping (Puppeteer + Cheerio)
- ✅ Image dimension estimation
- ✅ Generation lifecycle tracking

**Placeholder/Mock:**
- ⚠️ TRELLIS API integration (simulated delay, fake model generation)
- ⚠️ Photo-to-room reconstruction (not implemented)
- ⚠️ Floor plan processing (not implemented)

---

## TRELLIS Integration

### What is Microsoft TRELLIS?

**TRELLIS** (Textured REpresentation Learning of Large-scale Image-based Surfac Samples) is a state-of-the-art image-to-3D model generation system developed by Microsoft Research.

**Capabilities:**
- Generate 3D meshes from single photos
- Estimate object dimensions and scale
- Produce textured GLB/glTF models
- Handle various object types (furniture, decor, etc.)

**Requirements:**
- TRELLIS API endpoint (cloud service or self-hosted)
- API key for authentication
- Input: JPEG/PNG image (< 10MB)
- Output: GLB 3D model file

### Configuration

**API Key Storage** (encrypted in database):

```sql
-- user_settings table
INSERT INTO user_settings (key, value, encrypted)
VALUES ('trellis_api_key', '<encrypted_value>', 1);
```

**Encryption Details:**
- Algorithm: AES-256-CBC
- Key Source: `ENCRYPTION_KEY` environment variable (32 characters)
- Format: `<iv_hex>:<encrypted_data_hex>`

**Getting the API Key at Runtime** (`ai.js:64-88`):

```javascript
async function getTrellisApiKey() {
  const db = await getDatabase();
  const result = db.exec(
    'SELECT value, encrypted FROM user_settings WHERE key = ?',
    ['trellis_api_key']
  );

  if (result.length === 0) return null;

  const value = result[0].values[0][0];
  const encrypted = result[0].values[0][1] === 1;

  if (encrypted) {
    return decrypt(value); // Decrypt using AES-256
  }

  return value;
}
```

### Image-to-3D Pipeline

**Full Workflow** (Photo → 3D Asset in Library):

```
1. User uploads photo
   ↓
2. Multer saves to assets/uploads/
   ↓
3. Create ai_generations record (status: 'processing')
   ↓
4. Call TRELLIS API with image
   ↓
5. Poll TRELLIS for generation status
   ↓
6. Download generated GLB model
   ↓
7. Save model to assets/models/generated-{id}.glb
   ↓
8. Create asset record in database
   ↓
9. Update ai_generations (status: 'completed')
   ↓
10. Asset appears in library, ready to place
```

**Current Implementation** (`ai.js:93-127`):

```javascript
async function callTrellisApi(imagePath, apiKey) {
  // TODO: Implement actual TRELLIS API integration
  // This is a placeholder simulation

  console.log('Calling TRELLIS API with image:', imagePath);

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Check API key
  if (!apiKey || apiKey === '****') {
    throw new Error('TRELLIS API key not configured');
  }

  // Simulate successful generation
  // Real implementation would:
  // 1. Upload image to TRELLIS
  // 2. Poll for generation status (may take 30-120 seconds)
  // 3. Download the generated 3D model
  // 4. Save it to assets/models/

  const modelId = crypto.randomBytes(8).toString('hex');
  const modelPath = `/assets/models/generated-${modelId}.glb`;
  const thumbnailPath = imagePath; // Use uploaded image as thumbnail

  return {
    modelPath,
    thumbnailPath,
    dimensions: { width: 1.0, height: 0.8, depth: 0.5 }
  };
}
```

**Real TRELLIS Integration** (implementation guide):

```javascript
async function callTrellisApiReal(imagePath, apiKey) {
  const FormData = (await import('form-data')).default;
  const fs = (await import('fs')).default;
  const fetch = (await import('node-fetch')).default;

  // Step 1: Upload image to TRELLIS
  const formData = new FormData();
  formData.append('image', fs.createReadStream(imagePath));

  const uploadResponse = await fetch('https://trellis-api.example.com/v1/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!uploadResponse.ok) {
    throw new Error(`TRELLIS API error: ${uploadResponse.statusText}`);
  }

  const { generation_id } = await uploadResponse.json();

  // Step 2: Poll for completion (every 5 seconds, max 5 minutes)
  const maxAttempts = 60;
  let attempts = 0;
  let status = 'processing';
  let resultUrl = null;

  while (status === 'processing' && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000));

    const statusResponse = await fetch(
      `https://trellis-api.example.com/v1/generation/${generation_id}`,
      { headers: { 'Authorization': `Bearer ${apiKey}` } }
    );

    const statusData = await statusResponse.json();
    status = statusData.status;
    resultUrl = statusData.model_url;

    attempts++;
  }

  if (status !== 'completed') {
    throw new Error(`TRELLIS generation failed or timed out`);
  }

  // Step 3: Download the GLB model
  const modelResponse = await fetch(resultUrl);
  const modelBuffer = await modelResponse.buffer();

  const modelId = crypto.randomBytes(8).toString('hex');
  const modelFilename = `generated-${modelId}.glb`;
  const modelPath = `/assets/models/${modelFilename}`;
  const modelFsPath = join(__dirname, '../../../assets/models', modelFilename);

  fs.writeFileSync(modelFsPath, modelBuffer);

  return {
    modelPath,
    thumbnailPath: imagePath,
    dimensions: {
      width: 1.0,  // TODO: Extract from TRELLIS response
      height: 0.8,
      depth: 0.5,
    },
  };
}
```

### Error Handling

**API Key Missing:**

```javascript
if (!apiKey || apiKey === '****') {
  throw new Error('TRELLIS API key not configured. Please add it in Settings.');
}
```

**API Call Failure:**

```javascript
try {
  trellisResult = await callTrellisApi(imagePath, apiKey);
} catch (apiError) {
  // Update generation record with error
  db.run(
    `UPDATE ai_generations SET status = ?, error_message = ? WHERE id = ?`,
    ['failed', apiError.message, generationId]
  );
  saveDatabase();

  return res.status(500).json({
    error: {
      message: 'AI generation failed',
      details: apiError.message
    },
    generationId
  });
}
```

**Fallback Strategy:**
- Show error message to user
- Allow retry with adjusted parameters (future feature)
- Suggest manual upload of 3D model

### Model Quality Parameters (Future)

TRELLIS supports quality/speed tradeoffs:

```javascript
const trellisOptions = {
  quality: 'high',        // 'low', 'medium', 'high', 'ultra'
  texture_resolution: 2048, // 512, 1024, 2048, 4096
  polygon_count: 50000,   // Target triangle count
  symmetric: false,       // Assume object is symmetric (faster)
};
```

**Configuration in Settings UI:**
- Allow users to choose quality level
- Higher quality = longer generation time (2-10 minutes)
- Lower quality = faster (30-60 seconds)

---

## Photo-to-Room Reconstruction

### Overview

**Goal:** Upload a photo of an existing room → Automatically generate 3D room structure with estimated dimensions, wall positions, windows, and doors.

**Current Status:** ❌ Not Implemented (database schema exists)

### Planned Pipeline

```
1. User uploads room photo
   ↓
2. Send to room reconstruction AI service
   ↓
3. AI detects:
   - Wall positions and orientations
   - Floor boundaries
   - Ceiling height
   - Windows and door locations
   - Room dimensions (scale estimation)
   ↓
4. Convert AI output to Room + Wall records
   ↓
5. Create room in editor with reconstructed structure
   ↓
6. User can refine dimensions and adjust layout
```

### AI Service Requirements

**Input:** Single RGB image (JPEG/PNG)

**Output (JSON):**

```json
{
  "room": {
    "width": 5.2,
    "depth": 4.1,
    "ceiling_height": 2.7,
    "floor_type": "hardwood",
    "wall_color": "#F5F5DC"
  },
  "walls": [
    {
      "start": { "x": 0, "y": 0 },
      "end": { "x": 5.2, "y": 0 },
      "height": 2.7,
      "has_window": true,
      "window_position": 2.5
    },
    {
      "start": { "x": 5.2, "y": 0 },
      "end": { "x": 5.2, "y": 4.1 },
      "height": 2.7,
      "has_window": false
    },
    // ... more walls
  ],
  "windows": [
    { "wall_index": 0, "position": 2.5, "width": 1.2, "height": 1.5 }
  ],
  "doors": [
    { "wall_index": 1, "position": 0.5, "width": 0.9, "height": 2.0 }
  ],
  "confidence": 0.87
}
```

### Implementation Strategy

**Backend Route:**

```javascript
// backend/src/routes/ai.js
router.post('/photo-to-room', upload.single('photo'), async (req, res) => {
  const imagePath = `/assets/uploads/${req.file.filename}`;

  // Call room reconstruction AI service
  const reconstructionData = await callRoomReconstructionApi(imagePath);

  // Create room in specified floor
  const { floorId } = req.body;
  const room = createRoomFromReconstruction(db, floorId, reconstructionData);

  // Create walls
  reconstructionData.walls.forEach(wall => {
    createWallFromData(db, room.id, wall);
  });

  res.json({
    message: 'Room reconstructed from photo',
    room,
    confidence: reconstructionData.confidence
  });
});
```

**Frontend Flow:**

1. User clicks "Generate from Photo" in Editor
2. Upload modal opens
3. User selects room photo
4. Show progress: "Analyzing room structure..."
5. Display reconstructed room in preview
6. Allow user to adjust dimensions before confirming
7. Insert room into current floor

### Candidate AI Services

**Option 1: Custom Model (LayoutNet, HorizonNet)**
- Train on indoor scene datasets (SUN360, Matterport3D)
- Estimate room layout from single image
- Output wall positions, ceiling height

**Option 2: Commercial API (Hypothetical)**
- Google Cloud Vision API (limited for this use case)
- Custom-trained model on Vertex AI
- Third-party services (Matterport, Cupix)

**Option 3: Fallback: Manual Tracing**
- Show photo as background overlay in top-down view
- User manually traces walls over the photo
- Semi-automated: Snap detected lines to walls

### Database Integration

**Mapping AI Output to Schema:**

```javascript
function createRoomFromReconstruction(db, floorId, reconstruction) {
  const { width, depth, ceiling_height } = reconstruction.room;

  db.run(
    `INSERT INTO rooms (
      floor_id, name, dimensions_json,
      position_x, position_y, position_z,
      floor_material, floor_color,
      ceiling_height, ceiling_color,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      floorId,
      'Reconstructed Room',
      JSON.stringify({ width, depth }),
      0, 0, 0, // Position at origin
      'hardwood', // Default or from reconstruction
      '#F5F5DC',  // Default or from reconstruction
      ceiling_height,
      '#FFFFFF',
    ]
  );

  const roomId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
  return { id: roomId, width, depth, ceiling_height };
}
```

---

## Floor Plan Processing

### Overview

**Goal:** Upload a 2D floor plan image (architectural drawing, hand sketch) → Extract room boundaries, wall positions, and dimensions → Create 3D structure.

**Current Status:** ❌ Not Implemented

### Planned Pipeline

```
1. User uploads floor plan image (PDF, PNG, JPEG)
   ↓
2. Convert to standardized format (PNG at consistent resolution)
   ↓
3. Wall detection (edge detection + Hough transform or ML)
   ↓
4. Room segmentation (flood fill or semantic segmentation)
   ↓
5. Scale calibration (user provides reference dimension)
   ↓
6. Convert to Room/Wall database records
   ↓
7. Render in 3D editor
```

### Image Processing Steps

**Step 1: Wall Detection**

**Classical Approach (OpenCV):**

```javascript
const cv = require('@u4/opencv4nodejs');

async function detectWalls(imagePath) {
  const image = await cv.imreadAsync(imagePath);

  // Convert to grayscale
  const gray = image.bgrToGray();

  // Edge detection (Canny)
  const edges = gray.canny(50, 150);

  // Line detection (Hough Transform)
  const lines = edges.houghLinesP(1, Math.PI / 180, 100, 50, 10);

  // Merge nearby parallel lines
  const walls = mergeParallelLines(lines);

  return walls; // Array of { start: {x, y}, end: {x, y} }
}
```

**ML Approach (CubiCasa5K Model):**
- Pre-trained model for floor plan parsing
- Detects walls, doors, windows, room labels
- Outputs segmentation mask

**Step 2: Room Segmentation**

```javascript
function segmentRooms(wallMask) {
  // Flood fill from empty spaces to identify separate rooms
  const rooms = [];
  const visited = new Set();

  for (let y = 0; y < wallMask.height; y++) {
    for (let x = 0; x < wallMask.width; x++) {
      if (!isWall(wallMask, x, y) && !visited.has(`${x},${y}`)) {
        const room = floodFill(wallMask, x, y, visited);
        rooms.push(room);
      }
    }
  }

  return rooms; // Array of room polygons
}
```

**Step 3: Scale Calibration**

User provides a reference dimension:

```javascript
// User clicks two points on the floor plan
const point1 = { x: 120, y: 50 };
const point2 = { x: 320, y: 50 };
const pixelDistance = Math.sqrt(
  Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
);

const realWorldDistance = 5.0; // 5 meters (user input)
const pixelsPerMeter = pixelDistance / realWorldDistance;

// Convert all pixel coordinates to meters
function pixelsToMeters(pixels) {
  return pixels / pixelsPerMeter;
}
```

### Database Conversion

**Extract Room Dimensions:**

```javascript
function convertFloorPlanToRooms(db, floorId, roomPolygons, pixelsPerMeter) {
  roomPolygons.forEach(polygon => {
    // Calculate bounding box
    const minX = Math.min(...polygon.map(p => p.x));
    const maxX = Math.max(...polygon.map(p => p.x));
    const minY = Math.min(...polygon.map(p => p.y));
    const maxY = Math.max(...polygon.map(p => p.y));

    const width = pixelsToMeters(maxX - minX);
    const depth = pixelsToMeters(maxY - minY);

    const centerX = pixelsToMeters((minX + maxX) / 2);
    const centerZ = pixelsToMeters((minY + maxY) / 2);

    // Create room
    db.run(
      `INSERT INTO rooms (
        floor_id, dimensions_json, position_x, position_z,
        ceiling_height, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [floorId, JSON.stringify({ width, depth }), centerX, centerZ, 2.8]
    );
  });
}
```

### User Flow

1. **Upload Floor Plan**: Click "Upload Floor Plan" button
2. **Preview**: Show uploaded image with detected walls highlighted
3. **Scale Calibration**: User clicks two points and inputs real-world distance
4. **Room Selection**: User can select/deselect detected rooms
5. **Confirm**: Click "Create Rooms" to add to project
6. **Refine**: User can adjust dimensions in the 3D editor

---

## Product URL Scraping

### Overview

**Goal:** User pastes a furniture product URL (IKEA, Wayfair, Amazon) → Scrape product name, image, and dimensions → Create asset with placeholder 3D model.

**Current Status:** ✅ Implemented (Puppeteer + Cheerio)

### Supported Patterns

**Generic Scraping Strategy** (works on most e-commerce sites):

1. **Product Name**: `<h1>`, `<meta property="og:title">`, `<title>`
2. **Product Image**: `<meta property="og:image">`, `<meta name="twitter:image">`, first `<img>`
3. **Dimensions**: Text search for patterns like "50cm x 80cm x 40cm", "W: 50, H: 80, D: 40"

**Example Sites:**
- IKEA: Good structured data, consistent dimension format
- Wayfair: Product specs in tables
- Amazon: Detailed product information section
- Generic sites: Fallback to meta tags

### Scraping Pipeline

**Backend Route:** `POST /api/ai/url-import` (`ai.js:303-396`)

**Flow:**

```
1. User submits product URL
   ↓
2. Validate URL format
   ↓
3. Create ai_generations record (status: 'processing')
   ↓
4. Launch Puppeteer browser (headless)
   ↓
5. Navigate to URL, wait for page load
   ↓
6. Extract HTML content
   ↓
7. Parse with Cheerio (jQuery-like selectors)
   ↓
8. Extract: product name, image URL, dimensions
   ↓
9. Return scraped data to frontend for preview
   ↓
10. User reviews and confirms
   ↓
11. POST /api/ai/url-import/confirm
   ↓
12. Download product image
   ↓
13. Create asset record with scraped data
   ↓
14. Asset appears in library
```

### Implementation Details

**Puppeteer Configuration** (`ai.js:494-506`):

```javascript
async function scrapeProductUrl(url) {
  const puppeteer = await import('puppeteer');
  const cheerio = await import('cheerio');

  let browser = await puppeteer.default.launch({
    headless: 'new',  // Run without UI
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  const page = await browser.newPage();
  await page.goto(url, {
    waitUntil: 'networkidle2', // Wait for network to settle
    timeout: 30000              // 30 second timeout
  });

  const html = await page.content();
  await browser.close();

  // Parse with Cheerio
  const $ = cheerio.load(html);
  // ... extraction logic
}
```

**Product Name Extraction** (`ai.js:509-514`):

```javascript
let productName = '';
productName = $('h1').first().text().trim() ||
              $('meta[property="og:title"]').attr('content') ||
              $('title').text().trim() ||
              'Imported Product';
```

**Product Image Extraction** (`ai.js:517-529`):

```javascript
let imageUrl = '';
imageUrl = $('meta[property="og:image"]').attr('content') ||
           $('meta[name="twitter:image"]').attr('content') ||
           $('img[itemprop="image"]').first().attr('src') ||
           $('.product-image img').first().attr('src') ||
           $('img').first().attr('src') ||
           '';

// Convert relative URL to absolute
if (imageUrl && !imageUrl.startsWith('http')) {
  const urlObj = new URL(url);
  imageUrl = new URL(imageUrl, urlObj.origin).href;
}
```

**Dimension Extraction** (`ai.js:532-552`):

```javascript
let dimensions = { width: 1.0, height: 1.0, depth: 1.0 };
const bodyText = $('body').text();

const dimensionPatterns = [
  // Pattern 1: "50cm x 80cm x 40cm", "20in x 30in x 15in"
  /(\d+(?:\.\d+)?)\s*(?:cm|CM|centimeters?|inches?|in|")\s*[xX×]\s*(\d+(?:\.\d+)?)\s*(?:cm|CM|centimeters?|inches?|in|")\s*[xX×]\s*(\d+(?:\.\d+)?)\s*(?:cm|CM|centimeters?|inches?|in|")/,

  // Pattern 2: "Width: 50cm, Height: 80cm, Depth: 40cm"
  /W(?:idth)?:\s*(\d+(?:\.\d+)?)\s*(?:cm|CM|centimeters?|inches?|in|")?\s*[,;]?\s*H(?:eight)?:\s*(\d+(?:\.\d+)?)\s*(?:cm|CM|centimeters?|inches?|in|")?\s*[,;]?\s*D(?:epth)?:\s*(\d+(?:\.\d+)?)\s*(?:cm|CM|centimeters?|inches?|in|")?/i,

  // Pattern 3: "50 x 80 x 40 cm"
  /(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)\s*cm/
];

for (const pattern of dimensionPatterns) {
  const match = bodyText.match(pattern);
  if (match) {
    dimensions = {
      width: parseFloat(match[1]) / 100,  // Convert cm to meters
      height: parseFloat(match[2]) / 100,
      depth: parseFloat(match[3]) / 100
    };
    break;
  }
}
```

### Error Handling & Fallbacks

**Scraping Failure:**

```javascript
try {
  scrapedData = await scrapeProductUrl(url);
} catch (scrapeError) {
  // Update generation record with error
  db.run(
    `UPDATE ai_generations SET status = ?, error_message = ? WHERE id = ?`,
    ['failed', scrapeError.message, generationId]
  );

  return res.status(500).json({
    error: {
      message: 'Failed to scrape product URL',
      details: scrapeError.message
    },
    generationId
  });
}
```

**Frontend Fallback Flow (URLImportModal.tsx):**

1. If scraping fails, show manual input form
2. User can paste image URL manually
3. User can input dimensions manually
4. Still creates asset, just without automatic scraping

**Common Failure Reasons:**
- **CAPTCHA/Bot Detection**: Site blocks Puppeteer (use residential proxies or manual fallback)
- **JavaScript-Rendered Content**: Page requires JS execution (Puppeteer handles this, but may need `waitForSelector`)
- **Dynamic URLs**: Redirects, short URLs, app deep links
- **Site Changes**: Selectors break when site updates layout

### Image Download

**After User Confirms Import** (`ai.js:574-601`):

```javascript
async function downloadImage(imageUrl) {
  const fetch = (await import('node-fetch')).default;
  const fs = (await import('fs')).default;

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }

  const buffer = await response.buffer();
  const ext = imageUrl.split('.').pop().split('?')[0] || 'jpg';
  const filename = `url-import-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
  const filepath = join(__dirname, '../../../assets/uploads', filename);

  fs.writeFileSync(filepath, buffer);

  return `/assets/uploads/${filename}`;
}
```

**Asset Creation with Placeholder 3D Model:**

```javascript
db.run(
  `INSERT INTO assets (
    name, category, subcategory, source, model_path, thumbnail_path,
    width, height, depth, source_url, source_product_name,
    created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
  [
    name,
    category || 'Furniture',
    subcategory || 'Imported',
    'url_import',
    '/assets/models/placeholder.glb', // Placeholder until TRELLIS generates 3D model
    imagePath,
    dimensions.width,
    dimensions.height,
    dimensions.depth,
    sourceUrl,
    name
  ]
);
```

**Future Enhancement:**
- After importing from URL, automatically trigger TRELLIS to generate 3D model from product image
- Update `model_path` when TRELLIS completes

---

## Generation Lifecycle

### State Machine

All AI generations follow a consistent lifecycle:

```
           ┌──────────────┐
           │   PENDING    │
           └──────┬───────┘
                  │
                  ▼
           ┌──────────────┐
           │  PROCESSING  │◄──── Retry
           └──┬───────┬───┘
              │       │
              │       │
     Success  │       │ Error
              │       │
              ▼       ▼
      ┌──────────┐  ┌─────────┐
      │COMPLETED │  │ FAILED  │
      └──────────┘  └─────────┘
```

**State Descriptions:**

| State | Description | Can Retry? |
|-------|-------------|------------|
| `pending` | Created but not started | No (auto-starts) |
| `processing` | AI service is working | No (wait) |
| `completed` | Successfully generated | N/A |
| `failed` | Error occurred | Yes |

### Database Schema

**`ai_generations` Table:**

```sql
CREATE TABLE ai_generations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER,
  type TEXT NOT NULL,  -- 'photo_to_room'|'photo_to_furniture'|'url_import'
  input_image_path TEXT,
  input_url TEXT,
  output_model_path TEXT,
  output_dimensions TEXT,  -- JSON: { width, height, depth }
  status TEXT NOT NULL,    -- 'pending'|'processing'|'completed'|'failed'
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

### Tracking Generation Progress

**Backend: Create Record on Start** (`ai.js:155-164`):

```javascript
// Create AI generation record
db.run(
  `INSERT INTO ai_generations (type, input_image_path, status, created_at)
   VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
  ['photo_to_furniture', imagePath, 'processing']
);

const genResult = db.exec('SELECT last_insert_rowid() as id');
generationId = genResult[0].values[0][0];
saveDatabase();
```

**Backend: Update on Completion/Failure:**

```javascript
// Success
db.run(
  `UPDATE ai_generations
   SET status = ?, output_model_path = ?
   WHERE id = ?`,
  ['completed', modelPath, generationId]
);

// Failure
db.run(
  `UPDATE ai_generations
   SET status = ?, error_message = ?
   WHERE id = ?`,
  ['failed', error.message, generationId]
);
```

**Frontend: Poll for Status** (planned):

```typescript
// AIGenerationModal.tsx (conceptual)
const pollGenerationStatus = async (generationId: number) => {
  const maxAttempts = 60; // 5 minutes max
  let attempts = 0;

  while (attempts < maxAttempts) {
    const response = await fetch(`/api/ai/generation/${generationId}`);
    const { generation } = await response.json();

    if (generation.status === 'completed') {
      return generation;
    }

    if (generation.status === 'failed') {
      throw new Error(generation.error_message);
    }

    // Wait 5 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 5000));
    attempts++;
  }

  throw new Error('Generation timed out');
};
```

### Retry Mechanism (Planned)

**Retry with Adjusted Parameters:**

```javascript
// POST /api/ai/generation/:id/retry
router.post('/generation/:id/retry', async (req, res) => {
  const { id } = req.params;
  const { quality, options } = req.body; // User-adjustable parameters

  const db = await getDatabase();

  // Get original generation
  const result = db.exec(
    'SELECT * FROM ai_generations WHERE id = ?',
    [parseInt(id)]
  );

  if (result.length === 0) {
    return res.status(404).json({ error: { message: 'Generation not found' } });
  }

  const original = convertRowToObject(result[0]);

  // Reset status to processing
  db.run(
    `UPDATE ai_generations SET status = ?, error_message = NULL WHERE id = ?`,
    ['processing', id]
  );
  saveDatabase();

  // Retry with new parameters
  try {
    const result = await callTrellisApi(original.input_image_path, apiKey, { quality, ...options });

    db.run(
      `UPDATE ai_generations SET status = ?, output_model_path = ? WHERE id = ?`,
      ['completed', result.modelPath, id]
    );
    saveDatabase();

    res.json({ message: 'Retry succeeded', generation: result });
  } catch (error) {
    db.run(
      `UPDATE ai_generations SET status = ?, error_message = ? WHERE id = ?`,
      ['failed', error.message, id]
    );
    saveDatabase();

    res.status(500).json({ error: { message: 'Retry failed', details: error.message } });
  }
});
```

### Generation History

**GET /api/ai/generations** (planned):

```javascript
router.get('/generations', async (req, res) => {
  const { projectId, type, status, limit = 50 } = req.query;

  const db = await getDatabase();
  let query = 'SELECT * FROM ai_generations WHERE 1=1';
  const params = [];

  if (projectId) {
    query += ' AND project_id = ?';
    params.push(projectId);
  }

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit));

  const result = db.exec(query, params);
  const generations = convertToObjectArray(result);

  res.json({ generations });
});
```

**Frontend: Generation History Panel** (planned):

- Show all AI generations for current project
- Filter by type, status
- Retry failed generations
- View generation details (input image, output model, error message)

---

## Before/After Comparison

### Overview

**Goal:** After designing a room, generate a photo-realistic render from the same camera angle as an original room photo for before/after comparison.

**Current Status:** ❌ Not Implemented

### Workflow

```
1. User uploads original room photo
   ↓
2. Extract camera intrinsics and extrinsics
   ↓
3. Design room in 3D editor
   ↓
4. Click "Generate Before/After"
   ↓
5. Position 3D camera to match original photo angle
   ↓
6. Render high-quality image from matched angle
   ↓
7. Display side-by-side or slider comparison
```

### Camera Matching

**Challenge:** Estimate camera position/rotation from single photo

**Solution 1: Manual Alignment**
- User adjusts 3D camera to visually match photo
- Save camera transform

**Solution 2: SLAM/SfM (Structure from Motion)**
- Use COLMAP or OpenCV to estimate camera pose
- Requires camera calibration data (focal length, distortion)

**Solution 3: AI-Powered Pose Estimation**
- Train model to estimate camera pose from room photo
- Output: position (x, y, z), rotation (yaw, pitch, roll), FOV

**Camera Transform Storage:**

```sql
CREATE TABLE camera_poses (
  id INTEGER PRIMARY KEY,
  project_id INTEGER,
  original_photo_path TEXT,
  position_x REAL,
  position_y REAL,
  position_z REAL,
  rotation_x REAL,
  rotation_y REAL,
  rotation_z REAL,
  fov REAL,
  created_at DATETIME,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

### High-Quality Render Generation

**Backend Route:**

```javascript
// POST /api/export/before-after-render
router.post('/before-after-render', async (req, res) => {
  const { projectId, cameraTransform, width = 1920, height = 1080 } = req.body;

  // 1. Load project scene data
  const sceneData = await loadProjectScene(projectId);

  // 2. Set up headless Three.js renderer
  const renderer = new THREE.WebGLRenderer({
    width,
    height,
    antialias: true,
  });
  renderer.setSize(width, height);

  // 3. Create scene with all rooms, furniture, lighting
  const scene = buildThreeScene(sceneData);

  // 4. Position camera to match original photo
  const camera = new THREE.PerspectiveCamera(
    cameraTransform.fov,
    width / height,
    0.1,
    1000
  );
  camera.position.set(
    cameraTransform.position.x,
    cameraTransform.position.y,
    cameraTransform.position.z
  );
  camera.rotation.set(
    cameraTransform.rotation.x,
    cameraTransform.rotation.y,
    cameraTransform.rotation.z
  );

  // 5. Render to image
  renderer.render(scene, camera);

  // 6. Save image
  const canvas = renderer.domElement;
  const buffer = canvas.toBuffer('image/png');
  const filename = `render-${Date.now()}.png`;
  const filepath = `/assets/renders/${filename}`;

  fs.writeFileSync(join(__dirname, '../../..', filepath), buffer);

  res.json({
    message: 'Render generated',
    renderPath: filepath
  });
});
```

**Note:** Three.js headless rendering requires `canvas` npm package (node-canvas).

### Comparison UI

**Side-by-Side View:**

```tsx
<div className="flex gap-4">
  <div className="flex-1">
    <h3>Before (Original Photo)</h3>
    <img src={originalPhotoPath} alt="Before" />
  </div>
  <div className="flex-1">
    <h3>After (3D Render)</h3>
    <img src={renderPath} alt="After" />
  </div>
</div>
```

**Slider Comparison:**

```tsx
import ReactCompareSlider from 'react-compare-slider';

<ReactCompareSlider
  itemOne={<img src={originalPhotoPath} alt="Before" />}
  itemTwo={<img src={renderPath} alt="After" />}
  position={50} // Initial slider position (%)
/>
```

**Export Comparison:**

```javascript
// POST /api/export/before-after-image
router.post('/before-after-image', async (req, res) => {
  const { originalPhotoPath, renderPath, layout = 'side-by-side' } = req.body;

  // Use Sharp or Canvas to composite images
  const sharp = require('sharp');

  if (layout === 'side-by-side') {
    const [before, after] = await Promise.all([
      sharp(originalPhotoPath).toBuffer(),
      sharp(renderPath).toBuffer()
    ]);

    const composite = await sharp({
      create: {
        width: 1920 * 2,
        height: 1080,
        channels: 3,
        background: { r: 0, g: 0, b: 0 }
      }
    })
    .composite([
      { input: before, left: 0, top: 0 },
      { input: after, left: 1920, top: 0 }
    ])
    .png()
    .toFile('/assets/exports/before-after.png');

    res.json({ exportPath: '/assets/exports/before-after.png' });
  }
});
```

---

## API Key Management

### Encryption at Rest

**Why Encrypt?**
- Users configure sensitive API keys (TRELLIS, etc.)
- Stored in local SQLite database
- Protect against unauthorized access (if someone copies the database file)

**Encryption Algorithm:**
- **AES-256-CBC**: Industry-standard symmetric encryption
- **Key Size**: 256 bits (32 bytes)
- **IV (Initialization Vector)**: 16 bytes, randomly generated per encryption
- **Key Source**: `ENCRYPTION_KEY` environment variable

**Encryption Implementation** (`settings.js:14-30`):

```javascript
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'home-designer-default-key-32ch';
const IV_LENGTH = 16;

function encrypt(text) {
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Return IV + encrypted data (for decryption)
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encryptedText = parts.join(':');

  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

### Storing API Keys

**POST /api/settings** (`settings.js:45-115`):

```javascript
router.put('/', async (req, res) => {
  const { trellis_api_key, ...otherSettings } = req.body;

  const db = await getDatabase();

  // Store TRELLIS API key (encrypted)
  if (trellis_api_key !== undefined) {
    const encrypted = encrypt(trellis_api_key);

    db.run(
      `INSERT OR REPLACE INTO user_settings (key, value, encrypted)
       VALUES (?, ?, ?)`,
      ['trellis_api_key', encrypted, 1]
    );
  }

  // Store other settings (non-encrypted)
  Object.entries(otherSettings).forEach(([key, value]) => {
    db.run(
      `INSERT OR REPLACE INTO user_settings (key, value, encrypted)
       VALUES (?, ?, ?)`,
      [key, String(value), 0]
    );
  });

  saveDatabase();
  res.json({ message: 'Settings saved successfully' });
});
```

**Frontend: Settings UI** (SettingsModal.tsx):

```typescript
const [trellisApiKey, setTrellisApiKey] = useState('');

const handleSaveSettings = async () => {
  await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      trellis_api_key: trellisApiKey,
      // ... other settings
    }),
  });

  toast.success('Settings saved');
};

// Input field (masked for security)
<input
  type="password"
  value={trellisApiKey}
  onChange={(e) => setTrellisApiKey(e.target.value)}
  placeholder="Enter TRELLIS API key"
/>
```

### Validation Endpoint (Planned)

**POST /api/settings/api-keys/validate:**

```javascript
router.post('/api-keys/validate', async (req, res) => {
  const { service } = req.body; // 'trellis', etc.

  const apiKey = await getTrellisApiKey(); // Decrypt from DB

  if (!apiKey) {
    return res.json({ valid: false, message: 'API key not configured' });
  }

  try {
    // Make a test API call to validate the key
    const testResponse = await fetch('https://trellis-api.example.com/v1/health', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    if (testResponse.ok) {
      res.json({ valid: true, message: 'API key is valid' });
    } else {
      res.json({ valid: false, message: 'Invalid API key' });
    }
  } catch (error) {
    res.json({ valid: false, message: 'Failed to validate API key' });
  }
});
```

**Frontend: Validate on Save:**

```typescript
const handleSaveSettings = async () => {
  // Save settings
  await saveSettings();

  // Validate TRELLIS key
  const validation = await fetch('/api/settings/api-keys/validate', {
    method: 'POST',
    body: JSON.stringify({ service: 'trellis' }),
  }).then(r => r.json());

  if (validation.valid) {
    toast.success('API key validated successfully');
  } else {
    toast.error(`API key validation failed: ${validation.message}`);
  }
};
```

### Per-Service Configuration

**Multiple AI Services:**

```javascript
// Settings storage
const aiApiKeys = {
  trellis_api_key: 'abc123...',
  room_reconstruction_api_key: 'xyz789...',
  floor_plan_api_key: 'def456...',
};

// Store each separately (encrypted)
Object.entries(aiApiKeys).forEach(([key, value]) => {
  const encrypted = encrypt(value);
  db.run(
    `INSERT OR REPLACE INTO user_settings (key, value, encrypted)
     VALUES (?, ?, ?)`,
    [key, encrypted, 1]
  );
});
```

**Frontend: Settings Tabs:**

```tsx
<Tabs>
  <Tab label="TRELLIS">
    <input type="password" value={trellisKey} onChange={...} />
  </Tab>
  <Tab label="Room Reconstruction">
    <input type="password" value={roomReconKey} onChange={...} />
  </Tab>
  <Tab label="Floor Plan">
    <input type="password" value={floorPlanKey} onChange={...} />
  </Tab>
</Tabs>
```

### Missing/Invalid Key Handling

**When Key is Missing:**

```javascript
const apiKey = await getTrellisApiKey();

if (!apiKey || apiKey === '****') {
  return res.status(400).json({
    error: {
      message: 'TRELLIS API key not configured',
      action: 'Please add your API key in Settings > AI Services > TRELLIS'
    }
  });
}
```

**Frontend Error Display:**

```tsx
if (error.message.includes('API key not configured')) {
  return (
    <Alert variant="warning">
      <AlertTitle>API Key Required</AlertTitle>
      <AlertDescription>
        TRELLIS API key is not configured.
        <Link to="/settings">Go to Settings</Link> to add your API key.
      </AlertDescription>
    </Alert>
  );
}
```

---

## Extending AI Features

### Adding a New AI Provider

**Example: Adding Hugging Face Diffusion API for Texture Generation**

**Step 1: Add API Key Storage**

```javascript
// backend/src/routes/settings.js
// Already handled - any key can be stored encrypted
```

**Step 2: Create Service Module**

```javascript
// backend/src/services/huggingface.js
export async function generateTexture(prompt, apiKey) {
  const response = await fetch('https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: { height: 512, width: 512 }
    }),
  });

  const imageBuffer = await response.buffer();
  const filename = `texture-${Date.now()}.png`;
  const filepath = `/assets/textures/${filename}`;

  fs.writeFileSync(join(__dirname, '../../..', filepath), imageBuffer);

  return { texturePath: filepath };
}
```

**Step 3: Add API Route**

```javascript
// backend/src/routes/ai.js
router.post('/generate-texture', async (req, res) => {
  const { prompt } = req.body;

  // Get Hugging Face API key
  const apiKey = await getApiKey('huggingface_api_key');

  if (!apiKey) {
    return res.status(400).json({
      error: { message: 'Hugging Face API key not configured' }
    });
  }

  try {
    const result = await generateTexture(prompt, apiKey);
    res.json({ message: 'Texture generated', texturePath: result.texturePath });
  } catch (error) {
    res.status(500).json({
      error: { message: 'Failed to generate texture', details: error.message }
    });
  }
});
```

**Step 4: Add Frontend UI**

```tsx
// frontend/src/components/TextureGeneratorModal.tsx
const generateTexture = async (prompt: string) => {
  const response = await fetch('/api/ai/generate-texture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  const data = await response.json();
  return data.texturePath;
};
```

### Adding a New Generation Type

**Example: AI Interior Style Transfer**

**Step 1: Add to `ai_generations` Type Enum**

```sql
-- type: 'photo_to_room'|'photo_to_furniture'|'url_import'|'style_transfer'
```

**Step 2: Create Route**

```javascript
router.post('/style-transfer', upload.single('photo'), async (req, res) => {
  const { targetStyle } = req.body; // 'modern', 'rustic', 'minimalist'

  // Create generation record
  db.run(
    `INSERT INTO ai_generations (type, input_image_path, status)
     VALUES (?, ?, ?)`,
    ['style_transfer', imagePath, 'processing']
  );

  // Call style transfer AI service
  const result = await callStyleTransferApi(imagePath, targetStyle);

  // Update generation record
  db.run(
    `UPDATE ai_generations SET status = ?, output_model_path = ? WHERE id = ?`,
    ['completed', result.styledImagePath, generationId]
  );

  res.json({ message: 'Style transferred', result });
});
```

### Adapter Pattern (Recommended)

**Problem:** Different AI services have different APIs, authentication, request/response formats.

**Solution:** Create adapter classes for each service.

**Base Adapter Interface:**

```typescript
// backend/src/services/ai/BaseAIAdapter.ts
export interface AIAdapter {
  name: string;
  validateApiKey(apiKey: string): Promise<boolean>;
  generateFromImage(imagePath: string, options: any): Promise<GenerationResult>;
  pollStatus(generationId: string): Promise<GenerationStatus>;
}

export interface GenerationResult {
  modelPath: string;
  thumbnailPath: string;
  dimensions: { width: number; height: number; depth: number };
}

export interface GenerationStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number; // 0-100
  errorMessage?: string;
}
```

**TRELLIS Adapter:**

```typescript
// backend/src/services/ai/TrellisAdapter.ts
export class TrellisAdapter implements AIAdapter {
  name = 'TRELLIS';

  async validateApiKey(apiKey: string): Promise<boolean> {
    const response = await fetch('https://trellis-api.example.com/v1/health', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    return response.ok;
  }

  async generateFromImage(imagePath: string, options: any): Promise<GenerationResult> {
    // TRELLIS-specific implementation
  }

  async pollStatus(generationId: string): Promise<GenerationStatus> {
    // TRELLIS-specific implementation
  }
}
```

**Usage in Routes:**

```javascript
const adapters = {
  trellis: new TrellisAdapter(),
  huggingface: new HuggingFaceAdapter(),
};

router.post('/generate-from-photo', async (req, res) => {
  const { provider = 'trellis' } = req.body;
  const adapter = adapters[provider];

  if (!adapter) {
    return res.status(400).json({ error: { message: 'Invalid AI provider' } });
  }

  const apiKey = await getApiKey(`${provider}_api_key`);
  const result = await adapter.generateFromImage(imagePath, options);

  res.json({ result });
});
```

### Testing Without Real API Keys

**Mock AI Responses for Development:**

```javascript
// backend/src/services/ai/MockAdapter.ts
export class MockAdapter implements AIAdapter {
  name = 'Mock';

  async validateApiKey(apiKey: string): Promise<boolean> {
    return apiKey === 'mock-key-123';
  }

  async generateFromImage(imagePath: string, options: any): Promise<GenerationResult> {
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Return fake result
    return {
      modelPath: '/assets/models/mock-generated.glb',
      thumbnailPath: imagePath,
      dimensions: { width: 1.0, height: 0.8, depth: 0.5 }
    };
  }

  async pollStatus(generationId: string): Promise<GenerationStatus> {
    return { status: 'completed' };
  }
}
```

**Enable Mock Mode in Development:**

```javascript
const isDevelopment = process.env.NODE_ENV === 'development';

const adapters = {
  trellis: isDevelopment ? new MockAdapter() : new TrellisAdapter(),
};
```

**Frontend: Mock UI Testing:**

```typescript
// Use mock provider in development
const provider = process.env.NODE_ENV === 'development' ? 'mock' : 'trellis';

await fetch('/api/ai/generate-from-photo', {
  method: 'POST',
  body: formData,
  headers: { 'X-AI-Provider': provider }
});
```

---

## Summary

### AI Features Status

| Feature | Backend | Frontend | Production-Ready? |
|---------|---------|----------|-------------------|
| **TRELLIS Photo-to-3D** | ⚠️ Placeholder | ✅ UI Ready | ❌ API Integration Needed |
| **Product URL Scraping** | ✅ Functional | ✅ Full Flow | ✅ Yes |
| **Dimension Estimation** | ✅ Regex Patterns | ✅ Manual Override | ✅ Yes |
| **Photo-to-Room** | ❌ Not Implemented | ❌ Not Implemented | ❌ No |
| **Floor Plan Processing** | ❌ Not Implemented | ❌ Not Implemented | ❌ No |
| **Before/After** | ❌ Not Implemented | ❌ Not Implemented | ❌ No |

### Architecture Highlights

1. **Encrypted API Key Storage**: AES-256-CBC encryption for all AI service keys
2. **Generation Lifecycle Tracking**: Consistent state machine for all AI operations
3. **Extensible Design**: Adapter pattern ready for multiple AI providers
4. **Graceful Degradation**: Fallback flows when AI services fail
5. **Mock Support**: Development mode with simulated AI responses

### Next Steps for Full Implementation

1. **Integrate Real TRELLIS API**: Replace placeholder with actual API calls
2. **Add Progress Polling**: Long-running generations need status updates
3. **Implement Retry Logic**: Allow users to retry failed generations
4. **Add Generation History UI**: Show past AI generations
5. **Photo-to-Room Service**: Integrate room reconstruction AI
6. **Floor Plan Parser**: Implement wall detection and room segmentation
7. **Before/After Rendering**: Add camera matching and comparison UI
8. **Quality Settings**: Allow users to configure AI generation quality vs speed

**Recommendation:** Start with completing TRELLIS integration as it's the most user-visible and valuable AI feature.
