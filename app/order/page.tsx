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
  IconEdit, 
  IconEye,
  IconPhone,
  IconCreditCard,
  IconCash,
  IconDeviceMobile
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
  paymentStatus: string | null
  paymentMethod: string | null
  orderType: string | null
  tableNumber: string | null
  customerName: string | null
  customerPhone: string | null
  notes: string | null
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

  const handleUpdateStatus = React.useCallback(async (orderId: string, newStatus: string) => {
    try {
      const { errors } = await client.models.Order.update({
        id: orderId,
        status: newStatus as "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED",
      })

      if (errors && errors.length > 0) {
        console.error("Error updating order status:", errors)
        toast.error(`Failed to update order status: ${errors[0]?.message || 'Unknown error'}`)
        return
      }

      toast.success(`Order status updated to ${newStatus}`)
      onRefresh?.()
    } catch (error) {
      console.error("Exception during status update:", error)
      toast.error("Failed to update order status. Please try again.")
    }
  }, [onRefresh])

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
      accessorKey: "orderType",
      header: "Type",
      cell: ({ row }) => {
        const orderType = row.getValue("orderType") as string
        const tableNumber = row.original.tableNumber
        return (
          <div>
            <Badge variant="outline">
              {orderType?.replace('_', ' ') || 'DINE IN'}
            </Badge>
            {tableNumber && (
              <div className="text-xs text-muted-foreground mt-1">
                Table: {tableNumber}
              </div>
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
        const orderId = row.original.id
        
        return (
          <Select value={status} onValueChange={(newStatus) => handleUpdateStatus(orderId, newStatus)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
              <SelectItem value="PREPARING">Preparing</SelectItem>
              <SelectItem value="READY">Ready</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        )
      },
    },
    {
      accessorKey: "paymentStatus",
      header: "Payment",
      cell: ({ row }) => {
        const paymentStatus = row.getValue("paymentStatus") as string
        const paymentMethod = row.original.paymentMethod
        
        const getPaymentMethodIcon = (method: string) => {
          switch (method) {
            case 'CASH':
              return <IconCash className="h-4 w-4" />
            case 'CARD':
              return <IconCreditCard className="h-4 w-4" />
            case 'MOBILE_PAYMENT':
              return <IconDeviceMobile className="h-4 w-4" />
            default:
              return <IconCreditCard className="h-4 w-4" />
          }
        }

        const getPaymentStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
          switch (status) {
            case 'PENDING':
              return 'secondary'
            case 'PAID':
              return 'default'
            case 'FAILED':
              return 'destructive'
            case 'REFUNDED':
              return 'outline'
            default:
              return 'secondary'
          }
        }

        return (
          <div className="space-y-1">
            <Badge variant={getPaymentStatusBadgeVariant(paymentStatus)}>
              {paymentStatus || 'PENDING'}
            </Badge>
            {paymentMethod && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {getPaymentMethodIcon(paymentMethod)}
                <span>{paymentMethod.replace('_', ' ')}</span>
              </div>
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
      cell: () => {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <IconEye className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <IconEye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem>
                <IconEdit className="mr-2 h-4 w-4" />
                Edit Order
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
    },
  })

  return (
    <div className="space-y-4">
      {/* Search and filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search orders..."
          value={(table.getColumn("orderNumber")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("orderNumber")?.setFilterValue(event.target.value)
          }
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

  // Fetch orders data
  const fetchData = React.useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true)
      } else {
        setLoading(true)
      }
      
      console.log("Fetching orders...")
      
      const { data: ordersData, errors } = await client.models.Order.list({
        authMode: "userPool",
      })

      if (errors && errors.length > 0) {
        console.error("Error fetching orders:", errors)
        toast.error(`Failed to fetch orders: ${errors[0]?.message || 'Unknown error'}`)
        return
      }

      if (ordersData) {
        // Fetch order items for each order
        const ordersWithItems: OrderWithItems[] = await Promise.all(
          ordersData.map(async (order) => {
            try {
              const { data: orderItems } = await client.models.OrderItem.list({
                filter: { orderId: { eq: order.id } },
              })

              // Fetch menu items for each order item
              const orderItemsWithMenuItems = await Promise.all(
                (orderItems || []).map(async (orderItem) => {
                  try {
                    const { data: menuItem } = await client.models.MenuItem.get({
                      id: orderItem.menuItemId,
                    })
                    return {
                      id: orderItem.id,
                      quantity: orderItem.quantity,
                      unitPrice: orderItem.unitPrice,
                      totalPrice: orderItem.totalPrice,
                      customizations: orderItem.customizations,
                      menuItem: menuItem ? {
                        id: menuItem.id,
                        name: menuItem.name,
                        description: menuItem.description,
                        price: menuItem.price,
                      } : null
                    }
                  } catch (error) {
                    console.error("Error fetching menu item:", error)
                    return {
                      id: orderItem.id,
                      quantity: orderItem.quantity,
                      unitPrice: orderItem.unitPrice,
                      totalPrice: orderItem.totalPrice,
                      customizations: orderItem.customizations,
                      menuItem: null
                    }
                  }
                })
              )

              return {
                id: order.id,
                orderNumber: order.orderNumber,
                userId: order.userId,
                status: order.status,
                totalAmount: order.totalAmount,
                paymentStatus: order.paymentStatus,
                paymentMethod: order.paymentMethod,
                orderType: order.orderType,
                tableNumber: order.tableNumber,
                customerName: order.customerName,
                customerPhone: order.customerPhone,
                notes: order.notes,
                createdAt: order.createdAt || new Date().toISOString(),
                updatedAt: order.updatedAt || new Date().toISOString(),
                orderItems: orderItemsWithMenuItems
              } as OrderWithItems
            } catch (error) {
              console.error("Error fetching order items for order:", order.id, error)
              return {
                id: order.id,
                orderNumber: order.orderNumber,
                userId: order.userId,
                status: order.status,
                totalAmount: order.totalAmount,
                paymentStatus: order.paymentStatus,
                paymentMethod: order.paymentMethod,
                orderType: order.orderType,
                tableNumber: order.tableNumber,
                customerName: order.customerName,
                customerPhone: order.customerPhone,
                notes: order.notes,
                createdAt: order.createdAt || new Date().toISOString(),
                updatedAt: order.updatedAt || new Date().toISOString(),
                orderItems: []
              } as OrderWithItems
            }
          })
        )

        // Sort by creation date (newest first)
        ordersWithItems.sort((a, b) => 
          new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
        )

        setOrders(ordersWithItems)
        console.log(`Fetched ${ordersWithItems.length} orders`)
      }
    } catch (error) {
      console.error("Exception during data fetch:", error)
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
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={handleRefresh}
                      disabled={loading || isRefreshing}
                    >
                      <IconRefresh className="mr-2 h-4 w-4" />
                      {isRefreshing ? "Refreshing..." : "Refresh"}
                    </Button>
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
                        <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                        <SelectItem value="PREPARING">Preparing</SelectItem>
                        <SelectItem value="READY">Ready</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
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
