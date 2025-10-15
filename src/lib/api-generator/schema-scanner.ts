import { db } from '@/lib/db'
import { DatabaseTable } from '@prisma/client'

export interface ColumnDefinition {
  name: string
  type: string
  nullable: boolean
  primary_key?: boolean
  unique?: boolean
  foreign_key?: string
  default?: string
}

export interface TableSchema {
  name: string
  columns: ColumnDefinition[]
  indexes: string[]
  constraints: string[]
}

export interface GeneratedEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string
  description: string
  parameters?: ParameterDefinition[]
  body?: BodyDefinition
  responses: ResponseDefinition[]
}

export interface ParameterDefinition {
  name: string
  type: string
  required: boolean
  description: string
  location: 'query' | 'path' | 'header'
}

export interface BodyDefinition {
  type: string
  required: boolean
  properties: Record<string, any>
}

export interface ResponseDefinition {
  statusCode: number
  description: string
  schema?: any
}

export class SchemaScanner {
  static async scanProjectTables(projectId: string): Promise<TableSchema[]> {
    try {
      const tables = await db.databaseTable.findMany({
        where: { projectId },
        orderBy: { name: 'asc' }
      })

      return tables.map(table => this.parseTableSchema(table))
    } catch (error) {
      console.error('Error scanning project tables:', error)
      return []
    }
  }

  static parseTableSchema(table: DatabaseTable): TableSchema {
    const schema = table.schema as any
    const columns: ColumnDefinition[] = []
    const indexes: string[] = []
    const constraints: string[] = []

    // Parse columns
    if (schema.columns && Array.isArray(schema.columns)) {
      for (const column of schema.columns) {
        columns.push({
          name: column.name,
          type: column.type,
          nullable: column.nullable || false,
          primary_key: column.primary_key || false,
          unique: column.unique || false,
          foreign_key: column.foreign_key,
          default: column.default
        })
      }
    }

    // Generate standard indexes and constraints
    const primaryKeys = columns.filter(col => col.primary_key).map(col => col.name)
    if (primaryKeys.length > 0) {
      constraints.push(`PRIMARY KEY (${primaryKeys.join(', ')})`)
    }

    const uniqueColumns = columns.filter(col => col.unique).map(col => col.name)
    for (const colName of uniqueColumns) {
      constraints.push(`UNIQUE (${colName})`)
      indexes.push(`idx_${table.name}_${colName}`)
    }

    return {
      name: table.name,
      columns,
      indexes,
      constraints
    }
  }

  static generateEndpoints(tableSchema: TableSchema): GeneratedEndpoint[] {
    const tableName = tableSchema.name
    const endpoints: GeneratedEndpoint[] = []

    // GET /api/db/{tableName} - List all records
    endpoints.push({
      method: 'GET',
      path: `/api/db/${tableName}`,
      description: `List all ${tableName} records`,
      parameters: [
        {
          name: 'limit',
          type: 'number',
          required: false,
          description: 'Number of records to return',
          location: 'query'
        },
        {
          name: 'offset',
          type: 'number',
          required: false,
          description: 'Number of records to skip',
          location: 'query'
        },
        {
          name: 'order',
          type: 'string',
          required: false,
          description: 'Sort order (e.g., "createdAt:desc")',
          location: 'query'
        }
      ],
      responses: [
        {
          statusCode: 200,
          description: `List of ${tableName} records`,
          schema: {
            type: 'object',
            properties: {
              data: { type: 'array', items: { $ref: `#/components/schemas/${tableName}` } },
              total: { type: 'number' },
              limit: { type: 'number' },
              offset: { type: 'number' }
            }
          }
        }
      ]
    })

    // POST /api/db/{tableName} - Create new record
    endpoints.push({
      method: 'POST',
      path: `/api/db/${tableName}`,
      description: `Create a new ${tableName} record`,
      body: {
        type: 'object',
        required: true,
        properties: this.generateRequestBodyProperties(tableSchema)
      },
      responses: [
        {
          statusCode: 201,
          description: `${tableName} record created successfully`,
          schema: { $ref: `#/components/schemas/${tableName}` }
        },
        {
          statusCode: 400,
          description: 'Invalid request body'
        }
      ]
    })

    // GET /api/db/{tableName}/{id} - Get specific record
    endpoints.push({
      method: 'GET',
      path: `/api/db/${tableName}/{id}`,
      description: `Get a specific ${tableName} record`,
      parameters: [
        {
          name: 'id',
          type: 'string',
          required: true,
          description: 'Record ID',
          location: 'path'
        }
      ],
      responses: [
        {
          statusCode: 200,
          description: `${tableName} record details`,
          schema: { $ref: `#/components/schemas/${tableName}` }
        },
        {
          statusCode: 404,
          description: 'Record not found'
        }
      ]
    })

    // PUT /api/db/{tableName}/{id} - Update record
    endpoints.push({
      method: 'PUT',
      path: `/api/db/${tableName}/{id}`,
      description: `Update a ${tableName} record`,
      parameters: [
        {
          name: 'id',
          type: 'string',
          required: true,
          description: 'Record ID',
          location: 'path'
        }
      ],
      body: {
        type: 'object',
        required: true,
        properties: this.generateRequestBodyProperties(tableSchema, true)
      },
      responses: [
        {
          statusCode: 200,
          description: `${tableName} record updated successfully`,
          schema: { $ref: `#/components/schemas/${tableName}` }
        },
        {
          statusCode: 404,
          description: 'Record not found'
        }
      ]
    })

    // DELETE /api/db/{tableName}/{id} - Delete record
    endpoints.push({
      method: 'DELETE',
      path: `/api/db/${tableName}/{id}`,
      description: `Delete a ${tableName} record`,
      parameters: [
        {
          name: 'id',
          type: 'string',
          required: true,
          description: 'Record ID',
          location: 'path'
        }
      ],
      responses: [
        {
          statusCode: 204,
          description: `${tableName} record deleted successfully`
        },
        {
          statusCode: 404,
          description: 'Record not found'
        }
      ]
    })

    return endpoints
  }

