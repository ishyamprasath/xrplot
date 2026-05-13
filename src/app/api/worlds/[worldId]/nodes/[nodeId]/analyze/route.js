import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import World from '@/models/World';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export async function POST(request, { params }) {
  const resolvedParams = await params;
  const { worldId, nodeId } = resolvedParams;

  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const world = await World.findOne({ _id: worldId, userId });
    if (!world) return NextResponse.json({ error: 'World not found' }, { status: 404 });

    const node = world.nodes.find(n => String(n.id) === String(nodeId));
    if (!node) return NextResponse.json({ error: 'Node not found' }, { status: 404 });

    if (!node.images || node.images.length === 0) {
      return NextResponse.json({ error: 'No images to analyze' }, { status: 400 });
    }

    node.status = 'analyzing';
    await world.save();

    // Fetch all images and convert to base64 for Gemini
    const imageParts = [];
    for (const img of node.images) {
      try {
        const response = await fetch(img.url);
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = 'image/jpeg';
        imageParts.push({
          inlineData: { data: base64, mimeType },
        });
      } catch (e) {
        console.warn('Failed to fetch image:', img.url);
      }
    }

    // Send to OpenRouter API
    const prompt = `You are analyzing photos of a physical space (room, street, outdoor area, etc.) to create a 360° panorama.

For each image (numbered 1 to ${imageParts.length}), classify its viewing direction:
- "front" - the main/primary view
- "back" - opposite of front
- "left" - left side when facing front
- "right" - right side when facing front  
- "ceiling" or "sky" - looking up
- "floor" or "ground" - looking down
- "corner-XX" - if it shows a corner between two directions

Also assess the overall coverage:
- Are all major directions covered?
- What directions are missing?
- Quality assessment for panorama stitching

Respond ONLY in this exact JSON format:
{
  "classifications": [
    { "index": 0, "direction": "front", "confidence": 0.9, "description": "Main room view showing TV and sofa" },
    ...
  ],
  "coverage": {
    "score": 85,
    "covered": ["front", "back", "left", "right"],
    "missing": ["ceiling", "floor"],
    "suggestions": ["Take a photo looking straight up at the ceiling", "Take a photo looking down at the floor"]
  },
  "qualityNotes": "Good overlap between images. Lighting is consistent."
}`;

    const messages = [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          ...imageParts.map(img => ({
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${img.inlineData.data}` }
          }))
        ]
      }
    ];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "XRPlot"
      },
      body: JSON.stringify({
        model: "openrouter/auto",
        messages: messages,
        max_tokens: 2048,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response
    let analysis;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
         analysis = JSON.parse(jsonMatch[0]);
      } else {
         throw new Error("Invalid format");
      }
    } catch (e) {
      analysis = { 
        classifications: node.images.map((_, i) => ({ index: i, direction: 'unknown', confidence: 0.5 })),
        coverage: { score: 50, covered: [], missing: [], suggestions: ['Could not fully analyze images'] },
        qualityNotes: responseText
      };
    }

    // Update image classifications
    if (analysis.classifications && Array.isArray(node.images)) {
      const VALID_DIRECTIONS = ['up', 'down', 'left', 'right', 'middle'];
      for (const cls of analysis.classifications) {
        if (node.images[cls.index]) {
          const currentCls = node.images[cls.index].classification?.toLowerCase();
          // Only overwrite if it's not already a valid specific direction set by the user
          if (!VALID_DIRECTIONS.includes(currentCls)) {
            node.images[cls.index].classification = cls.direction;
          }
        }
      }
      world.markModified('nodes');
    }

    node.status = 'uploaded'; // Ready for stitching
    await world.save();

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('POST analyze error:', error);

    // Reset status on error
    try {
      await connectDB();
      const world = await World.findOne({ _id: worldId });
      const node = world?.nodes.find(n => n.id === nodeId);
      if (node) { node.status = 'uploaded'; await world.save(); }
    } catch (e) {}

    return NextResponse.json({ error: 'Analysis failed: ' + error.message }, { status: 500 });
  }
}
