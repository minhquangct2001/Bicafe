"use client"

import * as React from "react"
import { generateClient } from "aws-amplify/data"
import { getCurrentUser } from "aws-amplify/auth"
import { type Schema } from "@/amplify/data/resource"
import { AppSidebar } from '@/components/app-sidebar'
import { ProtectedRoute } from '@/components/protected-route'
import { SiteHeader } from '@/components/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RevenueChart } from "@/components/revenue-chart"
import { toast } from "sonner"

const client = generateClient<Schema>()

interface RevenueData {
  date: string
  revenue: number
  orderCount: number
  averageOrderValue: number
}

interface SummaryStats {
  totalRevenue: number
  totalOrders: number
  averageOrderValue: number
  growthRate: number
}

const Page = () => {
  const [loading, setLoading] = React.useState(true)
  const [revenueData, setRevenueData] = React.useState<RevenueData[]>([])
  const [summaryStats, setSummaryStats] = React.useState<SummaryStats>({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    growthRate: 0
  })
  const [user, setUser] = React.useState<{ userId: string } | null>(null)

  // Check authentication
  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser()
        setUser(currentUser)
      } catch (error) {
        console.log("No authenticated user", error)
        setUser(null)
      }
    }
    checkAuth()
  }, [])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price)
  }

  const fetchRevenueData = React.useCallback(async () => {
    try {
      setLoading(true)

      console.log("Fetching daily sales...")
      const { data: dailySales, errors } = await client.models.DailySales.list()

      if (errors && errors.length > 0) {
        console.error("Error fetching daily sales:", errors)
        toast.error(`Failed to fetch revenue data: ${errors[0]?.message || 'Unknown error'}`)
        return
      }

      console.log("Daily sales data:", dailySales)

      if (dailySales && dailySales.length > 0) {
        // Transform data for chart
        const chartData: RevenueData[] = dailySales
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .map(sale => ({
            date: sale.date,
            revenue: sale.totalRevenue,
            orderCount: sale.orderCount,
            averageOrderValue: sale.averageOrderValue
          }))

        setRevenueData(chartData)

        // Calculate summary stats
        const totalRevenue = dailySales.reduce((sum, sale) => sum + sale.totalRevenue, 0)
        const totalOrders = dailySales.reduce((sum, sale) => sum + sale.orderCount, 0)
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

        // Calculate growth rate (comparing last 7 days with previous 7 days)
        const sortedSales = [...dailySales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        const last7Days = sortedSales.slice(0, 7).reduce((sum, sale) => sum + sale.totalRevenue, 0)
        const previous7Days = sortedSales.slice(7, 14).reduce((sum, sale) => sum + sale.totalRevenue, 0)
        const growthRate = previous7Days > 0 ? ((last7Days - previous7Days) / previous7Days) * 100 : 0

        setSummaryStats({
          totalRevenue,
          totalOrders,
          averageOrderValue,
          growthRate
        })
      } else {
        console.log("No daily sales data found")
        setRevenueData([])
        setSummaryStats({
          totalRevenue: 0,
          totalOrders: 0,
          averageOrderValue: 0,
          growthRate: 0
        })
      }
    } catch (error) {
      console.error("Exception during fetch:", error)
      toast.error("Failed to fetch revenue data. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  const generateSampleData = React.useCallback(async () => {
    try {
      const today = new Date()
      const promises = []
      
      // Generate 30 days of sample data
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        
        const revenue = Math.random() * 2000000 + 500000 // 500k to 2.5M VND
        const orders = Math.floor(Math.random() * 50) + 10 // 10-60 orders
        const averageOrderValue = revenue / orders
        
        promises.push(
          client.models.DailySales.create({
            date: date.toISOString().split('T')[0],
            totalRevenue: revenue,
            orderCount: orders,
            averageOrderValue: averageOrderValue,
          })
        )
      }
      
      await Promise.all(promises)
      toast.success("Sample data generated successfully!")
      await fetchRevenueData()
    } catch (error) {
      console.error("Error generating sample data:", error)
      toast.error("Failed to generate sample data")
    }
  }, [fetchRevenueData])

  const calculateRevenueFromOrders = React.useCallback(async () => {
    try {
      // Fetch all completed orders
      const { data: orders, errors } = await client.models.Order.list({
        filter: { status: { eq: "DONE" } }
      })

      if (errors && errors.length > 0) {
        console.error("Error fetching orders:", errors)
        return
      }

      if (!orders || orders.length === 0) {
        console.log("No completed orders found")
        toast.info("No completed orders found to calculate revenue from")
        return
      }

      // Group orders by date
      const dailyData: { [key: string]: { revenue: number; orders: number } } = {}
      
      orders.forEach(order => {
        const date = order.createdAt ? order.createdAt.split('T')[0] : new Date().toISOString().split('T')[0] // Get date part only
        
        if (!dailyData[date]) {
          dailyData[date] = { revenue: 0, orders: 0 }
        }
        
        dailyData[date].revenue += order.totalAmount
        dailyData[date].orders += 1
      })

      // Create or update DailySales records
      const promises = Object.entries(dailyData).map(async ([date, data]) => {
        const averageOrderValue = data.revenue / data.orders
        
        // Check if record already exists
        const { data: existingSales } = await client.models.DailySales.list({
          filter: { date: { eq: date } }
        })

        if (existingSales && existingSales.length > 0) {
          // Update existing record
          return client.models.DailySales.update({
            id: existingSales[0].id,
            totalRevenue: data.revenue,
            orderCount: data.orders,
            averageOrderValue: averageOrderValue,
          })
        } else {
          // Create new record
          return client.models.DailySales.create({
            date: date,
            totalRevenue: data.revenue,
            orderCount: data.orders,
            averageOrderValue: averageOrderValue,
          })
        }
      })

      await Promise.all(promises)
      toast.success("Revenue data calculated from orders!")
      await fetchRevenueData()
    } catch (error) {
      console.error("Error calculating revenue from orders:", error)
      toast.error("Failed to calculate revenue from orders")
    }
  }, [fetchRevenueData])

  React.useEffect(() => {
    if (user) {
      fetchRevenueData()
    }
  }, [user, fetchRevenueData])

  if (loading) {
    return (
      <ProtectedRoute>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <SiteHeader />
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
              <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min p-4">
                <div className="flex items-center justify-center h-64">
                  <div className="text-muted-foreground">Loading revenue data...</div>
                </div>
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min p-4">
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold">Revenue Analytics</h1>
                    <p className="text-muted-foreground">
                      Track your cafe&apos;s financial performance
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={calculateRevenueFromOrders}
                      disabled={loading}
                    >
                      Calculate from Orders
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={generateSampleData}
                      disabled={loading}
                    >
                      Generate Sample Data
                    </Button>
                    <Button onClick={fetchRevenueData} disabled={loading}>
                      Refresh
                    </Button>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Revenue
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatPrice(summaryStats.totalRevenue)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        All time revenue
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Orders
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {summaryStats.totalOrders.toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Completed orders
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Average Order Value
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatPrice(summaryStats.averageOrderValue)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Per order average
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Growth Rate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {summaryStats.growthRate > 0 ? '+' : ''}
                        {summaryStats.growthRate.toFixed(1)}%
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Last 7 days vs previous
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Revenue Chart */}
                <RevenueChart data={revenueData} />
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}

export default Page
