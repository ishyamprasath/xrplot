import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Chat from '@/models/Chat';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const chats = await Chat.find({ clerkUserId: userId }).sort({ updatedAt: -1 }).lean();
    return NextResponse.json(chats);
  } catch (error) {
    console.error('GET /api/chat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    await connectDB();

    const chat = await Chat.create({
      clerkUserId: userId,
      title: body.title || 'New Chat',
      messages: body.messages || [],
    });

    return NextResponse.json(chat, { status: 201 });
  } catch (error) {
    console.error('POST /api/chat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
