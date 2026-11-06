import { NextRequest, NextResponse } from 'next/server';
import { getReferenceById, updateReference, deleteReference } from '@/lib/db';
import { z } from 'zod';

const UpdateReferenceSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  source_url: z.string().url().optional().or(z.literal('')).nullable(),
  notes: z.string().max(2000).optional().nullable(),
  is_favorite: z.boolean().optional(),
  category_ids: z.array(z.string()).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ref = await getReferenceById(id);

    if (!ref) {
      return NextResponse.json({ error: 'Reference not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, reference: ref });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reference' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = UpdateReferenceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await updateReference(id, parsed.data);
    return NextResponse.json({ success: true, reference: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update reference' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteReference(id);
    return NextResponse.json({ success: true, message: 'Reference deleted' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete reference' },
      { status: 500 }
    );
  }
}

