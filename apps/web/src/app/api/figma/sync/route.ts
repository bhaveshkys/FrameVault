import { NextRequest } from 'next/server';
import { updateFigmaSyncRecord, validateApiToken } from '@/lib/db';
import { handleCorsPreflight, jsonWithCors } from '@/lib/cors';
import { z } from 'zod';

const SyncSchema = z.object({
  reference_id: z.string().min(1, 'reference_id is required'),
  category_id: z.string().min(1, 'category_id is required'),
  figma_file_key: z.string().optional().nullable(),
  figma_node_id: z.string().min(1, 'figma_node_id is required'),
  status: z.enum(['pending', 'synced', 'failed']),
  last_error: z.string().optional().nullable(),
});

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return jsonWithCors(
        { error: 'Missing Authorization header. Expected Bearer <token>' },
        { status: 401 }
      );
    }

    const isValid = await validateApiToken(authHeader);
    if (!isValid) {
      return jsonWithCors(
        { error: 'Invalid or revoked FrameVault API token' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = SyncSchema.safeParse(body);

    if (!parsed.success) {
      return jsonWithCors(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await updateFigmaSyncRecord(parsed.data);

    return jsonWithCors({
      success: true,
      data: parsed.data,
      message: `Synchronized reference ${parsed.data.reference_id} for category ${parsed.data.category_id}`,
    });
  } catch (error: any) {
    return jsonWithCors(
      { error: error.message || 'Failed to update Figma sync status' },
      { status: 500 }
    );
  }
}
