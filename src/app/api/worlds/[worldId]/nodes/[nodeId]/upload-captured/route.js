import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import World from '@/models/World';
import { uploadImage } from '@/lib/cloudinary';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request, { params }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { worldId, nodeId } = await params;

    await connectDB();
    const world = await World.findOne({ _id: worldId, userId });
    if (!world) return NextResponse.json({ error: 'World not found' }, { status: 404 });

    const node = world.nodes.find(n => n.id === nodeId);
    if (!node) return NextResponse.json({ error: 'Node not found' }, { status: 404 });

    const formData = await request.formData();
    const images = formData.getAll('images');
    const directions = formData.getAll('directions');

    if (images.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    // Update node status
    node.status = 'uploading';
    await world.save();

    // Upload images to Cloudinary with direction metadata
    const uploadedImages = [];
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const direction = directions[i] || 'unknown';
      
      try {
        const buffer = Buffer.from(await image.arrayBuffer());
        const uploadResult = await uploadImage(
          buffer,
          `xrplot/${worldId}/nodes/${nodeId}/captures`
        );
        
        uploadedImages.push({
          url: uploadResult.url,
          publicId: uploadResult.publicId,
          direction: direction,
          capturedAt: new Date().toISOString()
        });
      } catch (error) {
        console.error(`Failed to upload image ${i}:`, error);
      }
    }

    if (uploadedImages.length === 0) {
      node.status = 'error';
      await world.save();
      return NextResponse.json({ error: 'Failed to upload any images' }, { status: 500 });
    }

    // Update node with uploaded images
    node.images = uploadedImages;
    node.status = 'uploaded';
    await world.save();

    // Trigger analysis automatically
    try {
      const analyzeResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/worlds/${worldId}/nodes/${nodeId}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': request.headers.get('Authorization') || ''
        }
      });
      
      if (analyzeResponse.ok) {
        const analysisResult = await analyzeResponse.json();
        return NextResponse.json({
          success: true,
          images: uploadedImages,
          analysis: analysisResult
        });
      }
    } catch (analyzeError) {
      console.error('Auto-analysis failed:', analyzeError);
    }

    return NextResponse.json({
      success: true,
      images: uploadedImages,
      message: 'Photos uploaded successfully. You can now stitch them into a panorama.'
    });

  } catch (error) {
    console.error('Upload captured photos error:', error);
    
    // Reset node status on error
    try {
      await connectDB();
      const world = await World.findOne({ _id: worldId });
      const node = world?.nodes.find(n => n.id === nodeId);
      if (node) { 
        node.status = 'error'; 
        await world.save(); 
      }
    } catch (e) {}

    return NextResponse.json({ error: 'Upload failed: ' + error.message }, { status: 500 });
  }
}
