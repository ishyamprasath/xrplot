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
    const newFiles = formData.getAll('images');
    const keepPublicIdsRaw = formData.get('keepPublicIds');
    const keepPublicIds = keepPublicIdsRaw ? JSON.parse(keepPublicIdsRaw) : [];
    const directionsRaw = formData.get('directions');
    const directions = directionsRaw ? JSON.parse(directionsRaw) : {};

    await connectDB();
    const world = await World.findOne({ _id: worldId, userId });
    if (!world) return NextResponse.json({ error: 'World not found' }, { status: 404 });

    const node = world.nodes.find(n => String(n.id) === String(nodeId));
    if (!node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    // Filter existing images to keep
    const existingToKeep = (node.images || []).filter(img => keepPublicIds.includes(img.publicId));

    if (existingToKeep.length + newFiles.length > 25) {
      return NextResponse.json(
        { error: 'Maximum 25 images allowed (5 per direction)' },
        { status: 400 }
      );
    }

    // Upload new images to Cloudinary
    const uploadResults = [...existingToKeep];
    
    const directionList = Array.isArray(directions) ? directions : null;

    for (let fileIndex = 0; fileIndex < newFiles.length; fileIndex++) {
      const file = newFiles[fileIndex];
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const result = await uploadImage(buffer, `xrplot/${worldId}/${nodeId}`);
      
      // Get direction for this specific file if available
      const direction = directionList?.[fileIndex] || directions[file.name] || '';

      uploadResults.push({
        url: result.url,
        publicId: result.publicId,
        classification: direction,
      });
    }

    if (uploadResults.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
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

