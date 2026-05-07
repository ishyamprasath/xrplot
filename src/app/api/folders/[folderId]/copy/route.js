import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Folder from '@/models/Folder';
import World from '@/models/World';

async function copyFolderRecursive(folderId, targetParentId, userId) {
  const originalFolder = await Folder.findOne({ _id: folderId, userId });
  if (!originalFolder) return null;

  // Create new folder
  const newFolder = await Folder.create({
    userId,
    name: `${originalFolder.name} (Copy)`,
    description: originalFolder.description,
    parentId: targetParentId || null,
  });

  // Copy worlds in this folder
  const worlds = await World.find({ folderId, userId });
  for (const world of worlds) {
    const worldObj = world.toObject();
    delete worldObj._id;
    delete worldObj.createdAt;
    delete worldObj.updatedAt;
    worldObj.name = `${worldObj.name} (Copy)`;
    worldObj.folderId = newFolder._id;
    await World.create(worldObj);
  }

  // Recursive copy subfolders
  const subfolders = await Folder.find({ parentId: folderId, userId });
  for (const subfolder of subfolders) {
    await copyFolderRecursive(subfolder._id, newFolder._id, userId);
  }

  return newFolder;
}

export async function POST(request, { params }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { folderId } = await params;
    const { targetFolderId } = await request.json();
    
    await connectDB();

    const newFolder = await copyFolderRecursive(folderId, targetFolderId, userId);

    if (!newFolder) return NextResponse.json({ error: 'Folder not found' }, { status: 404 });

    return NextResponse.json(newFolder);
  } catch (error) {
    console.error('POST /api/folders/[folderId]/copy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
