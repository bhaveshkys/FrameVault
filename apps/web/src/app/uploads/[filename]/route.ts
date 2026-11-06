import { NextRequest } from 'next/server';
import { corsHeaders, handleCorsPreflight } from '@/lib/cors';
import fs from 'fs/promises';
import path from 'path';

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    if (!filename) {
      return new Response('Filename required', { status: 400, headers: corsHeaders });
    }

    // Sanitize to prevent path traversal
    const safeFilename = path.basename(filename);

    // Possible upload directories across dev and Docker environments
    const possiblePaths = [
      path.join(process.cwd(), 'public', 'uploads', safeFilename),
      path.join(process.cwd(), 'apps', 'web', 'public', 'uploads', safeFilename),
      path.join('/app', 'apps', 'web', 'public', 'uploads', safeFilename),
      path.join('/app', 'public', 'uploads', safeFilename),
    ];

    let fileBuffer: Buffer | null = null;
    for (const p of possiblePaths) {
      try {
        fileBuffer = await fs.readFile(p);
        if (fileBuffer) break;
      } catch {
        // Try next candidate
      }
    }

    if (!fileBuffer) {
      return new Response('Image not found on disk', { status: 404, headers: corsHeaders });
    }

    let contentType = 'image/png';
    const ext = path.extname(safeFilename).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg') {
      contentType = 'image/jpeg';
    } else if (ext === '.webp') {
      contentType = 'image/webp';
    } else if (ext === '.gif') {
      contentType = 'image/gif';
    } else if (ext === '.svg') {
      contentType = 'image/svg+xml';
    }

    // Convert Buffer to ArrayBuffer for standard Web Response
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    ) as ArrayBuffer;

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err: any) {
    return new Response(err.message || 'Error loading image', {
      status: 500,
      headers: corsHeaders,
    });
  }
}
