import { NextRequest, NextResponse } from 'next/server';
import { retryFigmaSync } from '@/lib/db';
import { z } from 'zod';

const RetrySchema = z.object({
  reference_id: z.string().min(1),
  category_id: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RetrySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid reference or category ID' }, { status: 400 });
    }

    await retryFigmaSync(parsed.data.reference_id, parsed.data.category_id);

    return NextResponse.json({
      success: true,
      message: 'Status reset to pending for Figma sync',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to retry sync' },
      { status: 500 }
    );
  }
}
