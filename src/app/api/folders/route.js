import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Folder from '@/models/Folder';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const folders = await Folder.find({ userId }).sort({ updatedAt: -1 }).lean();
    
    return NextResponse.json(folders);
  } catch (error) {
    console.error('GET /api/folders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (!body.name) return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
    
    await connectDB();
    const folder = await Folder.create({
      userId,
      name: body.name,
      description: body.description || '',
      parentId: body.parentId || null,
    });

    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    console.error('POST /api/folders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
