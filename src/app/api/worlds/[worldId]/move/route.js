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
    const world = await World.findOneAndUpdate(
      { _id: worldId, userId },
      { folderId: folderId || null },
      { new: true }
    );

    if (!world) return NextResponse.json({ error: 'World not found' }, { status: 404 });

    return NextResponse.json(world);
  } catch (error) {
    console.error('POST /api/worlds/[worldId]/move error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
