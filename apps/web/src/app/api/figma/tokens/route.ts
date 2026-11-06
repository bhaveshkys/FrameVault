import { NextRequest, NextResponse } from 'next/server';
import { getApiTokens, createApiToken } from '@/lib/db';
import { z } from 'zod';

const TokenCreateSchema = z.object({
  name: z.string().min(1).default('Figma Plugin Token'),
});

export async function GET() {
  try {
    const tokens = await getApiTokens();
    return NextResponse.json({ success: true, tokens });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = TokenCreateSchema.safeParse(body);
    const name = parsed.success ? parsed.data.name : 'Figma Plugin Token';

    const token = await createApiToken(name);
    return NextResponse.json({ success: true, token }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
