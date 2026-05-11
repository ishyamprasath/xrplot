import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { uploadImage } from '@/lib/cloudinary';
import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { imageUrls } = await request.json();

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json({ error: 'No image URLs provided' }, { status: 400 });
    }

    console.log(`[Stitch] Processing ${imageUrls.length} images with Gemini AI for user ${userId}`);

    const imageParts = [];
    for (const url of imageUrls) {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        imageParts.push({ inlineData: { data: base64, mimeType: 'image/jpeg' } });
      } catch (e) {
        console.warn('[Stitch] Failed to fetch image:', url);
      }
    }

    if (imageParts.length === 0) {
      return NextResponse.json({ error: 'Failed to retrieve images for stitching' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-image-preview' });

    const prompt = `You are a professional image generation and panorama stitching engine. Using the provided photos of a physical space, generate a seamless, incredibly photorealistic equirectangular 360-degree panorama that perfectly blends these scenes together. Ensure the lighting, perspectives, and geometry connect flawlessly to create a 360 degree looping space suitable for VR.`;

    const result = await model.generateContent([prompt, ...imageParts]);

    if (!result || !result.response || !result.response.candidates || result.response.candidates.length === 0) {
      throw new Error("AI model returned an empty response. Stitching failed.");
    }

    const parts = result.response.candidates[0].content.parts;

    const imagePart = parts.find(p => p.inlineData && p.inlineData.mimeType.startsWith('image/'));

    let panoramaBuffer;
    if (imagePart) {
      panoramaBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
    } else {
      const text = parts[0].text;
      const base64Match = text && typeof text === 'string' ? text.match(/[A-Za-z0-9+/=]{1000,}/) : null;
      if (base64Match) {
        panoramaBuffer = Buffer.from(base64Match[0], 'base64');
      } else {
        throw new Error("The AI model did not generate a valid seamless panorama image. Please ensure sufficient image overlap and try again.");
      }
    }

    const finalBuffer = await sharp(panoramaBuffer)
      .resize(4096, 2048, { fit: 'cover' })
      .jpeg({ quality: 90 })
      .toBuffer();

    const timestamp = Date.now();
    const uploadResult = await uploadImage(
      finalBuffer,
      `xrplot/panoramas`
    );

    console.log('[Stitch] Panorama URL:', uploadResult.url);

    return NextResponse.json({
      success: true,
      panoramaUrl: uploadResult.url,
    });
  } catch (error) {
    console.error('[POST /api/stitch] Error:', error);
    return NextResponse.json({
      error: error.message || 'Stitching process failed',
      details: error.stack,
    }, { status: 500 });
  }
}
