import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { TableStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    // For demo purposes, we'll create a default project if none exists
    let defaultProject = null
    if (!projectId) {
      defaultProject = await db.project.findFirst({
        where: { name: 'Default Project' }
      })
      
      if (!defaultProject) {
        // Create a default user and project for demo
        const defaultUser = await db.user.findFirst()
        if (!defaultUser) {
          const newUser = await db.user.create({
            data: {
              email: 'admin@corebase.dev',
              name: 'CoreBase Admin',
              role: 'ADMIN'
            }
          })
          defaultProject = await db.project.create({
            data: {
              name: 'Default Project',
              description: 'Default project for CoreBase demo',
              ownerId: newUser.id
            }
          })
        } else {
          defaultProject = await db.project.create({
            data: {
              name: 'Default Project',
              description: 'Default project for CoreBase demo',
              ownerId: defaultUser.id
            }
          })
        }
      }
    }

    const targetProjectId = projectId || defaultProject?.id

    if (!targetProjectId) {
      return NextResponse.json(
        { error: 'No project available' },
        { status: 404 }
      )
    }

    // Fetch tables from database
    const tables = await db.databaseTable.findMany({
      where: {
        projectId: targetProjectId
      },
      include: {
        project: {
          select: {
            name: true,
            owner: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // If no tables exist, create some default ones for demo
    if (tables.length === 0) {
      const defaultTables = [
        {
          name: 'users',
          schema: {
            columns: [
              { name: 'id', type: 'uuid', nullable: false, primary_key: true },
              { name: 'email', type: 'varchar', nullable: false, unique: true },
              { name: 'name', type: 'varchar', nullable: true },
              { name: 'created_at', type: 'timestamp', nullable: false, default: 'now()' },
              { name: 'updated_at', type: 'timestamp', nullable: false, default: 'now()' }
            ]
          },
          rowCount: 0,
          size: BigInt(0)
        },
        {
          name: 'posts',
          schema: {
            columns: [
              { name: 'id', type: 'uuid', nullable: false, primary_key: true },
              { name: 'user_id', type: 'uuid', nullable: false, foreign_key: 'users.id' },
              { name: 'title', type: 'varchar', nullable: false },
              { name: 'content', type: 'text', nullable: true },
              { name: 'published', type: 'boolean', nullable: false, default: 'false' },
              { name: 'created_at', type: 'timestamp', nullable: false, default: 'now()' },
              { name: 'updated_at', type: 'timestamp', nullable: false, default: 'now()' }
            ]
          },
          rowCount: 0,
          size: BigInt(0)
        },
        {
          name: 'comments',
          schema: {
            columns: [
              { name: 'id', type: 'uuid', nullable: false, primary_key: true },
              { name: 'post_id', type: 'uuid', nullable: false, foreign_key: 'posts.id' },
              { name: 'user_id', type: 'uuid', nullable: false, foreign_key: 'users.id' },
              { name: 'content', type: 'text', nullable: false },
              { name: 'created_at', type: 'timestamp', nullable: false, default: 'now()' }
            ]
          },
          rowCount: 0,
          size: BigInt(0)
        },
        {
          name: 'files',
          schema: {
            columns: [
              { name: 'id', type: 'uuid', nullable: false, primary_key: true },
              { name: 'user_id', type: 'uuid', nullable: false, foreign_key: 'users.id' },
              { name: 'name', type: 'varchar', nullable: false },
              { name: 'path', type: 'varchar', nullable: false },
              { name: 'size', type: 'bigint', nullable: false },
              { name: 'mime_type', type: 'varchar', nullable: true },
              { name: 'created_at', type: 'timestamp', nullable: false, default: 'now()' }
            ]
          },
          rowCount: 0,
          size: BigInt(0)
        }
      ]

      for (const tableData of defaultTables) {
        await db.databaseTable.create({
          data: {
            ...tableData,
            projectId: targetProjectId,
            status: TableStatus.ACTIVE
          }
        })
      }

      // Fetch the created tables
      const createdTables = await db.databaseTable.findMany({
        where: {
          projectId: targetProjectId
        },
        include: {
          project: {
            select: {
              name: true,
              owner: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      })

      // Transform to match expected format
      const transformedTables = createdTables.map(table => ({
        id: table.id,
        name: table.name,
        rows: table.rowCount,
        size: formatBytes(Number(table.size)),
        status: table.status.toLowerCase(),
        schema: table.schema as any,
        project: table.project
      }))

      return NextResponse.json({ tables: transformedTables })
    }

    // Transform existing tables to match expected format
    const transformedTables = tables.map(table => ({
      id: table.id,
      name: table.name,
      rows: table.rowCount,
      size: formatBytes(Number(table.size)),
      status: table.status.toLowerCase(),
      schema: table.schema as any,
      project: table.project
    }))

    return NextResponse.json({ tables: transformedTables })
  } catch (error) {
    console.error('Error fetching database tables:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tables' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, columns, projectId } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Table name is required' },
        { status: 400 }
      )
    }

    // Get or create default project
    let targetProjectId = projectId
    if (!targetProjectId) {
      const defaultProject = await db.project.findFirst({
        where: { name: 'Default Project' }
      })
      
      if (!defaultProject) {
        const defaultUser = await db.user.findFirst()
        if (!defaultUser) {
          return NextResponse.json(
            { error: 'No user available to create project' },
            { status: 400 }
          )
        }
        
        const newProject = await db.project.create({
          data: {
            name: 'Default Project',
            description: 'Default project for CoreBase demo',
            ownerId: defaultUser.id
          }
        })
        targetProjectId = newProject.id
      } else {
        targetProjectId = defaultProject.id
      }
    }

    // Check if table already exists in this project
    const existingTable = await db.databaseTable.findFirst({
      where: {
        name,
        projectId: targetProjectId
      }
    })

    if (existingTable) {
      return NextResponse.json(
        { error: 'Table with this name already exists in the project' },
        { status: 409 }
      )
    }

    // Create new table
    const newTable = await db.databaseTable.create({
      data: {
        name,
        projectId: targetProjectId,
        schema: {
          columns: columns || [
            { name: 'id', type: 'uuid', nullable: false, primary_key: true },
            { name: 'created_at', type: 'timestamp', nullable: false, default: 'now()' }
          ]
        },
        status: TableStatus.ACTIVE
      },
      include: {
        project: {
          select: {
            name: true,
            owner: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    // Transform to match expected format
    const transformedTable = {
      id: newTable.id,
      name: newTable.name,
      rows: newTable.rowCount,
      size: formatBytes(Number(newTable.size)),
      status: newTable.status.toLowerCase(),
      schema: newTable.schema as any,
      project: newTable.project
    }

    return NextResponse.json({ 
      table: transformedTable, 
      message: 'Table created successfully' 
    })
  } catch (error) {
    console.error('Error creating table:', error)
    return NextResponse.json(
      { error: 'Failed to create table' },
      { status: 500 }
    )
  }
}

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}