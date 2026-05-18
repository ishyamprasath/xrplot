import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { functionMap } from '@/lib/agent';

export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { toolName, args } = body;

    const fn = functionMap[toolName];
    if (!fn) {
      return NextResponse.json({ error: `Tool ${toolName} not found` }, { status: 404 });
    }

    console.log(`[Tool Execution] User: ${userId}, Tool: ${toolName}, Args:`, args);

    const result = await fn({ ...args, userId });

    return NextResponse.json(result);
  } catch (error) {
    console.error(`[Tool Execution Error] ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
