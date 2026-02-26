import express from 'express';
import crypto from 'crypto';

const router = express.Router();

// Encryption key (in production, this should be in environment variables)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'home-designer-default-key-32ch'; // Must be 32 chars for AES-256
const IV_LENGTH = 16; // For AES, this is always 16

/**
 * Encrypt a string value
 */
function encrypt(text) {
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt an encrypted string
 */
function decrypt(text) {
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = textParts.join(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Mask an API key for display (show only last 4 characters)
 */
function maskApiKey(key) {
  if (!key || key.length < 4) return '****';
  return '****' + key.slice(-4);
}

// GET /api/settings - Get all settings
router.get('/settings', async (req, res) => {
  try {
    const { getDatabase } = await import('../db/connection.js');
    const db = await getDatabase();

    const result = db.exec('SELECT key, value, encrypted FROM user_settings');

    if (result.length === 0) {
      return res.json({ settings: {} });
    }

    const settings = {};
    const columns = result[0].columns;
    const rows = result[0].values;

    rows.forEach(row => {
      const key = row[0];
      const value = row[1];
      const encrypted = row[2] === 1;

      // If encrypted, decrypt the value and mask for display
      if (encrypted) {
        try {
          const decrypted = decrypt(value);
          settings[key] = maskApiKey(decrypted);
        } catch (err) {
          console.error(`Failed to decrypt setting ${key}:`, err);
          settings[key] = '****';
        }
      } else {
        settings[key] = value;
      }
    });

    res.json({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch settings',
        details: error.message
      }
    });
  }
});

// PUT /api/settings - Update settings
router.put('/settings', async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        error: { message: 'Settings object is required' }
      });
    }

    const { getDatabase, saveDatabase } = await import('../db/connection.js');
    const db = await getDatabase();

    // List of settings that should be encrypted
    const encryptedKeys = ['trellis_api_key', 'openai_api_key', 'anthropic_api_key'];

    // Process each setting
    for (const [key, value] of Object.entries(settings)) {
      const shouldEncrypt = encryptedKeys.includes(key);
      let storedValue = value;

      // If it's an API key and not masked, encrypt it
      if (shouldEncrypt) {
        // Check if value is masked (starts with ****)
        if (value.startsWith('****')) {
          // Don't update if it's just the masked value
          continue;
        }
        // Encrypt the actual API key
        storedValue = encrypt(value);
      }

      // Upsert the setting
      db.run(
        `INSERT INTO user_settings (key, value, encrypted)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = ?, encrypted = ?`,
        [key, storedValue, shouldEncrypt ? 1 : 0, storedValue, shouldEncrypt ? 1 : 0]
      );
    }

    // Save to disk
    saveDatabase();

    // Return updated settings (with masked API keys)
    const result = db.exec('SELECT key, value, encrypted FROM user_settings');
    const updatedSettings = {};

    if (result.length > 0) {
      result[0].values.forEach(row => {
        const key = row[0];
        const value = row[1];
        const encrypted = row[2] === 1;

        if (encrypted) {
          try {
            const decrypted = decrypt(value);
            updatedSettings[key] = maskApiKey(decrypted);
          } catch (err) {
            updatedSettings[key] = '****';
          }
        } else {
          updatedSettings[key] = value;
        }
      });
    }

    res.json({
      message: 'Settings updated successfully',
      settings: updatedSettings
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      error: {
        message: 'Failed to update settings',
        details: error.message
      }
    });
  }
});

// GET /api/settings/api-key/:keyName - Get decrypted API key (for internal use)
router.get('/settings/api-key/:keyName', async (req, res) => {
  try {
    const { keyName } = req.params;
    const { getDatabase } = await import('../db/connection.js');
    const db = await getDatabase();

    const result = db.exec(
      'SELECT value, encrypted FROM user_settings WHERE key = ?',
      [keyName]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({
        error: { message: 'API key not found' }
      });
    }

    const value = result[0].values[0][0];
    const encrypted = result[0].values[0][1] === 1;

    let apiKey = value;
    if (encrypted) {
      try {
        apiKey = decrypt(value);
      } catch (err) {
        return res.status(500).json({
          error: { message: 'Failed to decrypt API key' }
        });
      }
    }

    res.json({ key: apiKey });
  } catch (error) {
    console.error('Error fetching API key:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch API key',
        details: error.message
      }
    });
  }
});

export default router;
