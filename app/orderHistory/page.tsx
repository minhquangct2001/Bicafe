"use client"

import * as React from "react"
import { generateClient } from "aws-amplify/data"
import { type Schema } from "@/amplify/data/resource"
import { AppSidebar } from '@/components/app-sidebar'
import { ProtectedRoute } from '@/components/protected-route'
import { SiteHeader } from '@/components/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import Loading from '../product/loading'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  IconCreditCard,
  IconCash,
  IconDeviceMobile,
  IconHistory,
  IconShoppingBag,
  IconCalendar,
  IconClock
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
import { useAuthStore } from '@/lib/auth-store'
import { Separator } from "@/components/ui/separator"

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

// Order Details Dialog Component
function OrderDetailsDialog({ 
  order, 
  open, 
  onOpenChange 
}: { 
  order: OrderWithItems | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'PENDING':
        return 'secondary'
      case 'CONFIRMED':
        return 'default'
      case 'PREPARING':
        return 'outline'
      case 'READY':
        return 'default'
      case 'COMPLETED':
        return 'default'
      case 'CANCELLED':
        return 'destructive'
      default:
        return 'secondary'
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

  if (!order) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconShoppingBag className="h-5 w-5" />
            Order Details - {order.orderNumber}
          </DialogTitle>
          <DialogDescription>
            Complete information about your order
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Status */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                <Badge variant={getStatusBadgeVariant(order.status || 'PENDING')}>
                  {order.status || 'PENDING'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Payment:</span>
                <Badge variant={getPaymentStatusBadgeVariant(order.paymentStatus || 'PENDING')}>
                  {order.paymentStatus || 'PENDING'}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{formatPrice(order.totalAmount)}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <IconCalendar className="h-3 w-3" />
                {formatDate(order.createdAt)}
              </div>
            </div>
          </div>

          <Separator />

          {/* Order Information */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Order Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Order Type:</span>
                  <span className="font-medium">{order.orderType?.replace('_', ' ') || 'DINE IN'}</span>
                </div>
                {order.tableNumber && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Table:</span>
                    <span className="font-medium">{order.tableNumber}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <div className="flex items-center gap-1">
                    {getPaymentMethodIcon(order.paymentMethod || 'CASH')}
                    <span className="font-medium">{order.paymentMethod?.replace('_', ' ') || 'CASH'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">{order.customerName || 'Guest'}</span>
                </div>
                {order.customerPhone && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Phone:</span>
                    <div className="flex items-center gap-1">
                      <IconPhone className="h-3 w-3" />
                      <span className="font-medium">{order.customerPhone}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Notes */}
          {order.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Special Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{order.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Order Items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.orderItems?.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.menuItem?.name || 'Unknown Item'}</h4>
                      {item.menuItem?.description && (
                        <p className="text-sm text-muted-foreground">{item.menuItem.description}</p>
                      )}
                      <div className="text-sm text-muted-foreground">
                        {formatPrice(item.unitPrice)} × {item.quantity}
                      </div>
                      {item.customizations && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <strong>Customizations:</strong> {item.customizations}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatPrice(item.totalPrice)}</div>
                    </div>
                  </div>
                ))}
                
                <Separator />
                
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>Total:</span>
                  <span>{formatPrice(order.totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function OrderHistoryDataTable({ orders }: { 
  orders: OrderWithItems[]
}) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [selectedOrder, setSelectedOrder] = React.useState<OrderWithItems | null>(null)
  const [detailsOpen, setDetailsOpen] = React.useState(false)

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

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'PENDING':
        return 'secondary'
      case 'CONFIRMED':
        return 'default'
      case 'PREPARING':
        return 'outline'
      case 'READY':
        return 'default'
      case 'COMPLETED':
        return 'default'
      case 'CANCELLED':
        return 'destructive'
      default:
        return 'secondary'
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

  const handleViewDetails = (order: OrderWithItems) => {
    setSelectedOrder(order)
    setDetailsOpen(true)
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
        return (
          <Badge variant={getStatusBadgeVariant(status)}>
            {status || 'PENDING'}
          </Badge>
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
      id: "itemCount",
      header: "Items",
      cell: ({ row }) => {
        const itemCount = row.original.orderItems?.length || 0
        const totalQuantity = row.original.orderItems?.reduce((sum, item) => sum + item.quantity, 0) || 0
        return (
          <div className="text-center">
            <div className="font-medium">{totalQuantity}</div>
            <div className="text-xs text-muted-foreground">{itemCount} types</div>
          </div>
        )
      },
    },
    {
      accessorKey: "createdAt",
      header: "Order Date",
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as string
        return (
          <div className="text-sm">
            <div>{formatDate(date)}</div>
          </div>
        )
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const order = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <IconEye className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleViewDetails(order)}>
                <IconEye className="mr-2 h-4 w-4" />
                View Details
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
          placeholder="Search by order number..."
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
                  <div className="flex flex-col items-center gap-2">
                    <IconHistory className="h-8 w-8 text-muted-foreground" />
                    <div className="text-muted-foreground">No orders found.</div>
                    <div className="text-sm text-muted-foreground">Your order history will appear here.</div>
                  </div>
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

      {/* Order Details Dialog */}
      <OrderDetailsDialog
        order={selectedOrder}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  )
}

const Page = () => {
  const [orders, setOrders] = React.useState<OrderWithItems[]>([])
  const [loading, setLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL")
  const { user } = useAuthStore()

  // Fetch user's order history
  const fetchData = React.useCallback(async (refresh = false) => {
    if (!user?.userId) {
      console.log("No user ID available")
      setLoading(false)
      return
    }

    try {
      if (refresh) {
        setIsRefreshing(true)
      } else {
        setLoading(true)
      }
      
      console.log("Fetching order history for user:", user.userId)
      
      // Fetch orders for the current user
      const { data: ordersData, errors } = await client.models.Order.list({
        filter: { userId: { eq: user.userId } },
      })

      if (errors && errors.length > 0) {
        console.error("Error fetching orders:", errors)
        toast.error(`Failed to fetch order history: ${errors[0]?.message || 'Unknown error'}`)
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
        console.log(`Fetched ${ordersWithItems.length} orders for user`)
      }
    } catch (error) {
      console.error("Exception during data fetch:", error)
      toast.error("Failed to fetch order history. Please try again.")
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [user?.userId])

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

  // Calculate summary statistics
  const orderStats = React.useMemo(() => {
    const totalOrders = orders.length
    const totalSpent = orders.reduce((sum, order) => sum + order.totalAmount, 0)
    const completedOrders = orders.filter(order => order.status === 'COMPLETED').length
    const pendingOrders = orders.filter(order => order.status === 'PENDING').length

    return {
      totalOrders,
      totalSpent,
      completedOrders,
      pendingOrders
    }
  }, [orders])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price)
  }

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
                    <h1 className="text-3xl font-bold">Order History</h1>
                    <p className="text-muted-foreground">
                      View your past orders and track their status
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

                {/* Order Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                      <IconShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{orderStats.totalOrders}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                      <IconCreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatPrice(orderStats.totalSpent)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Completed</CardTitle>
                      <IconClock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{orderStats.completedOrders}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Pending</CardTitle>
                      <IconClock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{orderStats.pendingOrders}</div>
                    </CardContent>
                  </Card>
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
                  <OrderHistoryDataTable orders={filteredOrders} />
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
