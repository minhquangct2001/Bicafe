"use client"

import * as React from "react"
import { generateClient } from 'aws-amplify/api'
import { type Schema } from '@/amplify/data/resource'
import { RevenueChart } from '@/components/revenue-chart'
import { AppSidebar } from '@/components/app-sidebar'
import { ProtectedRoute } from '@/components/protected-route'
import { SiteHeader } from '@/components/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { 
  IconTrendingUp, 
  IconTrendingDown, 
  IconCurrencyDollar, 

  IconShoppingCart, 
  IconChartBar,
  IconClock
} from '@tabler/icons-react'

const client = generateClient<Schema>()

interface RevenueData {
  date: string
  revenue: number
  orderCount: number
  averageOrderValue: number
}

const SELECTION_SET = [
  'id',
  'status',
  'createdAt',
  'totalAmount'
]

const RevenuePage = () => {
  const [revenueData, setRevenueData] = React.useState<RevenueData[]>([])
  const [loading, setLoading] = React.useState(true)

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(value)
  }

  const fetchRevenueData = React.useCallback(async () => {
    try {
      setLoading(true)
      
      // Fetch orders from last 90 days
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 90)
      
      const response = await client.models.Order.list({
        selectionSet: SELECTION_SET,
        filter: {
          and: [
            { status: { eq: 'DONE' } },
            { createdAt: { ge: startDate.toISOString() } }
          ]
        }
      })

      if (response.data) {
        const revenueByDate = new Map<string, { revenue: number, orders: number }>()
        
        response.data.forEach(order => {
          const date = new Date(order.createdAt || '').toISOString().split('T')[0] // YYYY-MM-DD format
          const current = revenueByDate.get(date) || { revenue: 0, orders: 0 }
          
          revenueByDate.set(date, {
            revenue: current.revenue + order.totalAmount,
            orders: current.orders + 1
          })
        })

        const chartData: RevenueData[] = []
        for (let i = 29; i >= 0; i--) {
          const date = new Date()
          date.setDate(date.getDate() - i)
          const dateStr = date.toISOString().split('T')[0]
          const dayData = revenueByDate.get(dateStr) || { revenue: 0, orders: 0 }
          
          chartData.push({
            date: date.toISOString(),
            revenue: dayData.revenue,
            orderCount: dayData.orders,
            averageOrderValue: dayData.orders > 0 ? dayData.revenue / dayData.orders : 0
          })
        }

        setRevenueData(chartData)
      }
    } catch (error) {
      console.error('Error fetching revenue data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Setup real-time subscription
  React.useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null

    const setupSubscription = async () => {
      try {
        subscription = client.models.Order.observeQuery({
          selectionSet: SELECTION_SET
        }).subscribe({
          next: () => {
            fetchRevenueData()
          },
          error: (error) => {
            console.error('Subscription error:', error)
          }
        })
      } catch (error) {
        console.error('Error setting up subscription:', error)
      }
    }

    fetchRevenueData()
    setupSubscription()

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [fetchRevenueData])

  // Calculate summary statistics
  const summaryStats = React.useMemo(() => {
    if (revenueData.length === 0) return null

    const totalRevenue = revenueData.reduce((sum, day) => sum + day.revenue, 0)
    const totalOrders = revenueData.reduce((sum, day) => sum + day.orderCount, 0)
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Calculate growth compared to previous period
    const half = Math.floor(revenueData.length / 2)
    const firstHalf = revenueData.slice(0, half)
    const secondHalf = revenueData.slice(half)
    
    const firstHalfRevenue = firstHalf.reduce((sum, day) => sum + day.revenue, 0)
    const secondHalfRevenue = secondHalf.reduce((sum, day) => sum + day.revenue, 0)
    
    const growthRate = firstHalfRevenue > 0 
      ? ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100 
      : 0

    // Find peak hour (simplified - would need hour-by-hour data for accuracy)
    const peakDay = revenueData.reduce((max, day) => 
      day.revenue > max.revenue ? day : max, revenueData[0])

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      growthRate,
      peakDay: new Date(peakDay.date).toLocaleDateString('vi-VN', { 
        weekday: 'long' 
      })
    }
  }, [revenueData])

  return (
    <ProtectedRoute requireAuth={true} allowedRoles={['ADMIN']}>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold">Revenue Analytics</h1>
                    <p className="text-muted-foreground">
                      Track daily revenue and order statistics with real-time updates
                    </p>
                  </div>
                </div>

                {/* Revenue Chart */}
                {loading ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Revenue Analytics</CardTitle>
                      <CardDescription>Loading revenue data...</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-[250px] w-full" />
                    </CardContent>
                  </Card>
                ) : (
                  <RevenueChart data={revenueData} />
                )}

                {/* Summary Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                          {loading ? (
                            <Skeleton className="h-8 w-20" />
                          ) : (
                            <p className="text-2xl font-bold text-green-600">
                              {summaryStats ? formatPrice(summaryStats.totalRevenue) : formatPrice(0)}
                            </p>
                          )}
                          <div className="flex items-center gap-1">
                            <Badge variant="secondary" className="text-xs">
                              <IconCurrencyDollar className="h-3 w-3 mr-1" />
                              Last 30 days
                            </Badge>
                          </div>
                        </div>
                        <div className="h-10 w-10 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                          <IconCurrencyDollar className="h-5 w-5 text-green-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                          {loading ? (
                            <Skeleton className="h-8 w-20" />
                          ) : (
                            <p className="text-2xl font-bold text-blue-600">
                              {summaryStats?.totalOrders.toLocaleString() || '0'}
                            </p>
                          )}
                          <div className="flex items-center gap-1">
                            <Badge variant="secondary" className="text-xs">
                              <IconShoppingCart className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          </div>
                        </div>
                        <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                          <IconShoppingCart className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>


                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}

export default RevenuePage
