/**
 * Runtime Templates API
 * Provides available container templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { containerPoolManager } from '@/lib/runtime/container-pool';

// GET /api/runtime/v2/templates - List available templates
export async function GET(request: NextRequest) {
  try {
    const templates = containerPoolManager.getTemplates();
    const poolStatus = containerPoolManager.getPoolStatus();

    return NextResponse.json({
      success: true,
      data: {
        templates,
        poolStatus
      }
    });

  } catch (error) {
    console.error('Failed to get templates:', error);
    return NextResponse.json(
      { error: 'Failed to get templates' },
      { status: 500 }
    );
  }
}