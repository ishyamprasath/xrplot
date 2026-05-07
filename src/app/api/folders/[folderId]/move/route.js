import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Folder from '@/models/Folder';

export async function POST(request, { params }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { folderId } = await params;
    const { targetFolderId } = await request.json();
    
    await connectDB();

    // Prevent moving folder into itself or its own subfolders (optional but good)
    if (folderId === targetFolderId) {
      return NextResponse.json({ error: 'Cannot move folder into itself' }, { status: 400 });
    }

    const folder = await Folder.findOneAndUpdate(
      { _id: folderId, userId },
      { parentId: targetFolderId || null },
      { new: true }
    );

    if (!folder) return NextResponse.json({ error: 'Folder not found' }, { status: 404 });

    return NextResponse.json(folder);
  } catch (error) {
    console.error('POST /api/folders/[folderId]/move error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
