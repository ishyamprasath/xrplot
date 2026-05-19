import { NextResponse } from 'next/server';

// Folders API — returns an empty list for now.
// Extend this when folder management is added to the backend.
export async function GET() {
  return NextResponse.json([]);
}

export async function POST(req) {
  return NextResponse.json({ error: 'Folder creation not yet implemented' }, { status: 501 });
}
