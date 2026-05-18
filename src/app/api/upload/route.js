import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { uploadImage } from '@/lib/cloudinary';

// App Router segment config — sets max function duration to 30s for uploads
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { image } = await request.json(); // base64 string (no prefix)
    
    if (!image) {
      return NextResponse.json({ error: 'No image data provided' }, { status: 400 });
    }

    // Convert base64 to Buffer
    const buffer = Buffer.from(image, 'base64');
    
    // Upload to Cloudinary
    const result = await uploadImage(buffer, `tours/${userId}`);

    return NextResponse.json({ 
      url: result.url,
      publicId: result.publicId 
    });
  } catch (error) {
    console.error('[POST /api/upload] Error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
