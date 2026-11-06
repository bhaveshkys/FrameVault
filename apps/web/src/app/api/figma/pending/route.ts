import { NextRequest, NextResponse } from 'next/server';
import { getFigmaPendingItems, validateApiToken } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Missing Authorization header. Expected Bearer <token>' },
        { status: 401 }
      );
    }

    const isValid = await validateApiToken(authHeader);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid or revoked FrameVault API token' },
        { status: 403 }
      );
    }

    const pending = await getFigmaPendingItems();
    return NextResponse.json({
      success: true,
      count: pending.length,
      items: pending,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pending Figma references' },
      { status: 500 }
    );
  }
}
