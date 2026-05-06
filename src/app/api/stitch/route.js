import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import axios from 'axios';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Download an image from URL and return as Sharp buffer
 */
async function downloadImage(url) {
  const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
  return Buffer.from(response.data);
}

/**
 * Create an equirectangular panorama by compositing 24 images
 * arranged in a 6×4 grid (6 yaw positions × 4 pitch rows).
 * 
 * Layout mapping:
 *   Row 0 (Upper):    pitch +45° - images 0-5
 *   Row 1 (Mid-up):   pitch +15° - images 6-11  
 *   Row 2 (Mid-low):  pitch -15° - images 12-17
 *   Row 3 (Lower):    pitch -45° - images 18-23
 *   
 *   Each row: yaw 0°, 60°, 120°, 180°, 240°, 300°
 */
async function createPanorama(imageUrls) {
  const TOTAL_SHOTS = 24;
  const COLS = 6;
  const ROWS = 4;
  
  // Panorama dimensions (2:1 aspect ratio for equirectangular)
  const PANO_WIDTH = 6144;
  const PANO_HEIGHT = 3072;
  
  // Each image slot dimensions
  const SLOT_WIDTH = Math.floor(PANO_WIDTH / COLS);   // 1024
  const SLOT_HEIGHT = Math.floor(PANO_HEIGHT / ROWS); // 768
  
  console.log(`[Stitch] Creating ${PANO_WIDTH}×${PANO_HEIGHT} panorama from ${imageUrls.length} images`);
  
  // Create base canvas (black background)
  let canvas = sharp({
    create: {
      width: PANO_WIDTH,
      height: PANO_HEIGHT,
      channels: 3,
      background: { r: 0, g: 0, b: 0 }
    }
  }).jpeg({ quality: 90 });
  
  // Build composite operations
  const composites = [];
  
  for (let i = 0; i < Math.min(imageUrls.length, TOTAL_SHOTS); i++) {
    const row = Math.floor(i / COLS);
    const col = i % COLS;
    
    const left = col * SLOT_WIDTH;
    const top = row * SLOT_HEIGHT;
    
    try {
      const imageBuffer = await downloadImage(imageUrls[i]);
      
      // Resize image to fit slot while maintaining aspect ratio
      const resized = await sharp(imageBuffer)
        .resize(SLOT_WIDTH, SLOT_HEIGHT, { 
          fit: 'cover',
          position: 'center'
        })
        .toBuffer();
      
      composites.push({
        input: resized,
        left,
        top
      });
      
      console.log(`[Stitch] Placed image ${i+1}/${imageUrls.length} at row ${row}, col ${col}`);
    } catch (err) {
      console.error(`[Stitch] Failed to process image ${i}:`, err.message);
      // Continue with remaining images
    }
  }
  
  if (composites.length === 0) {
    throw new Error('No images could be processed');
  }
  
  // Composite all images onto the canvas
  console.log(`[Stitch] Compositing ${composites.length} images...`);
  const panoramaBuffer = await sharp(await canvas.toBuffer())
    .composite(composites)
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();
  
  console.log(`[Stitch] Panorama created: ${panoramaBuffer.length} bytes`);
  
  return panoramaBuffer;
}

/**
 * Upload panorama buffer to Cloudinary
 */
async function uploadToCloudinary(buffer, filename) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'xrplot/panoramas',
        public_id: filename,
        overwrite: true,
        resource_type: 'image',
        quality: 'auto:good',
      },
      (error, result) => {
        if (error) {
          console.error('[Stitch] Cloudinary upload error:', error);
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
        } else {
          console.log('[Stitch] Uploaded to Cloudinary:', result.secure_url);
          resolve(result.secure_url);
        }
      }
    );
    
    // Stream the buffer to Cloudinary
    const { Readable } = require('stream');
    const readableStream = Readable.from([buffer]);
    readableStream.pipe(uploadStream);
  });
}

export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { imageUrls } = await request.json();

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json({ error: 'No image URLs provided' }, { status: 400 });
    }

    console.log(`[Stitch] Processing ${imageUrls.length} images for user ${userId}`);
    
    // Create the panorama
    const panoramaBuffer = await createPanorama(imageUrls);
    
    // Upload to Cloudinary
    const timestamp = Date.now();
    const filename = `panorama_${userId.slice(0, 8)}_${timestamp}`;
    const panoramaUrl = await uploadToCloudinary(panoramaBuffer, filename);
    
    console.log('[Stitch] Panorama URL:', panoramaUrl);

    return NextResponse.json({
      success: true,
      panoramaUrl,
    });
  } catch (error) {
    console.error('[POST /api/stitch] Error:', error);
    
    return NextResponse.json({ 
      error: error.message || 'Stitching process failed',
      details: error.stack 
    }, { status: 500 });
  }
}
