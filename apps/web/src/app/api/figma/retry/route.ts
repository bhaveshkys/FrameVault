import { NextRequest } from 'next/server';
import { retryFigmaSync } from '@/lib/db';
import { handleCorsPreflight, jsonWithCors } from '@/lib/cors';
import { z } from 'zod';

const RetrySchema = z.object({
  reference_id: z.string().min(1),
  category_id: z.string().min(1),
});

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RetrySchema.safeParse(body);

    if (!parsed.success) {
      return jsonWithCors({ error: 'Invalid reference or category ID' }, { status: 400 });
    }

    await retryFigmaSync(parsed.data.reference_id, parsed.data.category_id);

    return jsonWithCors({
      success: true,
      message: 'Status reset to pending for Figma sync',
    });
  } catch (error: any) {
    return jsonWithCors(
      { error: error.message || 'Failed to retry sync' },
      { status: 500 }
    );
  }
}
