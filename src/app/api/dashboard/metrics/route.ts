import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Simulate real-time metrics data
    const metrics = {
      databaseConnections: {
        value: 24,
        status: 'healthy',
        change: '+2',
        history: Array.from({ length: 24 }, (_, i) => ({
          time: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
          value: Math.floor(Math.random() * 10) + 20
        }))
      },
      activeUsers: {
        value: 1284,
        status: 'healthy',
        change: '+124',
        history: Array.from({ length: 24 }, (_, i) => ({
          time: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
          value: Math.floor(Math.random() * 200) + 1100
        }))
      },
      apiRequests: {
        value: '45.2K',
        status: 'healthy',
        change: '+12%',
        history: Array.from({ length: 24 }, (_, i) => ({
          time: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
          value: Math.floor(Math.random() * 10000) + 40000
        }))
      },
      storageUsed: {
        value: '2.4 GB',
        status: 'warning',
        change: '+0.3GB',
        history: Array.from({ length: 24 }, (_, i) => ({
          time: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
          value: Math.floor(Math.random() * 500) + 2000
        }))
      }
    }

    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}