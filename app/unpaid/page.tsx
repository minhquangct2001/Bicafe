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
  IconCreditCard,
  IconPhone,
  IconCheck,
  IconCircleCheckFilled,
  IconLoader,
  IconCurrencyDollar
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

const client = generateClient<Schema>()

interface UnpaidOrderWithItems {
  id: string
  orderNumber: string
  userId: string
  status: string | null
  totalAmount: number
  floor: string | null
  customerName: string | null
  customerPhone: string | null
  notes: string | null
  paymentMethod: string | null
  paymentStatus: string | null
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

function UnpaidOrdersDataTable({ orders, onRefresh }: {
  orders: UnpaidOrderWithItems[]
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

  const columns: ColumnDef<UnpaidOrderWithItems>[] = [
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
      accessorKey: "paymentMethod",
      header: "Payment Method",
      cell: ({ row }) => {
        const paymentMethod = row.getValue("paymentMethod") as string
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <IconCreditCard className="h-3 w-3" />
            {paymentMethod === "POSTPAID" ? "Pay Later" : "Prepaid"}
          </Badge>
        )
      },
    },
    {
      id: "items",
      header: "Items",
      accessorFn: (row) => {
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
      accessorKey: "totalAmount",
      header: "Amount Due",
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("totalAmount"))
        return (
          <div className="font-bold  flex items-center gap-1">
            <IconCurrencyDollar className="h-4 w-4" />
            {formatPrice(amount)}
          </div>
        )
      },
    },
    {
      accessorKey: "createdAt",
      header: "Order Date",
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

        const handleMarkPaid = async () => {
          try {
            const { errors } = await client.models.Order.update({
              id: order.id,
              paymentStatus: "PAID"
            })

            if (errors && errors.length > 0) {
              console.error("Error marking order as paid:", errors)
              toast.error(`Failed to mark order as paid: ${errors[0]?.message || 'Unknown error'}`)
              return
            }

            toast.success(`Order ${order.orderNumber} marked as paid!`, {
              description: `Payment of ${formatPrice(order.totalAmount)} received`,
              duration: 4000,
            })
            
            onRefresh?.()
          } catch (error) {
            console.error("Exception during mark as paid:", error)
            toast.error("Failed to mark order as paid. Please try again.")
          }
        }

        return (
          <Button
            onClick={handleMarkPaid}
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <IconCheck className="mr-2 h-4 w-4" />
            Mark Paid
          </Button>
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

  // Calculate total amount due
  const totalAmountDue = React.useMemo(() => {
    return orders.reduce((sum, order) => sum + order.totalAmount, 0)
  }, [orders])

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="  p-4 rounded-lg border ">
          <div className="flex items-center gap-2">
            <IconCurrencyDollar className="h-5 w-5" />
            <div>
              <p className="text-sm font-medium ">Total Amount Due</p>
              <p className="text-2xl font-bold ">{formatPrice(totalAmountDue)}</p>
            </div>
          </div>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-2">
            <IconLoader className="h-5 w-5 " />
            <div>
              <p className="text-sm font-medium ">Pending Payments</p>
              <p className="text-2xl font-bold ">{orders.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search unpaid orders..."
          value={globalFilter ?? ""}
          onChange={(event) => setGlobalFilter(String(event.target.value))}
          className="max-w-sm"
        />
        <Badge variant="outline" >
          {orders.length} unpaid {orders.length === 1 ? 'order' : 'orders'}
        </Badge>
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
                    <IconCircleCheckFilled className="h-8 w-8 text-green-500" />
                    <div className="text-muted-foreground">All orders have been paid!</div>
                    <div className="text-sm text-muted-foreground">No unpaid orders at the moment.</div>
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
          Showing {table.getRowModel().rows.length} of {orders.length} unpaid orders
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

const UnpaidOrdersPage = () => {
  const [orders, setOrders] = React.useState<UnpaidOrderWithItems[]>([])
  const [loading, setLoading] = React.useState(true)

  // Fetch unpaid orders
  const fetchData = React.useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setLoading(true)
      } else {
        setLoading(true)
      }

      console.log("🚀 Fetching unpaid orders...")

      // Fetch orders with POSTPAID payment method and UNPAID status
      const { data: ordersData, errors } = await client.models.Order.list({
        filter: {
          and: [
            { paymentMethod: { eq: "POSTPAID" } },
            { paymentStatus: { eq: "UNPAID" } }
          ]
        },
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
          'paymentMethod',
          'paymentStatus',
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
        console.error("Error fetching unpaid orders:", errors)
        toast.error(`Failed to fetch unpaid orders: ${errors[0]?.message || 'Unknown error'}`)
        return
      }

      if (ordersData) {
        // Transform the response
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const unpaidOrders: UnpaidOrderWithItems[] = ordersData.map((order: any) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          userId: order.userId,
          status: order.status || null,
          totalAmount: order.totalAmount,
          floor: order.floor || null,
          customerName: order.customerName || null,
          customerPhone: order.customerPhone || null,
          notes: order.notes || null,
          paymentMethod: order.paymentMethod || null,
          paymentStatus: order.paymentStatus || null,
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

        // Sort by creation date (oldest first for payment priority)
        unpaidOrders.sort((a, b) =>
          new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime()
        )

        setOrders(unpaidOrders)
        console.log(`✅ Loaded ${unpaidOrders.length} unpaid orders`)
      }
    } catch (error) {
      console.error("Exception during unpaid orders fetch:", error)
      toast.error("Failed to fetch unpaid orders. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  const handleRefresh = React.useCallback(() => {
    fetchData(true)
  }, [fetchData])

  // Real-time subscription handlers
  const handleOrderCreated = React.useCallback((newOrder: Schema["Order"]["type"]) => {
    // Only add if it's a POSTPAID and UNPAID order
    if (newOrder.paymentMethod === "POSTPAID" && newOrder.paymentStatus === "UNPAID") {
      console.log("Real-time: New unpaid order created", newOrder)
      handleRefresh() // Refresh to get complete data
    }
  }, [handleRefresh])

  const handleOrderUpdated = React.useCallback((updatedOrder: Schema["Order"]["type"]) => {
    console.log("Real-time: Order payment status updated", updatedOrder)
    
    if (updatedOrder.paymentStatus === "PAID") {
      // Remove from unpaid list
      setOrders(prevOrders => prevOrders.filter(order => order.id !== updatedOrder.id))
      toast.success(`Payment received for order ${updatedOrder.orderNumber}!`)
    } else if (updatedOrder.paymentMethod === "POSTPAID" && updatedOrder.paymentStatus === "UNPAID") {
      // Refresh to ensure we have the latest data
      handleRefresh()
    }
  }, [handleRefresh])

  const { isConnected } = useOrderSubscriptions({
    onOrderCreated: handleOrderCreated,
    onOrderUpdated: handleOrderUpdated,
  })

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

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
                    <h1 className="text-3xl font-bold">Unpaid Orders</h1>
                    <p className="text-muted-foreground">
                      Track and manage orders with pending payments (Pay Later)
                    </p>
                  </div>
                </div>
                {loading ? (
                  <Loading />
                ) : (
                  <UnpaidOrdersDataTable orders={orders} onRefresh={handleRefresh} />
                )}

              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}

export default UnpaidOrdersPage
