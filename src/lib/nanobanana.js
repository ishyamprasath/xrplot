/**
 * NanoBanana — Direct Gemini 2.5 Flash Image API Helper
 * Replaces Vercel AI Gateway for image generation, editing, and stitching.
 * Enhanced with retries, validation, and sharp fallback processing.
 */

import { GoogleGenAI } from '@google/genai';
import sharp from 'sharp';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

let aiInstance = null;

function getAI() {
  if (!aiInstance) {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured in environment');
    }
    aiInstance = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }
  return aiInstance;
}

/**
 * Validate that a buffer is a real image with actual content
 * @param {Buffer} buffer
 * @returns {Promise<{valid: boolean, width?: number, height?: number, format?: string}>}
 */
async function validateImageBuffer(buffer) {
  try {
    if (!buffer || buffer.length < 100) {
      return { valid: false, reason: 'Buffer too small or empty' };
    }
    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height) {
      return { valid: false, reason: 'Invalid image dimensions' };
    }
    // Reject nearly blank images (all same color)
    const stats = await sharp(buffer).stats();
    const isBlank = stats.channels.every(ch =>
      Math.abs(ch.mean - stats.channels[0].mean) < 2
    );
    if (isBlank) {
      return { valid: false, reason: 'Image appears blank or single-color' };
    }
    return {
      valid: true,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
    };
  } catch (err) {
    return { valid: false, reason: `Sharp validation error: ${err.message}` };
  }
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Internal image generation with a single attempt
 */
async function attemptGenerateImage(prompt, inputImages = []) {
  const parts = [{ text: prompt }];

  for (const img of inputImages) {
    parts.push({
      inlineData: {
        mimeType: img.mimeType || 'image/jpeg',
        data: img.base64,
      },
    });
  }

  const result = await getAI().models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: [{ role: 'user', parts }],
  });

  const responseParts = result.candidates?.[0]?.content?.parts || [];
  for (const part of responseParts) {
    if (part.inlineData?.data) {
      return Buffer.from(part.inlineData.data, 'base64');
    }
  }

  throw new Error('No image data in Gemini response');
}

/**
 * Generate an image using Gemini 2.5 Flash Image (NanoBanana)
 * With retry logic, validation, and automatic fallback processing.
 *
 * @param {string} prompt - Text prompt describing the desired image
 * @param {Array<{base64: string, mimeType: string}>} inputImages - Optional input images as base64 strings
 * @param {Object} options - Optional settings
 * @param {number} options.maxRetries - Max retry attempts (default 3)
 * @param {boolean} options.validate - Validate returned image (default true)
 * @param {boolean} options.normalize - Normalize output with sharp (default true)
 * @param {number} options.targetWidth - Normalize width (default 4096 for panoramas, 2048 otherwise)
 * @param {number} options.targetHeight - Normalize height (default 2048 for panoramas, 2048 otherwise)
 * @returns {Promise<Buffer>} - Generated image as a Buffer
 */
export async function generateImageWithGemini(prompt, inputImages = [], options = {}) {
  const {
    maxRetries = MAX_RETRIES,
    validate = true,
    normalize = true,
    targetWidth = 2048,
    targetHeight = 2048,
  } = options;

  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[NanoBanana] Attempt ${attempt}/${maxRetries} — generating image...`);
      const rawBuffer = await attemptGenerateImage(prompt, inputImages);
      console.log(`[NanoBanana] Raw buffer received: ${rawBuffer.length} bytes`);

      if (validate) {
        const validation = await validateImageBuffer(rawBuffer);
        if (!validation.valid) {
          throw new Error(`Image validation failed: ${validation.reason}`);
        }
        console.log(`[NanoBanana] Image validated: ${validation.width}x${validation.height} ${validation.format}`);
      }

      if (normalize) {
        const normalized = await sharp(rawBuffer)
          .resize(targetWidth, targetHeight, { fit: 'cover', withoutEnlargement: false })
          .jpeg({ quality: 92, progressive: true, mozjpeg: true })
          .toBuffer();
        console.log(`[NanoBanana] Normalized image: ${normalized.length} bytes`);
        return normalized;
      }

      return rawBuffer;
    } catch (err) {
      lastError = err;
      console.error(`[NanoBanana] Attempt ${attempt} failed:`, err.message);
      if (attempt < maxRetries) {
        const delay = RETRY_DELAY_MS * attempt;
        console.log(`[NanoBanana] Waiting ${delay}ms before retry...`);
        await sleep(delay);
      }
    }
  }

  throw new Error(`[NanoBanana] All ${maxRetries} attempts failed. Last error: ${lastError.message}`);
}
