"use client"

import * as React from "react"
import { generateClient } from "aws-amplify/data"
import { type Schema } from "@/amplify/data/resource"
import { AppSidebar } from '@/components/app-sidebar'
import { ProtectedRoute } from '@/components/protected-route'
import { SiteHeader } from '@/components/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import Loading from '../product/loading'
import { useOrderSubscriptions } from "@/hooks/use-order-subscriptions"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  IconRefresh,
  IconEye,
  IconPhone,
  IconCheck,
  IconCircleCheckFilled,
  IconLoader
} from "@tabler/icons-react"
import { toast } from "sonner"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const client = generateClient<Schema>()

interface OrderWithItems {
  id: string
  orderNumber: string
  userId: string
  status: string | null
  totalAmount: number
  floor: string | null
  customerName: string | null
  customerPhone: string | null
  notes: string | null
  estimatedCompletionTime: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  orderItems?: Array<{
    id: string
    quantity: number
    unitPrice: number
    totalPrice: number
    customizations: string | null
    menuItem?: {
      id: string
      name: string
      description: string | null
      price: number
    } | null
  }>
}

function OrdersDataTable({ orders, onRefresh }: {
  orders: OrderWithItems[]
  onRefresh?: () => void
}) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState("")

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const columns: ColumnDef<OrderWithItems>[] = [
    {
      accessorKey: "orderNumber",
      header: "Order #",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("orderNumber")}</div>
      ),
    },
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }) => {
        const customerName = row.getValue("customerName") as string
        const customerPhone = row.original.customerPhone
        return (
          <div>
            <div className="font-medium">{customerName || "Guest"}</div>
            {customerPhone && (
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <IconPhone className="h-3 w-3" />
                {customerPhone}
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "floor",
      header: "Floor",
      cell: ({ row }) => {
        const floor = row.getValue("floor") as string
        return (
          <div>
            {floor ? (
              <Badge variant="outline">
                Floor: {floor}
              </Badge>
            ) : (
              <span className="text-muted-foreground text-sm">No floor specified</span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string

        return (
          <Badge variant="outline" className="text-muted-foreground px-1.5">
            {status === "DONE" ? (
              <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400 mr-1" />
            ) : (
              <IconLoader className="mr-1" />
            )}
            {status}
          </Badge>
        )
      },
    },
    {
      id: "items",
      header: "Items",
      accessorFn: (row) => {
        // Create searchable string from order items
        const itemNames = row.orderItems?.map(item =>
          `${item.menuItem?.name} ${item.customizations || ''}`.trim()
        ).join(' ') || ''
        return itemNames
      },
      cell: ({ row }) => {
        const order = row.original
        const orderItems = order.orderItems || []

        if (orderItems.length === 0) {
          return (
            <div className="text-sm text-muted-foreground italic">
              No items
            </div>
          )
        }

        return (
          <div className="max-w-48">
            {orderItems.slice(0, 3).map((item) => (
              <div key={item.id} className="text-sm">
                <span className="font-medium">
                  {item.quantity}x {item.menuItem?.name || 'Unknown item'}
                </span>
                {item.customizations && (
                  <div className="text-xs text-muted-foreground ml-2">
                    + {item.customizations}
                  </div>
                )}
              </div>
            ))}
            {orderItems.length > 3 && (
              <div className="text-xs text-muted-foreground mt-1">
                +{orderItems.length - 3} more items
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "notes",
      header: "Notes",
      cell: ({ row }) => {
        const notes = row.getValue("notes") as string
        return (
          <div className="max-w-32">
            {notes ? (
              <span className="text-sm text-muted-foreground">{notes}</span>
            ) : (
              <span className="text-xs text-muted-foreground italic">No notes</span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "totalAmount",
      header: "Total",
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("totalAmount"))
        return <div className="font-medium">{formatPrice(amount)}</div>
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as string
        return <div className="text-sm">{formatDate(date)}</div>
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const order = row.original

        const handleMarkDone = async () => {
          try {
            const { errors } = await client.models.Order.update({
              id: order.id,
              status: "DONE",
              completedAt: new Date().toISOString()
            })

            if (errors && errors.length > 0) {
              console.error("Error marking order as done:", errors)
              toast.error(`Failed to mark order as done: ${errors[0]?.message || 'Unknown error'}`)
              return
            }
            onRefresh?.()
          } catch (error) {
            console.error("Exception during mark as done:", error)
            toast.error("Failed to mark order as done. Please try again.")
          }
        }

        const handleMarkPending = async () => {
          try {
            const { errors } = await client.models.Order.update({
              id: order.id,
              status: "PENDING",
              completedAt: null
            })

            if (errors && errors.length > 0) {
              console.error("Error marking order as pending:", errors)
              toast.error(`Failed to mark order as pending: ${errors[0]?.message || 'Unknown error'}`)
              return
            }
            onRefresh?.()
          } catch (error) {
            console.error("Exception during mark as pending:", error)
            toast.error("Failed to mark order as pending. Please try again.")
          }
        }


        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <IconEye className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleMarkDone} disabled={order.status === "DONE"}>
                <IconCheck className="mr-2 h-4 w-4" />
                Mark as Done
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleMarkPending} disabled={order.status === "PENDING"}>
                <IconLoader className="mr-2 h-4 w-4" />
                Mark as Pending
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: orders,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
  })

  return (
    <div className="space-y-4">
      {/* Search and filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search orders or items..."
          value={globalFilter ?? ""}
          onChange={(event) => setGlobalFilter(String(event.target.value))}
          className="max-w-sm"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No orders found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

const Page = () => {
  const [orders, setOrders] = React.useState<OrderWithItems[]>([])
  const [loading, setLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL")

  // Optimized fetch orders data with a single GraphQL query
  const fetchData = React.useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true)
      } else {
        setLoading(true)
      }

      console.log("🚀 Fetching orders with OPTIMIZED single GraphQL query...")

      // Use selectionSet to fetch all related data in a single query
      const { data: ordersData, errors } = await client.models.Order.list({
        selectionSet: [
          'id',
          'orderNumber',
          'userId',
          'status',
          'totalAmount',
          'floor',
          'customerName',
          'customerPhone',
          'notes',
          'estimatedCompletionTime',
          'completedAt',
          'createdAt',
          'updatedAt',
          'orderItems.id',
          'orderItems.quantity',
          'orderItems.unitPrice',
          'orderItems.totalPrice',
          'orderItems.customizations',
          'orderItems.menuItem.id',
          'orderItems.menuItem.name',
          'orderItems.menuItem.description',
          'orderItems.menuItem.price',
        ]
      })

      console.log("✅ Single API call response:", { ordersData, errors })

      if (errors && errors.length > 0) {
        console.error("Error fetching orders:", errors)
        toast.error(`Failed to fetch orders: ${errors[0]?.message || 'Unknown error'}`)
        return
      }

      if (ordersData) {
        console.log(`📊 Found ${ordersData.length} orders with ALL related data in 1 API call!`)

        // Transform the response to match our interface
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ordersWithItems: OrderWithItems[] = ordersData.map((order: any) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          userId: order.userId,
          status: order.status || null,
          totalAmount: order.totalAmount,
          floor: order.floor || null,
          customerName: order.customerName || null,
          customerPhone: order.customerPhone || null,
          notes: order.notes || null,
          estimatedCompletionTime: order.estimatedCompletionTime || null,
          completedAt: order.completedAt || null,
          createdAt: order.createdAt || new Date().toISOString(),
          updatedAt: order.updatedAt || new Date().toISOString(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          orderItems: (order.orderItems || []).map((orderItem: any) => ({
            id: orderItem.id,
            quantity: orderItem.quantity,
            unitPrice: orderItem.unitPrice,
            totalPrice: orderItem.totalPrice,
            customizations: orderItem.customizations || null,
            menuItem: orderItem.menuItem ? {
              id: orderItem.menuItem.id,
              name: orderItem.menuItem.name,
              description: orderItem.menuItem.description || null,
              price: orderItem.menuItem.price,
            } : null
          }))
        }))

        // Sort by creation date (newest first)
        ordersWithItems.sort((a, b) =>
          new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
        )

        setOrders(ordersWithItems)
        console.log(`🎯 SUCCESS: Loaded ${ordersWithItems.length} orders with 1 API call (vs previous 10+ calls)`)
      }
    } catch (error) {
      console.error("Exception during optimized data fetch:", error)
      toast.error("Failed to fetch orders. Please try again.")
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  // Optimized refresh function for manual refresh
  const handleRefresh = React.useCallback(() => {
    fetchData(true)
  }, [fetchData])

  // Real-time subscription handlers - Optimized to avoid unnecessary API calls
  const handleOrderCreated = React.useCallback(async (newOrder: Schema["Order"]["type"]) => {
    console.log("Real-time: New order created", newOrder)

    try {
      // Fetch the complete order data with items
      console.log("🔄 Fetching complete order data for new order:", newOrder.id)

      const { data: ordersData, errors } = await client.models.Order.list({
        filter: { id: { eq: newOrder.id } },
        selectionSet: [
          'id',
          'orderNumber',
          'userId',
          'status',
          'totalAmount',
          'floor',
          'customerName',
          'customerPhone',
          'notes',
          'estimatedCompletionTime',
          'completedAt',
          'createdAt',
          'updatedAt',
          'orderItems.id',
          'orderItems.quantity',
          'orderItems.unitPrice',
          'orderItems.totalPrice',
          'orderItems.customizations',
          'orderItems.menuItem.id',
          'orderItems.menuItem.name',
          'orderItems.menuItem.description',
          'orderItems.menuItem.price',
        ]
      })

      if (errors && errors.length > 0) {
        console.error("Error fetching complete order data:", errors)
        // Fallback to minimal order if fetch fails
        setOrders(prevOrders => {
          const exists = prevOrders.some(order => order.id === newOrder.id)
          if (exists) return prevOrders

          const minimalOrder: OrderWithItems = {
            id: newOrder.id,
            orderNumber: newOrder.orderNumber,
            userId: newOrder.userId,
            status: newOrder.status || null,
            totalAmount: newOrder.totalAmount,
            floor: newOrder.floor || null,
            customerName: newOrder.customerName || null,
            customerPhone: newOrder.customerPhone || null,
            notes: newOrder.notes || null,
            estimatedCompletionTime: newOrder.estimatedCompletionTime || null,
            completedAt: newOrder.completedAt || null,
            createdAt: newOrder.createdAt || new Date().toISOString(),
            updatedAt: newOrder.updatedAt || new Date().toISOString(),
            orderItems: []
          }

          return [minimalOrder, ...prevOrders]
        })
        return
      }

      if (ordersData && ordersData.length > 0) {
        const completeOrderData = ordersData[0]
        console.log("✅ Complete order data fetched:", completeOrderData)

        // Transform the complete order data
        const completeOrder: OrderWithItems = {
          id: completeOrderData.id,
          orderNumber: completeOrderData.orderNumber,
          userId: completeOrderData.userId,
          status: completeOrderData.status || null,
          totalAmount: completeOrderData.totalAmount,
          floor: completeOrderData.floor || null,
          customerName: completeOrderData.customerName || null,
          customerPhone: completeOrderData.customerPhone || null,
          notes: completeOrderData.notes || null,
          estimatedCompletionTime: completeOrderData.estimatedCompletionTime || null,
          completedAt: completeOrderData.completedAt || null,
          createdAt: completeOrderData.createdAt || new Date().toISOString(),
          updatedAt: completeOrderData.updatedAt || new Date().toISOString(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          orderItems: (completeOrderData.orderItems || []).map((orderItem: any) => ({
            id: orderItem.id,
            quantity: orderItem.quantity,
            unitPrice: orderItem.unitPrice,
            totalPrice: orderItem.totalPrice,
            customizations: orderItem.customizations || null,
            menuItem: orderItem.menuItem ? {
              id: orderItem.menuItem.id,
              name: orderItem.menuItem.name,
              description: orderItem.menuItem.description || null,
              price: orderItem.menuItem.price,
            } : null
          }))
        }

        // Update the orders list with complete data
        setOrders(prevOrders => {
          // Check if order already exists to avoid duplicates
          const exists = prevOrders.some(order => order.id === completeOrder.id)
          if (exists) {
            // Update existing order with complete data
            return prevOrders.map(order =>
              order.id === completeOrder.id ? completeOrder : order
            )
          }

          // Add new complete order to the beginning of the list (newest first)
          return [completeOrder, ...prevOrders]
        })

        // Show enhanced toast with item names
        const itemNames = completeOrder.orderItems?.map(item =>
          `${item.quantity}x ${item.menuItem?.name || 'Unknown'}`
        ).join(', ') || 'No items'

        toast.success(`🎉 New order: ${completeOrder.orderNumber}`, {
          description: itemNames,
          duration: 5000,
        })
      }
    } catch (error) {
      console.error("Exception during complete order fetch:", error)
      // Fallback to minimal order
      setOrders(prevOrders => {
        const exists = prevOrders.some(order => order.id === newOrder.id)
        if (exists) return prevOrders

        const minimalOrder: OrderWithItems = {
          id: newOrder.id,
          orderNumber: newOrder.orderNumber,
          userId: newOrder.userId,
          status: newOrder.status || null,
          totalAmount: newOrder.totalAmount,
          floor: newOrder.floor || null,
          customerName: newOrder.customerName || null,
          customerPhone: newOrder.customerPhone || null,
          notes: newOrder.notes || null,
          estimatedCompletionTime: newOrder.estimatedCompletionTime || null,
          completedAt: newOrder.completedAt || null,
          createdAt: newOrder.createdAt || new Date().toISOString(),
          updatedAt: newOrder.updatedAt || new Date().toISOString(),
          orderItems: []
        }

        return [minimalOrder, ...prevOrders]
      })
    }
  }, [])

  const handleOrderUpdated = React.useCallback((updatedOrder: Schema["Order"]["type"]) => {
    console.log("Real-time: Order updated", updatedOrder)

    // Update the specific order in the list instead of full refresh
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === updatedOrder.id
          ? {
            ...order,
            status: updatedOrder.status || null,
            totalAmount: updatedOrder.totalAmount,
            floor: updatedOrder.floor || null,
            customerName: updatedOrder.customerName || null,
            customerPhone: updatedOrder.customerPhone || null,
            notes: updatedOrder.notes || null,
            estimatedCompletionTime: updatedOrder.estimatedCompletionTime || null,
            completedAt: updatedOrder.completedAt || null,
            updatedAt: updatedOrder.updatedAt || new Date().toISOString(),
          }
          : order
      )
    )

    // Show notification for status changes
    if (updatedOrder.status === "DONE") {
      toast.success(`Order completed!`)
    } else if (updatedOrder.status === "PENDING") {
      toast.info(`Order marked as pending`)
    }
  }, [])

  const handleOrderDeleted = React.useCallback((deletedOrder: Schema["Order"]["type"]) => {
    setOrders(prevOrders => prevOrders.filter(order => order.id !== deletedOrder.id))
    toast.error(`🗑️ Order deleted`, {
      description: `${deletedOrder.orderNumber} has been removed`,
      duration: 4000,
    })
  }, [])

  // Setup real-time subscriptions with enhanced monitoring
  const { isConnected } = useOrderSubscriptions({
    onOrderCreated: handleOrderCreated,
    onOrderUpdated: handleOrderUpdated,
    onOrderDeleted: handleOrderDeleted,
  })


  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filter orders by status
  const filteredOrders = React.useMemo(() => {
    if (statusFilter === "ALL") {
      return orders
    }
    return orders.filter(order => order.status === statusFilter)
  }, [orders, statusFilter])

  return (
    <ProtectedRoute requireAuth={true}>
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
                    <h1 className="text-3xl font-bold">Orders</h1>
                    <p className="text-muted-foreground">
                      Manage customer orders and track their status
                    </p>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Status:</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Orders</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="DONE">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Badge variant="outline">
                    {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
                  </Badge>
                </div>

                {loading ? (
                  <Loading />
                ) : (
                  <OrdersDataTable orders={filteredOrders} onRefresh={handleRefresh} />
                )}

              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}

export default Page
