const fs = require('fs');
const path = require('path');

// Create a minimal valid GLB file (cube geometry)
// GLB format: 12-byte header + JSON chunk + BIN chunk

// Simple cube vertices (8 corners)
const positions = new Float32Array([
  // Front face
  -0.5, -0.5,  0.5,
   0.5, -0.5,  0.5,
   0.5,  0.5,  0.5,
  -0.5,  0.5,  0.5,
  // Back face
  -0.5, -0.5, -0.5,
   0.5, -0.5, -0.5,
   0.5,  0.5, -0.5,
  -0.5,  0.5, -0.5,
]);

// 12 triangles = 6 faces
const indices = new Uint16Array([
  0, 1, 2,  0, 2, 3,  // Front
  1, 5, 6,  1, 6, 2,  // Right
  5, 4, 7,  5, 7, 6,  // Back
  4, 0, 3,  4, 3, 7,  // Left
  3, 2, 6,  3, 6, 7,  // Top
  4, 5, 1,  4, 1, 0,  // Bottom
]);

// Build minimal glTF JSON
const gltf = {
  asset: { version: '2.0', generator: 'HomeDesigner' },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name: 'Placeholder' }],
  meshes: [{
    primitives: [{
      attributes: { POSITION: 0 },
      indices: 1,
      material: 0
    }]
  }],
  materials: [{
    pbrMetallicRoughness: {
      baseColorFactor: [0.8, 0.8, 0.8, 1.0],
      metallicFactor: 0.0,
      roughnessFactor: 0.8
    },
    name: 'PlaceholderMaterial'
  }],
  accessors: [
    { bufferView: 0, componentType: 5126, count: 8, type: 'VEC3', max: [0.5, 0.5, 0.5], min: [-0.5, -0.5, -0.5] },
    { bufferView: 1, componentType: 5123, count: 36, type: 'SCALAR' }
  ],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: positions.byteLength, target: 34962 },
    { buffer: 0, byteOffset: positions.byteLength, byteLength: indices.byteLength, target: 34963 }
  ],
  buffers: [{ byteLength: positions.byteLength + indices.byteLength }]
};

// Combine binary data
const binData = Buffer.concat([Buffer.from(positions.buffer), Buffer.from(indices.buffer)]);

// Create GLB
const jsonStr = JSON.stringify(gltf);
const jsonPadded = jsonStr + ' '.repeat((4 - jsonStr.length % 4) % 4);
const binPadded = Buffer.concat([binData, Buffer.alloc((4 - binData.length % 4) % 4)]);

const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546C67, 0); // 'glTF'
header.writeUInt32LE(2, 4); // version
header.writeUInt32LE(12 + 8 + jsonPadded.length + 8 + binPadded.length, 8); // total length

const jsonChunkHeader = Buffer.alloc(8);
jsonChunkHeader.writeUInt32LE(jsonPadded.length, 0);
jsonChunkHeader.writeUInt32LE(0x4E4F534A, 4); // 'JSON'

const binChunkHeader = Buffer.alloc(8);
binChunkHeader.writeUInt32LE(binPadded.length, 0);
binChunkHeader.writeUInt32LE(0x004E4942, 4); // 'BIN'

const glb = Buffer.concat([header, jsonChunkHeader, Buffer.from(jsonPadded), binChunkHeader, binPadded]);

const modelsDir = path.join(__dirname, '../assets/models');
fs.mkdirSync(modelsDir, { recursive: true });
fs.writeFileSync(path.join(modelsDir, 'placeholder.glb'), glb);
console.log('Created placeholder.glb:', glb.length, 'bytes');
