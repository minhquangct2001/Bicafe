"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

interface RevenueData {
  date: string
  revenue: number
  orderCount: number
  averageOrderValue: number
}

interface RevenueChartProps {
  data: RevenueData[]
}

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--primary))",
  },
  orderCount: {
    label: "Orders",
    color: "hsl(var(--secondary))",
  },
} satisfies ChartConfig

export function RevenueChart({ data }: RevenueChartProps) {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("30d")
  const [metric, setMetric] = React.useState<"revenue" | "orderCount">("revenue")

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  const filteredData = React.useMemo(() => {
    if (!data || data.length === 0) return []
    
    let daysToShow = 30
    if (timeRange === "7d") {
      daysToShow = 7
    } else if (timeRange === "14d") {
      daysToShow = 14
    }
    
    // Sort by date and take the last N days
    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    return sortedData.slice(-daysToShow)
  }, [data, timeRange])

  return (
    <Card className="@container/card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Revenue Analytics</CardTitle>
            <CardDescription>
              <span className="hidden @[540px]/card:block">
                {metric === "revenue" ? "Daily revenue" : "Daily order count"} over time
              </span>
              <span className="@[540px]/card:hidden">
                {metric === "revenue" ? "Revenue" : "Orders"} trends
              </span>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* Metric Toggle */}
            <ToggleGroup
              type="single"
              value={metric}
              onValueChange={(value) => value && setMetric(value as "revenue" | "orderCount")}
              variant="outline"
              className="hidden @[540px]/card:flex"
            >
              <ToggleGroupItem value="revenue">Revenue</ToggleGroupItem>
              <ToggleGroupItem value="orderCount">Orders</ToggleGroupItem>
            </ToggleGroup>
            
            {/* Time Range Toggle */}
            <ToggleGroup
              type="single"
              value={timeRange}
              onValueChange={setTimeRange}
              variant="outline"
              className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
            >
              <ToggleGroupItem value="30d">30 days</ToggleGroupItem>
              <ToggleGroupItem value="14d">14 days</ToggleGroupItem>
              <ToggleGroupItem value="7d">7 days</ToggleGroupItem>
            </ToggleGroup>
            
            {/* Mobile Select */}
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger
                className="flex w-32 @[767px]/card:hidden"
                size="sm"
                aria-label="Select time range"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="30d" className="rounded-lg">
                  30 days
                </SelectItem>
                <SelectItem value="14d" className="rounded-lg">
                  14 days
                </SelectItem>
                <SelectItem value="7d" className="rounded-lg">
                  7 days
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {filteredData.length === 0 ? (
          <div className="flex h-[250px] items-center justify-center text-muted-foreground">
            No revenue data available
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-revenue)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-revenue)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient id="fillOrderCount" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-orderCount)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-orderCount)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => {
                  if (metric === "revenue") {
                    return new Intl.NumberFormat('vi-VN', {
                      notation: 'compact',
                      compactDisplay: 'short',
                    }).format(value)
                  }
                  return value.toString()
                }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      return new Date(value).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    }}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey={metric}
                type="natural"
                fill={`url(#fill${metric === "revenue" ? "Revenue" : "OrderCount"})`}
                stroke={`var(--color-${metric})`}
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
