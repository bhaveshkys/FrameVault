import { NextRequest, NextResponse } from 'next/server';
import { getReferences, createReference } from '@/lib/db';
import { z } from 'zod';

const CreateReferenceSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  source_url: z.string().url('Invalid URL').optional().or(z.literal('')).nullable(),
  image_path: z.string().min(1, 'Screenshot image is required'),
  notes: z.string().max(2000).optional().nullable(),
  category_ids: z.array(z.string()).min(1, 'Please select at least one category'),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q') || undefined;
    const categoryIds = searchParams.get('categories')?.split(',').filter(Boolean);
    const favoriteOnly = searchParams.get('favorite') === 'true';
    const figmaStatus = searchParams.get('figmaStatus') || undefined;
    const sortBy = (searchParams.get('sort') || 'recent') as any;

    const references = await getReferences({
      search,
      categoryIds,
      favoriteOnly,
      figmaStatus,
      sortBy,
    });

    return NextResponse.json({ success: true, count: references.length, references });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch references' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateReferenceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const created = await createReference({
      title: parsed.data.title,
      source_url: parsed.data.source_url || null,
      image_path: parsed.data.image_path,
      notes: parsed.data.notes || null,
      category_ids: parsed.data.category_ids,
    });

    return NextResponse.json({ success: true, reference: created }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create reference' },
      { status: 500 }
    );
  }
}
