import { NextRequest, NextResponse } from 'next/server'
import { aiCompletionService } from '@/lib/ai/completion'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { filePath, language, position, prefix, suffix, entireContent } = body

    if (!filePath || !language || !position || !entireContent) {
      return NextResponse.json({ 
        error: 'Missing required fields: filePath, language, position, entireContent' 
      }, { status: 400 })
    }

    const result = await aiCompletionService.getCompletions({
      filePath,
      language,
      position,
      prefix: prefix || '',
      suffix: suffix || '',
      entireContent
    })

    return NextResponse.json({
      items: result.items,
      processingTime: result.processingTime
    })
  } catch (error) {
    console.error('Completion API error:', error)
    return NextResponse.json({ 
      error: 'Failed to get completions',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}