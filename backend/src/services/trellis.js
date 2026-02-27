/**
 * TRELLIS API Service
 * 
 * Microsoft TRELLIS is a research model for image-to-3D generation.
 * This service handles:
 * - Image upload and job creation
 * - Status polling
 * - Model download and conversion
 * 
 * API Documentation: https://github.com/microsoft/TRELLIS
 * 
 * Note: TRELLIS may be accessed via:
 * 1. Hugging Face Spaces API (public demo)
 * 2. Self-hosted inference server
 * 3. Replicate API (if available)
 */

import fetch from 'node-fetch';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const TRELLIS_ENDPOINTS = {
  // Hugging Face Spaces endpoint (gradio API)
  huggingface: 'https://microsoft-trellis.hf.space/api',
  // Replicate endpoint (if using Replicate hosting)
  replicate: 'https://api.replicate.com/v1/predictions',
  // Self-hosted endpoint
  selfHosted: process.env.TRELLIS_ENDPOINT || null,
};

const MODELS_DIR = join(__dirname, '../../../assets/models');

/**
 * Ensure models directory exists
 */
function ensureModelsDir() {
  if (!existsSync(MODELS_DIR)) {
    mkdirSync(MODELS_DIR, { recursive: true });
  }
}

/**
 * Generate a unique model filename
 */
function generateModelFilename() {
  const id = crypto.randomBytes(8).toString('hex');
  return `generated-${Date.now()}-${id}.glb`;
}

/**
 * TRELLIS API Client
 */
export class TrellisClient {
  constructor(apiKey, endpoint = 'huggingface') {
    this.apiKey = apiKey;
    this.endpoint = TRELLIS_ENDPOINTS[endpoint] || endpoint;
    this.endpointType = endpoint;
  }

  /**
   * Generate 3D model from image using Hugging Face Spaces API
   */
  async generateViaHuggingFace(imageBase64) {
    console.log('[TRELLIS] Starting generation via Hugging Face...');

    // Hugging Face Spaces use Gradio API
    // First, we need to join the queue
    const queueResponse = await fetch(`${this.endpoint}/queue/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: [
          `data:image/png;base64,${imageBase64}`, // Image as data URL
          42, // Random seed
          'auto', // Mode: auto/manual
          true, // Remove background
          0.9, // Foreground ratio
        ],
        fn_index: 0,
        session_hash: crypto.randomBytes(8).toString('hex'),
      }),
    });

    if (!queueResponse.ok) {
      const error = await queueResponse.text();
      throw new Error(`Failed to start TRELLIS generation: ${error}`);
    }

    const queueData = await queueResponse.json();
    const eventId = queueData.event_id;

    console.log('[TRELLIS] Queued with event ID:', eventId);

    // Poll for completion
    let result = null;
    let attempts = 0;
    const maxAttempts = 120; // 2 minutes max

    while (!result && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;

      const statusResponse = await fetch(`${this.endpoint}/queue/status/${eventId}`);
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        
        if (status.status === 'complete') {
          result = status.output;
          break;
        } else if (status.status === 'failed') {
          throw new Error(status.error || 'TRELLIS generation failed');
        }
        
        console.log(`[TRELLIS] Status: ${status.status} (attempt ${attempts}/${maxAttempts})`);
      }
    }

    if (!result) {
      throw new Error('TRELLIS generation timed out');
    }

    return result;
  }

  /**
   * Generate 3D model from image using Replicate API
   */
  async generateViaReplicate(imageBase64) {
    console.log('[TRELLIS] Starting generation via Replicate...');

    if (!this.apiKey) {
      throw new Error('Replicate API key required');
    }

    // Create prediction
    const createResponse = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'microsoft/trellis:latest', // Adjust version as needed
        input: {
          image: `data:image/png;base64,${imageBase64}`,
          seed: Math.floor(Math.random() * 1000000),
        },
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.json();
      throw new Error(`Replicate API error: ${error.detail || 'Unknown error'}`);
    }

    const prediction = await createResponse.json();
    console.log('[TRELLIS] Prediction created:', prediction.id);

    // Poll for completion
    let result = null;
    let attempts = 0;
    const maxAttempts = 120;

    while (!result && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;

      const statusResponse = await fetch(prediction.urls.get, {
        headers: {
          'Authorization': `Token ${this.apiKey}`,
        },
      });

      if (statusResponse.ok) {
        const status = await statusResponse.json();

        if (status.status === 'succeeded') {
          result = status.output;
          break;
        } else if (status.status === 'failed') {
          throw new Error(status.error || 'TRELLIS generation failed');
        }

        console.log(`[TRELLIS] Status: ${status.status} (attempt ${attempts}/${maxAttempts})`);
      }
    }

    if (!result) {
      throw new Error('TRELLIS generation timed out');
    }

    return result;
  }

  /**
   * Download GLB model from URL and save locally
   */
  async downloadModel(modelUrl) {
    console.log('[TRELLIS] Downloading model from:', modelUrl);
    
    ensureModelsDir();
    const filename = generateModelFilename();
    const filepath = join(MODELS_DIR, filename);

    const response = await fetch(modelUrl);
    if (!response.ok) {
      throw new Error(`Failed to download model: ${response.statusText}`);
    }

    const buffer = await response.buffer();
    writeFileSync(filepath, buffer);

    console.log('[TRELLIS] Model saved to:', filepath);
    return `/assets/models/${filename}`;
  }

  /**
   * Main generation function
   */
  async generate(imagePath, imageBase64) {
    console.log('[TRELLIS] Starting 3D model generation...');
    console.log('[TRELLIS] Endpoint type:', this.endpointType);

    let output;

    try {
      switch (this.endpointType) {
        case 'replicate':
          output = await this.generateViaReplicate(imageBase64);
          break;
        case 'huggingface':
        default:
          output = await this.generateViaHuggingFace(imageBase64);
          break;
      }

      // Output should contain the GLB model URL
      let modelUrl;
      if (typeof output === 'string') {
        modelUrl = output;
      } else if (output.glb || output.model) {
        modelUrl = output.glb || output.model;
      } else if (Array.isArray(output) && output.length > 0) {
        // Gradio often returns array of outputs
        modelUrl = output[0];
      }

      if (!modelUrl) {
        throw new Error('No model URL in TRELLIS response');
      }

      // Download and save the model
      const localPath = await this.downloadModel(modelUrl);

      // Estimate dimensions from the model (placeholder - would need actual 3D parsing)
      const dimensions = {
        width: 1.0,
        height: 0.8,
        depth: 0.5,
      };

      return {
        modelPath: localPath,
        thumbnailPath: imagePath,
        dimensions,
        success: true,
      };

    } catch (error) {
      console.error('[TRELLIS] Generation error:', error);
      throw error;
    }
  }
}

/**
 * Fallback: Generate placeholder model when API is unavailable
 */
export async function generatePlaceholderModel(imagePath) {
  console.log('[TRELLIS] Using placeholder model (API unavailable)');
  
  ensureModelsDir();
  
  // For now, return a placeholder that references a basic shape
  // In production, you might have a default cube.glb or similar
  return {
    modelPath: '/assets/models/placeholder.glb',
    thumbnailPath: imagePath,
    dimensions: {
      width: 1.0,
      height: 0.8,
      depth: 0.5,
    },
    isPlaceholder: true,
  };
}

export default TrellisClient;
