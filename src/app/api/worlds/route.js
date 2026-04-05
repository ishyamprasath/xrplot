import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import World from '@/models/World';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const worlds = await World.find({ userId }).sort({ updatedAt: -1 }).lean();
    
    return NextResponse.json(worlds);
  } catch (error) {
    console.error('GET /api/worlds error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    
    await connectDB();
    const world = await World.create({
      userId,
      name: body.name || 'Untitled World',
      description: body.description || '',
      nodes: [],
      edges: [],
    });

    return NextResponse.json(world, { status: 201 });
  } catch (error) {
    console.error('POST /api/worlds error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
