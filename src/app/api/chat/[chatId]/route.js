import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Chat from '@/models/Chat';

export async function GET(request, { params }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { chatId } = await params;
    await connectDB();

    const chat = await Chat.findOne({ _id: chatId, clerkUserId: userId }).lean();
    if (!chat) return NextResponse.json({ error: 'Chat not found' }, { status: 404 });

    return NextResponse.json(chat);
  } catch (error) {
    console.error('GET /api/chat/[chatId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { chatId } = await params;
    await connectDB();

    const chat = await Chat.findOneAndDelete({ _id: chatId, clerkUserId: userId });
    if (!chat) return NextResponse.json({ error: 'Chat not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/chat/[chatId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
