import { NextRequest, NextResponse } from 'next/server';
import { getCategories, createCategory } from '@/lib/db';
import { z } from 'zod';

const CategoryCreateSchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50),
  color: z.string().regex(/^#([0-9a-fA-F]{3}){1,2}$/, 'Valid hex color required').optional().nullable(),
});

export async function GET() {
  try {
    const categories = await getCategories();
    return NextResponse.json({ success: true, count: categories.length, categories });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CategoryCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const created = await createCategory(parsed.data.name, parsed.data.color);
    return NextResponse.json({ success: true, category: created }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create category' },
      { status: 500 }
    );
  }
}

