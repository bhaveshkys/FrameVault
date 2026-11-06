import { NextRequest, NextResponse } from 'next/server';
import { uploadScreenshot } from '@/lib/storage';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // Handle JSON Base64 upload (from direct clipboard paste)
    if (contentType.includes('application/json')) {
      const { image_base64, filename } = await req.json();
      if (!image_base64) {
        return NextResponse.json({ error: 'image_base64 field is required' }, { status: 400 });
      }

      // Format: data:image/png;base64,iVBOR...
      const match = image_base64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (!match) {
        return NextResponse.json(
          { error: 'Invalid Base64 data URL format. Expected data:image/...;base64,...' },
          { status: 400 }
        );
      }

      const mimeType = match[1];
      const base64Data = match[2];
      const buffer = Buffer.from(base64Data, 'base64');

      const result = await uploadScreenshot(buffer, mimeType, filename || 'screenshot.png');
      return NextResponse.json({ success: true, ...result });
    }

    // Handle FormData upload (drag and drop or file input)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No file provided in form data' }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mimeType = file.type || 'image/png';

      const result = await uploadScreenshot(buffer, mimeType, file.name);
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json(
      { error: 'Unsupported Content-Type. Expected multipart/form-data or application/json' },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Screenshot upload failed' },
      { status: 500 }
    );
  }
}
