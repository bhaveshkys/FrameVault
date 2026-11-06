import { createServerSupabaseClient } from './supabase/server';
import { createAdminClient } from './supabase/admin';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB limit

export interface UploadResult {
  path: string;
  url: string;
}

export async function uploadScreenshot(
  fileBuffer: Buffer,
  mimeType: string,
  originalFilename?: string
): Promise<UploadResult> {
  if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
    throw new Error(
      `Unsupported file type "${mimeType}". Please upload a PNG, JPG, JPEG, or WebP screenshot.`
    );
  }

  if (fileBuffer.byteLength > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds 20MB limit (${(fileBuffer.byteLength / (1024 * 1024)).toFixed(1)}MB).`);
  }

  const extension = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
  const filename = `${randomUUID()}.${extension}`;

  const adminClient = createAdminClient();
  const supabase = adminClient || (await createServerSupabaseClient());

  // If Supabase is configured, upload to Supabase Storage
  if (supabase) {
    try {
      const { data, error } = await supabase.storage
        .from('framevault-references')
        .upload(`references/${filename}`, fileBuffer, {
          contentType: mimeType,
          cacheControl: '31536000',
          upsert: false,
        });

      if (error) {
        console.warn('Supabase storage upload error, falling back to local storage:', error.message);
      } else {
        const { data: publicUrlData } = supabase.storage
          .from('framevault-references')
          .getPublicUrl(data.path);

        return {
          path: data.path,
          url: publicUrlData.publicUrl,
        };
      }
    } catch (err) {
      console.warn('Failed to upload to Supabase bucket, falling back to local disk:', err);
    }
  }

  // Local filesystem fallback: write to public/uploads
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, filename);
  await fs.writeFile(filePath, fileBuffer);

  return {
    path: `uploads/${filename}`,
    url: `/uploads/${filename}`,
  };
}
