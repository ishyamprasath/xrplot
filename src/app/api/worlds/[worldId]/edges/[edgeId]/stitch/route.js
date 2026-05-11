import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import World from '@/models/World';
import { uploadImage } from '@/lib/cloudinary';
import sharp from 'sharp';

export async function POST(request, { params }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { worldId, edgeId } = await params;

    await connectDB();
    const world = await World.findOne({ _id: worldId, userId });
    if (!world) return NextResponse.json({ error: 'World not found' }, { status: 404 });

    const edge = world.edges.find(e => e.id === edgeId);
    if (!edge) return NextResponse.json({ error: 'Edge not found' }, { status: 404 });

    if (!edge.transitionImages || edge.transitionImages.length === 0) {
      return NextResponse.json({ error: 'No images to stitch' }, { status: 400 });
    }

    // Composite transition images side by side
    const compositeOps = [];
    const imgCount = edge.transitionImages.length;
    const sliceWidth = Math.floor(4096 / imgCount);

    for (let i = 0; i < imgCount; i++) {
      const img = edge.transitionImages[i];
      try {
        const response = await fetch(img.url);
        const buffer = Buffer.from(await response.arrayBuffer());
        const resized = await sharp(buffer).resize(sliceWidth, 2048, { fit: 'cover' }).toBuffer();
        compositeOps.push({ input: resized, left: i * sliceWidth, top: 0 });
      } catch (e) {
        console.warn('Failed to process transition image:', e.message);
      }
    }

    if (compositeOps.length === 0) {
      return NextResponse.json({ error: 'No images could be processed' }, { status: 400 });
    }

    const panoramaBuffer = await sharp({
      create: { width: 4096, height: 2048, channels: 3, background: { r: 20, g: 20, b: 30 } }
    }).composite(compositeOps).jpeg({ quality: 85 }).toBuffer();

    const uploadResult = await uploadImage(panoramaBuffer, `xrplot/${worldId}/transitions`);

    edge.transitionPanorama = uploadResult.url;
    edge.status = 'ready';
    await world.save();

    return NextResponse.json({ transitionPanorama: uploadResult.url, status: 'ready' });
  } catch (error) {
    console.error('POST edge stitch error:', error);
    return NextResponse.json({ error: 'Stitching failed: ' + error.message }, { status: 500 });
  }
}
