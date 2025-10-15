import { NextRequest, NextResponse } from 'next/server'
import { MinIOService } from '@/lib/storage/minio'
import { authenticateToken, rateLimit } from '@/lib/auth/middleware'

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 100, 60)
    if (rateLimitResult) return rateLimitResult

    // Authenticate user
    const authResult = await authenticateToken(request)
    if (authResult) return authResult

    const user = (request as any).user
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get user's files
    const files = await MinIOService.listUserFiles(user.id, limit, offset)
    
    // Get storage stats
    const stats = await MinIOService.getUserStorageStats(user.id)

    return NextResponse.json({
      files,
      stats,
      total: files.length,
      limit,
      offset
    })
  } catch (error) {
    console.error('Error fetching files:', error)
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting (stricter for uploads)
    const rateLimitResult = await rateLimit(request, 10, 60)
    if (rateLimitResult) return rateLimitResult

    // Authenticate user
    const authResult = await authenticateToken(request)
    if (authResult) return authResult

    const user = (request as any).user
    const formData = await request.formData()
    const file = formData.get('file') as File
    const isPublic = formData.get('isPublic') === 'true'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Check file size (max 50MB)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Upload file
    const result = await MinIOService.uploadFile(
      user.id,
      file.name,
      buffer,
      file.type,
      isPublic
    )

    return NextResponse.json({
      file: result.file,
      url: result.url,
      message: 'File uploaded successfully'
    })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}