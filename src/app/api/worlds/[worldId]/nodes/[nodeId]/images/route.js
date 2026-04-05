import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import World from '@/models/World';
import { uploadImage, deleteImage } from '@/lib/cloudinary';

export async function POST(request, { params }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { worldId, nodeId } = await params;
    const formData = await request.formData();
    const files = formData.getAll('images');

    if (files.length < 6 || files.length > 20) {
      return NextResponse.json(
        { error: 'Please upload between 6 and 20 images' },
        { status: 400 }
      );
    }

    await connectDB();
    const world = await World.findOne({ _id: worldId, userId });
    if (!world) return NextResponse.json({ error: 'World not found' }, { status: 404 });

    const node = world.nodes.find(n => String(n.id) === String(nodeId));
    if (!node) {
      console.warn('Node not found:', { lookingFor: nodeId, nodesInDb: world.nodes.map(n => n.id), userId, worldId });
      return NextResponse.json({ error: 'Node not found. Node may have been modified or not yet saved.' }, { status: 404 });
    }

    // Upload all images to Cloudinary
    const uploadResults = [];
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const result = await uploadImage(buffer, `xrplot/${worldId}/${nodeId}`);
      uploadResults.push({
        url: result.url,
        publicId: result.publicId,
        classification: '',
      });
    }

    // Update node
    node.images = uploadResults;
    node.status = 'uploaded';
    await world.save();

    return NextResponse.json({ images: uploadResults, status: 'uploaded' });
  } catch (error) {
    console.error('POST node images error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { worldId, nodeId } = await params;
    const { publicId } = await request.json();

    await connectDB();
    const world = await World.findOne({ _id: worldId, userId });
    if (!world) return NextResponse.json({ error: 'World not found' }, { status: 404 });

    const node = world.nodes.find(n => String(n.id) === String(nodeId));
    if (!node) {
      return NextResponse.json({ error: 'Node not found. Node may have been modified or not yet saved.' }, { status: 404 });
    }

    // Remove from Cloudinary
    await deleteImage(publicId);

    // Remove from node
    node.images = node.images.filter(img => img.publicId !== publicId);
    if (node.images.length === 0) node.status = 'empty';
    await world.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE node image error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
