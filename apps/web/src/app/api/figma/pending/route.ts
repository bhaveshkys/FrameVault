import { NextRequest } from 'next/server';
import { getFigmaPendingItems, validateApiToken } from '@/lib/db';
import { handleCorsPreflight, jsonWithCors } from '@/lib/cors';

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(req: NextRequest) {
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

    const pending = await getFigmaPendingItems();
    return jsonWithCors({
      success: true,
      count: pending.length,
      items: pending,
    });
  } catch (error: any) {
    return jsonWithCors(
      { error: error.message || 'Failed to fetch pending Figma references' },
      { status: 500 }
    );
  }
}
