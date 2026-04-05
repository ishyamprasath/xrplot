import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import World from '@/models/World';
import { uploadImage } from '@/lib/cloudinary';

export async function POST(request, { params }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { worldId, edgeId } = await params;
    const formData = await request.formData();
    const files = formData.getAll('images');

    if (files.length < 1 || files.length > 4) {
      return NextResponse.json(
        { error: 'Please upload between 1 and 4 images' },
        { status: 400 }
      );
    }

    await connectDB();
    const world = await World.findOne({ _id: worldId, userId });
    if (!world) return NextResponse.json({ error: 'World not found' }, { status: 404 });

    const edge = world.edges.find(e => e.id === edgeId);
    if (!edge) return NextResponse.json({ error: 'Edge not found' }, { status: 404 });

    // Upload all images to Cloudinary
    const uploadResults = [];
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const result = await uploadImage(buffer, `xrplot/${worldId}/edges/${edgeId}`);
      uploadResults.push({
        url: result.url,
        publicId: result.publicId,
      });
    }

    // Update edge
    edge.transitionImages = uploadResults;
    edge.status = 'uploaded';
    await world.save();

    return NextResponse.json({ images: uploadResults, status: 'uploaded' });
  } catch (error) {
    console.error('POST edge images error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
