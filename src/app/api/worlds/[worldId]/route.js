import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import World from '@/models/World';
import { deleteFolder } from '@/lib/cloudinary';

export async function GET(request, { params }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { worldId } = await params;
    await connectDB();
    const world = await World.findOne({ _id: worldId, userId }).lean();
    
    if (!world) return NextResponse.json({ error: 'World not found' }, { status: 404 });

    return NextResponse.json(world);
  } catch (error) {
    console.error('GET /api/worlds/[worldId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { worldId } = await params;
    const body = await request.json();
    
    await connectDB();
    const world = await World.findOneAndUpdate(
      { _id: worldId, userId },
      { 
        $set: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.description !== undefined && { description: body.description }),
          ...(body.nodes !== undefined && { nodes: body.nodes }),
          ...(body.edges !== undefined && { edges: body.edges }),
        }
      },
      { new: true }
    ).lean();
    
    if (!world) return NextResponse.json({ error: 'World not found' }, { status: 404 });

    return NextResponse.json(world);
  } catch (error) {
    console.error('PUT /api/worlds/[worldId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { worldId } = await params;
    
    await connectDB();
    const world = await World.findOneAndDelete({ _id: worldId, userId });
    
    if (!world) return NextResponse.json({ error: 'World not found' }, { status: 404 });

    // Cleanup Cloudinary images
    try {
      await deleteFolder(`xrplot/${worldId}`);
    } catch (e) {
      console.warn('Cloudinary cleanup failed:', e);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/worlds/[worldId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
