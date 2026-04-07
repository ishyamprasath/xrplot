import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import World from '@/models/World';

export async function POST(request, { params }) {
  const resolvedParams = await params;
  const { worldId, nodeId } = resolvedParams;

  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { targetIndex } = await request.json();

    await connectDB();
    const world = await World.findById(worldId);
    if (!world || world.userId !== userId) {
      return NextResponse.json({ error: 'World not found' }, { status: 404 });
    }

    const nodeIndex = world.nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex === -1) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    const node = world.nodes[nodeIndex];

    if (targetIndex === 'panorama') {
      if (!node.originalPanoramaUrl) {
        return NextResponse.json({ error: 'No original panorama to revert to' }, { status: 400 });
      }
      node.panoramaUrl = node.originalPanoramaUrl;
      node.panoramaPublicId = node.originalPanoramaPublicId;
      node.originalPanoramaUrl = '';
      node.originalPanoramaPublicId = '';
    } else {
      const idx = parseInt(targetIndex, 10);
      const img = node.images[idx];
      if (!img || !img.originalUrl) {
        return NextResponse.json({ error: 'No original image to revert to' }, { status: 400 });
      }
      img.url = img.originalUrl;
      img.publicId = img.originalPublicId;
      img.originalUrl = '';
      img.originalPublicId = '';
    }

    world.markModified('nodes');
    await world.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Revert error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
