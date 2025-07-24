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
import Loading from '../product/loading'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { IconPlus, IconRefresh, IconEdit, IconTrash, IconCategory } from "@tabler/icons-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Switch,
} from "@/components/ui/switch"

const client = generateClient<Schema>()

type Category = Schema["Category"]["type"]

// Form schema for adding/editing categories
const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  isActive: z.boolean(),
})

type CategoryFormData = z.infer<typeof categorySchema>

function DeleteCategoryDialog({ 
  item, 
  onConfirm 
}: { 
  item: Category
  onConfirm: () => void 
}) {
  const [open, setOpen] = React.useState(false)

  const handleConfirm = () => {
    onConfirm()
    setOpen(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <DropdownMenuItem 
          onSelect={(e) => {
            e.preventDefault()
            setOpen(true)
          }}
          className="text-destructive"
        >
          <IconTrash className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the category &ldquo;{item.name}&rdquo; and may affect associated menu items.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Column definitions for categories data table
const createCategoryColumns = (
  onEdit?: (item: Category) => void,
  onDelete?: (item: Category) => void
): ColumnDef<Category>[] => [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <div className="max-w-[300px] truncate">
        {row.getValue("description") || "No description"}
      </div>
    ),
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.getValue("isActive") as boolean
      return (
        <Badge variant={isActive ? "default" : "secondary"}>
          {isActive ? "Active" : "Inactive"}
        </Badge>
      )
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => {
      const createdAt = row.getValue("createdAt") as string
      return (
        <div>
          {createdAt ? new Date(createdAt).toLocaleDateString() : "N/A"}
        </div>
      )
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <IconEdit className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit?.(row.original)}>
            <IconEdit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DeleteCategoryDialog 
            item={row.original}
            onConfirm={() => onDelete?.(row.original)}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]

function AddCategoryDialog({ 
  onSuccess 
}: { 
  onSuccess: () => void 
}) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
    },
  })

  const onSubmit = async (data: CategoryFormData) => {
    try {
      setLoading(true)
      
      console.log("Creating category:", data)
      
      const { data: category, errors } = await client.models.Category.create({
        name: data.name.trim(),
        description: data.description?.trim() || null,
        isActive: data.isActive,
      })

      if (errors && errors.length > 0) {
        console.error("Error creating category:", errors)
        errors.forEach((error, index) => {
          console.error(`Error ${index + 1}:`, {
            message: error.message,
            errorType: error.errorType,
            path: error.path,
            errorInfo: error.errorInfo
          })
        })
        
        const errorMessage = errors[0]?.message || 'Unknown error'
        if (errorMessage.includes('authorization') || errorMessage.includes('unauthorized')) {
          toast.error("You don't have permission to create categories")
        } else if (errorMessage.includes('validation')) {
          toast.error("Invalid data provided. Please check your inputs.")
        } else {
          toast.error(`Failed to create category: ${errorMessage}`)
        }
        return
      }

      if (category) {
        console.log("Category created successfully:", category)
        toast.success(`Category "${category.name}" created successfully!`)
      } else {
        toast.success("Category created successfully!")
      }
      form.reset()
      setOpen(false)
      onSuccess()
    } catch (error) {
      console.error("Exception during category creation:", error)
      
      if (error instanceof Error) {
        if (error.message.includes('Network')) {
          toast.error("Network error. Please check your connection and try again.")
        } else if (error.message.includes('authorization')) {
          toast.error("You don't have permission to perform this action.")
        } else {
          toast.error(`Failed to create category: ${error.message}`)
        }
      } else {
        toast.error("An unexpected error occurred. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <IconPlus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Category</DialogTitle>
          <DialogDescription>
            Create a new category for organizing your menu items.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Category name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Description of the category" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Optional description for this category
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                      Make this category available for menu items
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function EditCategoryDialog({ 
  item,
  onSuccess 
}: { 
  item: Category | null
  onSuccess: () => void 
}) {
  const [loading, setLoading] = React.useState(false)

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
    },
  })

  // Update form values when item changes
  React.useEffect(() => {
    if (item) {
      form.reset({
        name: item.name || "",
        description: item.description || "",
        isActive: item.isActive ?? true,
      })
    }
  }, [item, form])

  const onSubmit = async (data: CategoryFormData) => {
    if (!item) {
      console.error("No item to update")
      return
    }

    try {
      setLoading(true)
      
      console.log("Updating category:", {
        id: item.id,
        originalItem: item,
        formData: data
      })

      // Simple update approach - only update changed fields
      const updateData: {
        id: string
        name?: string
        description?: string | null
        isActive?: boolean
      } = {
        id: item.id,
      }

      // Only include fields that have changed
      if (data.name !== item.name) {
        updateData.name = data.name.trim()
      }
      if (data.description !== item.description) {
        updateData.description = data.description?.trim() || null
      }
      if (data.isActive !== item.isActive) {
        updateData.isActive = data.isActive
      }

      // If no fields changed, show success without making API call
      if (Object.keys(updateData).length === 1) {
        toast.info("No changes detected")
        onSuccess()
        return
      }
      
      console.log("Update payload:", updateData)
      
      const { data: updatedCategory, errors } = await client.models.Category.update(updateData)

      if (errors && errors.length > 0) {
        console.error("Error updating category:", errors)
        // More detailed error logging
        errors.forEach((error, index) => {
          console.error(`Error ${index + 1}:`, {
            message: error.message,
            errorType: error.errorType,
            path: error.path,
            errorInfo: error.errorInfo
          })
        })
        
        // Show more user-friendly error message
        const errorMessage = errors[0]?.message || 'Unknown error'
        if (errorMessage.includes('authorization') || errorMessage.includes('unauthorized')) {
          toast.error("You don't have permission to update this category")
        } else if (errorMessage.includes('validation')) {
          toast.error("Invalid data provided. Please check your inputs.")
        } else {
          toast.error(`Failed to update category: ${errorMessage}`)
        }
        return
      }

      if (updatedCategory) {
        console.log("Category updated successfully:", updatedCategory)
        toast.success(`Category "${updatedCategory.name}" updated successfully!`)
      } else {
        console.warn("Update completed but no data returned")
        toast.success("Category updated successfully!")
      }
      onSuccess()
    } catch (error) {
      console.error("Exception during category update:", error)
      
      // Handle different types of errors
      if (error instanceof Error) {
        if (error.message.includes('Network')) {
          toast.error("Network error. Please check your connection and try again.")
        } else if (error.message.includes('authorization')) {
          toast.error("You don't have permission to perform this action.")
        } else {
          toast.error(`Failed to update category: ${error.message}`)
        }
      } else {
        toast.error("An unexpected error occurred. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    onSuccess() // This will close the dialog by setting item to null
  }

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onSuccess()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Category</DialogTitle>
          <DialogDescription>
            Update the details of your category.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Category name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Description of the category" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Optional description for this category
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                      Make this category available for menu items
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update Category"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function CategoriesDataTable({ categories, onRefresh, onEdit }: { 
  categories: Category[]
  onRefresh?: () => void
  onEdit?: (item: Category) => void
}) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})

  const handleEdit = React.useCallback((item: Category) => {
    onEdit?.(item)
  }, [onEdit])

  const handleDelete = React.useCallback(async (item: Category) => {
    try {
      const { errors } = await client.models.Category.delete({ id: item.id })
      if (errors) {
        console.error("Error deleting category:", errors)
        toast.error("Failed to delete category")
      } else {
        toast.success(`Category "${item.name}" deleted successfully!`)
        onRefresh?.()
      }
    } catch (error) {
      console.error("Error deleting category:", error)
      toast.error("Failed to delete category")
    }
  }, [onRefresh])

  // Memoize columns to prevent recreation on every render
  const columns = React.useMemo(() => 
    createCategoryColumns(handleEdit, handleDelete),
    [handleEdit, handleDelete]
  )

  const table = useReactTable({
    data: categories,
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
    <Card>
      <CardHeader>
        <CardTitle>Categories ({categories.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filter Input */}
        <div className="flex items-center py-4">
          <Input
            placeholder="Filter categories..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("name")?.setFilterValue(event.target.value)
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
                      <IconCategory className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">No categories found</p>
                      <p className="text-sm text-muted-foreground">
                        Add your first category to get started
                      </p>
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
      </CardContent>
    </Card>
  )
}

// Add a custom hook to manage edit dialog state
function useEditCategoryDialog(onRefresh?: () => void) {
  const [editingItem, setEditingItem] = React.useState<Category | null>(null)

  const openEditDialog = React.useCallback((item: Category) => {
    setEditingItem(item)
  }, [])

  const closeEditDialog = React.useCallback(() => {
    setEditingItem(null)
  }, [])

  const handleEditSuccess = React.useCallback(() => {
    closeEditDialog()
    onRefresh?.()
  }, [closeEditDialog, onRefresh])

  return {
    editingItem,
    openEditDialog,
    closeEditDialog,
    handleEditSuccess
  }
}

const CategoryPage = () => {
  const [categories, setCategories] = React.useState<Category[]>([])
  const [loading, setLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const fetchData = React.useCallback(async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true)
      } else {
        setLoading(true)
      }
      
      const { data: categoriesResult } = await client.models.Category.list()

      // Update state only if data exists to prevent unnecessary re-renders
      if (categoriesResult) {
        setCategories(prev => {
          // Only update if data has changed
          const newData = categoriesResult
          if (JSON.stringify(prev) === JSON.stringify(newData)) {
            return prev
          }
          return newData
        })
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
      toast.error("Failed to fetch categories")
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  // Optimized refresh function for manual refresh
  const handleRefresh = React.useCallback(() => {
    fetchData(true)
  }, [fetchData])

  // Use the edit dialog hook
  const { editingItem, openEditDialog, handleEditSuccess } = useEditCategoryDialog(handleRefresh)

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
                    <h1 className="text-3xl font-bold">Categories</h1>
                    <p className="text-muted-foreground">
                      Manage your menu categories
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
                    <AddCategoryDialog 
                      onSuccess={() => fetchData(true)} 
                    />
                  </div>
                </div>

                {loading ? (
                  <Loading />
                ) : (
                  <CategoriesDataTable 
                    categories={categories} 
                    onRefresh={handleRefresh} 
                    onEdit={openEditDialog}
                  />
                )}

                {/* Edit Category Dialog */}
                <EditCategoryDialog
                  item={editingItem}
                  onSuccess={handleEditSuccess}
                />

              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}

export default CategoryPage