  private static generateRequestBodyProperties(tableSchema: TableSchema, update: boolean = false): Record<string, any> {
    const properties: Record<string, any> = {}

    for (const column of tableSchema.columns) {
      // Skip primary key for updates, include for creates
      if (update && column.primary_key) continue

      // Skip auto-generated timestamps
      if (column.name === 'createdAt' || column.name === 'updatedAt') continue

      const property: any = {
        type: this.mapPrismaTypeToJSONType(column.type)
      }

      if (!column.nullable && !update) {
        property.required = true
      }

      properties[column.name] = property
    }

    return properties
  }

  private static mapPrismaTypeToJSONType(prismaType: string): string {
    const typeMap: Record<string, string> = {
      'String': 'string',
      'Int': 'integer',
      'BigInt': 'integer',
      'Float': 'number',
      'Decimal': 'number',
      'Boolean': 'boolean',
      'DateTime': 'string',
      'Json': 'object',
      'Bytes': 'string',
      'varchar': 'string',
      'text': 'string',
      'int': 'integer',
      'bigint': 'integer',
      'decimal': 'number',
      'numeric': 'number',
      'real': 'number',
      'double precision': 'number',
      'boolean': 'boolean',
      'timestamp': 'string',
      'timestamptz': 'string',
      'date': 'string',
      'time': 'string',
      'uuid': 'string',
      'json': 'object',
      'jsonb': 'object'
    }

    return typeMap[prismaType.toLowerCase()] || 'string'
  }

  static generateOpenAPISpec(tableSchemas: TableSchema[]): any {
    const paths: any = {}
    const components: any = {
      schemas: {}
    }

    // Generate schemas and paths for each table
    for (const tableSchema of tableSchemas) {
      // Generate OpenAPI schema for the table
      components.schemas[tableSchema.name] = {
        type: 'object',
        properties: this.generateSchemaProperties(tableSchema)
      }

      // Generate endpoints
      const endpoints = this.generateEndpoints(tableSchema)
      for (const endpoint of endpoints) {
        const pathKey = endpoint.path.replace(/\{([^}]+)\}/g, '{$1}')
        
        if (!paths[pathKey]) {
          paths[pathKey] = {}
        }

        paths[pathKey][endpoint.method.toLowerCase()] = {
          summary: endpoint.description,
          description: endpoint.description,
          parameters: endpoint.parameters || [],
          responses: this.generateOpenAPIResponses(endpoint.responses)
        }

        if (endpoint.body) {
          paths[pathKey][endpoint.method.toLowerCase()].requestBody = {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: endpoint.body.properties
                }
              }
            }
          }
        }
      }
    }

    return {
      openapi: '3.0.0',
      info: {
        title: 'CoreBase Auto-Generated API',
        version: '1.0.0',
        description: 'Automatically generated REST API endpoints for your database tables'
      },
      paths,
      components
    }
  }

  private static generateSchemaProperties(tableSchema: TableSchema): Record<string, any> {
    const properties: Record<string, any> = {}

    for (const column of tableSchema.columns) {
      properties[column.name] = {
        type: this.mapPrismaTypeToJSONType(column.type),
        nullable: column.nullable
      }

      if (column.primary_key) {
        properties[column.name].description = 'Primary key'
      }

      if (column.unique) {
        properties[column.name].description = (properties[column.name].description || '') + ' (Unique)'
      }
    }

    return properties
  }

  private static generateOpenAPIResponses(responses: ResponseDefinition[]): Record<string, any> {
    const openapiResponses: Record<string, any> = {}

    for (const response of responses) {
      openapiResponses[response.statusCode.toString()] = {
        description: response.description
      }

      if (response.schema) {
        openapiResponses[response.statusCode.toString()].content = {
          'application/json': {
            schema: response.schema
          }
        }
      }
    }

    return openapiResponses
  }
}