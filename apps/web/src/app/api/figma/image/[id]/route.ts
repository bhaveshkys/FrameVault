import { NextRequest, NextResponse } from 'next/server';
import { getReferenceById } from '@/lib/db';
import { corsHeaders, handleCorsPreflight } from '@/lib/cors';
import fs from 'fs/promises';
import path from 'path';

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ref = await getReferenceById(id);

    if (!ref || !ref.image_path) {
      return new NextResponse('Image not found', { status: 404, headers: corsHeaders });
    }

    let buffer: Buffer;
    let contentType = 'image/png';

    if (ref.image_path.startsWith('/uploads/') || ref.image_path.startsWith('uploads/')) {
      const cleanPath = ref.image_path.replace(/^\//, '');
      const fullPath = path.join(process.cwd(), 'public', cleanPath);
      buffer = await fs.readFile(fullPath);
      if (cleanPath.endsWith('.jpg') || cleanPath.endsWith('.jpeg')) {
        contentType = 'image/jpeg';
      } else if (cleanPath.endsWith('.webp')) {
        contentType = 'image/webp';
      }
    } else if (ref.image_path.startsWith('data:image/')) {
      const match = ref.image_path.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (match) {
        contentType = match[1];
        buffer = Buffer.from(match[2], 'base64');
      } else {
        return new NextResponse('Invalid data url', { status: 400, headers: corsHeaders });
      }
    } else {
      // Remote URL (e.g. Unsplash or Supabase Storage)
      const remoteRes = await fetch(ref.image_path);
      const arrayBuf = await remoteRes.arrayBuffer();
      buffer = Buffer.from(arrayBuf);
      contentType = remoteRes.headers.get('content-type') || 'image/jpeg';
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (err: any) {
    return new NextResponse(err.message || 'Error loading image', {
      status: 500,
      headers: corsHeaders,
    });
  }
}
