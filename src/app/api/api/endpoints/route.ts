import { NextRequest, NextResponse } from 'next/server'
import { SchemaScanner } from '@/lib/api-generator/schema-scanner'
import { authenticateToken } from '@/lib/auth/middleware'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateToken(request)
    if (authResult) return authResult

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // Scan project tables
    const tableSchemas = await SchemaScanner.scanProjectTables(projectId)

    // Generate endpoints for all tables
    const allEndpoints = []
    for (const tableSchema of tableSchemas) {
      const endpoints = SchemaScanner.generateEndpoints(tableSchema)
      allEndpoints.push({
        table: tableSchema.name,
        endpoints
      })
    }

    // Generate OpenAPI spec
    const openAPISpec = SchemaScanner.generateOpenAPISpec(tableSchemas)

    return NextResponse.json({
      endpoints: allEndpoints,
      openapi: openAPISpec,
      tables: tableSchemas.map(schema => ({
        name: schema.name,
        columns: schema.columns.length,
        indexes: schema.indexes.length,
        constraints: schema.constraints.length
      })),
      generatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching API endpoints:', error)
    return NextResponse.json(
      { error: 'Failed to fetch endpoints' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    if (action === 'regenerate') {
      // Simulate SDK regeneration
      return NextResponse.json({
        message: 'API endpoints regenerated successfully',
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error regenerating endpoints:', error)
    return NextResponse.json(
      { error: 'Failed to regenerate endpoints' },
      { status: 500 }
    )
  }
}