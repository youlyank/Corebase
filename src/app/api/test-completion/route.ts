import { NextRequest, NextResponse } from 'next/server'
import { aiCompletionService } from '@/lib/ai/completion'

export async function GET() {
  try {
    const result = await aiCompletionService.getCompletions({
      filePath: 'test.js',
      language: 'javascript',
      position: { line: 0, column: 10 },
      prefix: 'console.',
      suffix: '',
      entireContent: 'console.'
    })

    return NextResponse.json({ 
      success: true, 
      completions: result.items.length,
      items: result.items,
      processingTime: result.processingTime
    })
  } catch (error) {
    console.error('Test completion failed:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}