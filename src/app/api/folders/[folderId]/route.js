import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Folder from '@/models/Folder';
import World from '@/models/World';

export async function GET(request, { params }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { folderId } = await params;
    await connectDB();
    const folder = await Folder.findOne({ _id: folderId, userId }).lean();
    
    if (!folder) return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    
    return NextResponse.json(folder);
  } catch (error) {
    console.error('GET /api/folders/[folderId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { folderId } = await params;
    const body = await request.json();
    
    await connectDB();
    const folder = await Folder.findOneAndUpdate(
      { _id: folderId, userId },
      { 
        name: body.name,
        description: body.description,
        parentId: body.parentId
      },
      { new: true }
    );

    if (!folder) return NextResponse.json({ error: 'Folder not found' }, { status: 404 });

    return NextResponse.json(folder);
  } catch (error) {
    console.error('PUT /api/folders/[folderId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { folderId } = await params;
    await connectDB();
    
    // Check if folder exists and belongs to user
    const folder = await Folder.findOne({ _id: folderId, userId });
    if (!folder) return NextResponse.json({ error: 'Folder not found' }, { status: 404 });

    // Option 1: Delete everything inside (subfolders and worlds)
    // Option 2: Move items to root
    // We'll go with Option 2 for safety, or Option 1 if requested.
    // Given the request "manage your wished one", let's just delete the folder 
    // and move its contents to its parent or root.
    
    const targetParentId = folder.parentId || null;
    
    // Move subfolders to parent
    await Folder.updateMany({ parentId: folderId, userId }, { parentId: targetParentId });
    
    // Move worlds to parent
    await World.updateMany({ folderId, userId }, { folderId: targetParentId });
    
    await Folder.deleteOne({ _id: folderId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/folders/[folderId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
