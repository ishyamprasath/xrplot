import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Chat from '@/models/Chat';
import { runAgent } from '@/lib/agent';

export async function POST(request, { params }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { chatId } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    await connectDB();

    const chat = await Chat.findOne({ _id: chatId, clerkUserId: userId });
    if (!chat) return NextResponse.json({ error: 'Chat not found' }, { status: 404 });

    // Add user message
    chat.messages.push({
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    });

    // Update title on first user message if still default
    if (chat.title === 'New Chat' && chat.messages.length === 1) {
      chat.title = content.trim().slice(0, 40) + (content.trim().length > 40 ? '...' : '');
    }

    await chat.save();

    // Run agent with full conversation history
    const agentResult = await runAgent({
      userId,
      messages: chat.messages,
    });

    // Add agent response
    chat.messages.push({
      role: 'model',
      content: agentResult.text,
      timestamp: new Date(),
      toolCallId: agentResult.toolCallId || null,
      functionName: agentResult.functionName || null,
      functionArgs: agentResult.functionArgs || null,
      functionResponse: agentResult.functionResponse || null,
    });

    await chat.save();

    return NextResponse.json({
      message: chat.messages[chat.messages.length - 1],
      chat: { _id: chat._id, title: chat.title, updatedAt: chat.updatedAt },
    });
  } catch (error) {
    console.error('POST /api/chat/[chatId]/messages error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
