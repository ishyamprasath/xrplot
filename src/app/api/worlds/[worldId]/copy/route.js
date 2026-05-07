import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import World from '@/models/World';

export async function POST(request, { params }) {
  try {
    const { userId } = await auth();
    const { worldId } = params;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { folderId } = body;

    await connectDB();
    const sourceWorld = await World.findOne({ _id: worldId, userId }).lean();
    if (!sourceWorld) return NextResponse.json({ error: 'World not found' }, { status: 404 });

    // Create a deep copy by removing the _id and setting new details
    const { _id, createdAt, updatedAt, ...copyData } = sourceWorld;
    
    const worldCopy = await World.create({
      ...copyData,
      name: `${sourceWorld.name} (Copy)`,
      folderId: folderId || sourceWorld.folderId,
      userId,
    });

    return NextResponse.json(worldCopy, { status: 201 });
  } catch (error) {
    console.error('POST /api/worlds/[worldId]/copy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
