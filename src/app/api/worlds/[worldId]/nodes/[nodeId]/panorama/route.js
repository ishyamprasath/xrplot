import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import World from '@/models/World';
import { uploadImage } from '@/lib/cloudinary';
import sharp from 'sharp';

export async function POST(request, { params }) {
  try {
    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height) {
      return NextResponse.json({ error: 'Invalid panorama image' }, { status: 400 });
    }

    const aspectRatio = metadata.width / metadata.height;
    if (aspectRatio < 1.8 || aspectRatio > 2.2) {
      return NextResponse.json({
        error: 'Direct 360 upload requires an equirectangular panorama close to a 2:1 aspect ratio. Use guided upload for normal room photos.',
      }, { status: 400 });
    }

    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { worldId, nodeId } = await params;
    const formData = await request.formData();
    const image = formData.get('image');

    if (!image) {
      return NextResponse.json({ error: 'No panorama image provided' }, { status: 400 });
    }

    await connectDB();
    const world = await World.findOne({ _id: worldId, userId });
    if (!world) return NextResponse.json({ error: 'World not found' }, { status: 404 });

    const node = world.nodes.find(n => String(n.id) === String(nodeId));
    if (!node) return NextResponse.json({ error: 'Node not found' }, { status: 404 });

    const buffer = Buffer.from(await image.arrayBuffer());
    const uploadResult = await uploadImage(buffer, `xrplot/${worldId}/nodes/${nodeId}/panoramas`);

    if (!node.originalPanoramaUrl && node.panoramaUrl) {
      node.originalPanoramaUrl = node.panoramaUrl;
      node.originalPanoramaPublicId = node.panoramaPublicId;
    }

    node.panoramaUrl = uploadResult.url;
    node.panoramaPublicId = uploadResult.publicId;
    node.status = 'ready';
    await world.save();

    return NextResponse.json({
      success: true,
      panoramaUrl: uploadResult.url,
      panoramaPublicId: uploadResult.publicId,
      status: 'ready',
    });
  } catch (error) {
    console.error('Node panorama upload error:', error);
    return NextResponse.json({ error: 'Panorama upload failed: ' + error.message }, { status: 500 });
  }
}