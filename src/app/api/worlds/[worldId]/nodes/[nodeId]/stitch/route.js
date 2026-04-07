import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import World from '@/models/World';
import { uploadImage } from '@/lib/cloudinary';
import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request, { params }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { worldId, nodeId } = await params;

    await connectDB();
    const world = await World.findOne({ _id: worldId, userId });
    if (!world) return NextResponse.json({ error: 'World not found' }, { status: 404 });

    const node = world.nodes.find(n => String(n.id) === String(nodeId));
    if (!node) return NextResponse.json({ error: 'Node not found' }, { status: 404 });

    if (!node.images || node.images.length === 0) {
      return NextResponse.json({ error: 'No images to stitch' }, { status: 400 });
    }

    node.status = 'stitching';
    await world.save();

    try {
      // 1. Fetch images and convert to base64 for Gemini (NanoBanana) Image Model
      const imageParts = [];
      for (const img of node.images) {
        try {
          const response = await fetch(img.url);
          const arrayBuffer = await response.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          imageParts.push({ inlineData: { data: base64, mimeType: 'image/jpeg' } });
        } catch (e) {
          console.warn('Failed to fetch image:', img.url);
        }
      }

      if (imageParts.length === 0) {
        return NextResponse.json({ error: 'Failed to retrieve images for stitching' }, { status: 400 });
      }

      // 2. Generate 360 Panorama using Gemini 3.1 Flash Image Preview (NanoBanana)
      const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-image-preview' });
      
      const prompt = `You are a professional image generation and panorama stitching engine. Using the provided photos of a physical space, generate a seamless, incredibly photorealistic equirectangular 360-degree panorama that perfectly blends these scenes together. Ensure the lighting, perspectives, and geometry connect flawlessly to create a 360 degree looping space suitable for VR.`;

      const result = await model.generateContent([prompt, ...imageParts]);
      
      if (!result || !result.response || !result.response.candidates || result.response.candidates.length === 0) {
        throw new Error("AI model returned an empty response. Stitching failed.");
      }

      const parts = result.response.candidates[0].content.parts;
      
      // Look for the generated image output from the multimodal model
      const imagePart = parts.find(p => p.inlineData && p.inlineData.mimeType.startsWith('image/'));
      
      let panoramaBuffer;
      if (imagePart) {
        panoramaBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
      } else {
        // If the API returned base64 directly inside text unexpectedly
        const text = parts[0].text;
        const base64Match = text && typeof text === 'string' ? text.match(/[A-Za-z0-9+/=]{1000,}/) : null;
        if (base64Match) {
            panoramaBuffer = Buffer.from(base64Match[0], 'base64');
        } else {
            throw new Error("The AI model did not generate a valid seamless panorama image. Please ensure sufficient image overlap and try again.");
        }
      }

      // 3. Ensure proper dimensions and format using Sharp
      const finalBuffer = await sharp(panoramaBuffer)
        .resize(4096, 2048, { fit: 'cover' })
        .jpeg({ quality: 90 })
        .toBuffer();

      // 4. Upload finished masterpiece to Cloudinary
      const uploadResult = await uploadImage(
        finalBuffer,
        `xrplot/${worldId}/panoramas`
      );

      // Update node data
      node.panoramaUrl = uploadResult.url;
      node.panoramaPublicId = uploadResult.publicId;
      node.status = 'ready';
      await world.save();

      return NextResponse.json({
        panoramaUrl: uploadResult.url,
        status: 'ready',
      });

    } catch (stitchError) {
      node.status = 'error';
      await world.save();
      throw stitchError;
    }

  } catch (error) {
    console.error('POST stitch error:', error);
    return NextResponse.json({ error: 'Stitching failed: ' + error.message }, { status: 500 });
  }
}
