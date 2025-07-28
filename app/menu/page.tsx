"use client"

import * as React from "react"
import { generateClient } from "aws-amplify/data"
import { type Schema } from "@/amplify/data/resource"
import { AppSidebar } from '@/components/app-sidebar'
import { ProtectedRoute } from '@/components/protected-route'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Separator } from "@/components/ui/separator"
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import {
    IconSearch,
    IconShoppingCart,
    IconPlus,
    IconMinus,
    IconX,
    IconCoffee,
    IconCookie,
    IconCreditCard
} from '@tabler/icons-react'
import { toast } from "sonner"
import Image from "next/image"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useAuthStore } from "@/lib/auth-store"

const client = generateClient<Schema>()

type MenuItem = Schema["MenuItem"]["type"]
type Category = Schema["Category"]["type"]
type UserProfile = Schema["UserProfile"]["type"]

interface CartItem {
  menuItem: MenuItem
  quantity: number
}// Checkout form schema
const checkoutSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().min(1, "Phone number is required"),
  floor: z.string().optional(),
  notes: z.string().optional(),
})

type CheckoutFormData = z.infer<typeof checkoutSchema>

// Custom Image Component with Error Handling
const MenuItemImage = ({ item }: { item: MenuItem }) => {
    const [imageError, setImageError] = React.useState(false)

    return (
        <div className="aspect-square rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 mb-3 overflow-hidden relative">
            {item.imageUrl && !imageError ? (
                <>
                    <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={() => setImageError(true)}
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                    />
                </>
            ) : (
                <div className="flex items-center justify-center h-full">
                    <IconCookie className="h-16 w-16 text-orange-300" />
                </div>
            )}
            {/* Discount Badge */}
            <div className="absolute top-2 left-2">
                <Badge className=" text-white text-xs px-2 py-1">
                    New
                </Badge>
            </div>
        </div>
    )
}

// Checkout Dialog Component
function CheckoutDialog({ 
  cart, 
  totalPrice, 
  totalItems, 
  onSuccess, 
  onClose 
}: { 
  cart: CartItem[]
  totalPrice: number
  totalItems: number
  onSuccess: () => void
  onClose: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const { user } = useAuthStore()

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      floor: "",
      notes: "",
    },
  })

  // Fetch user profile to auto-fill form
  const fetchUserProfile = React.useCallback(async () => {
    if (!user?.userId) return

    try {
      const { data: profiles } = await client.models.UserProfile.list({
        filter: { userId: { eq: user.userId } }
      })

      if (profiles && profiles.length > 0) {
        const profile = profiles[0]
        
        // Auto-fill form with user profile data
        form.setValue("customerName", profile.name || "")
        form.setValue("customerPhone", profile.phone || "")
      }
    } catch (error) {
      console.error("Error fetching user profile:", error)
    }
  }, [user?.userId, form])

  React.useEffect(() => {
    if (open && user?.userId) {
      fetchUserProfile()
    }
  }, [open, user?.userId, fetchUserProfile])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price)
  }

  const generateOrderNumber = () => {
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.random().toString(36).substring(2, 5).toUpperCase()
    return `ORD-${timestamp}-${random}`
  }

  const onSubmit = async (data: CheckoutFormData) => {
    if (!user?.userId) {
      toast.error("Please log in to place an order")
      return
    }

    try {
      setLoading(true)
      
      const orderNumber = generateOrderNumber()
      
      console.log("Creating order:", {
        orderNumber,
        userId: user.userId,
        data,
        cart,
        totalPrice
      })

      // Create the order
      const { data: order, errors: orderErrors } = await client.models.Order.create({
        orderNumber,
        userId: user.userId,
        status: "PENDING",
        totalAmount: totalPrice,
        floor: data.floor || "",
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        notes: data.notes || "",
      })

      if (orderErrors) {
        console.error("Error creating order:", orderErrors)
        toast.error(`Failed to create order: ${orderErrors[0]?.message || 'Unknown error'}`)
        return
      }

      if (!order) {
        toast.error("Failed to create order")
        return
      }

      console.log("Order created successfully:", order)

      // Create order items
      const orderItemPromises = cart.map(async (cartItem) => {
        const { data: orderItem, errors: itemErrors } = await client.models.OrderItem.create({
          orderId: order.id,
          menuItemId: cartItem.menuItem.id,
          quantity: cartItem.quantity,
          unitPrice: cartItem.menuItem.price,
          totalPrice: cartItem.menuItem.price * cartItem.quantity,
          customizations: "",
        })

        if (itemErrors) {
          console.error("Error creating order item:", itemErrors)
          throw new Error(`Failed to create order item: ${itemErrors[0]?.message}`)
        }

        return orderItem
      })

      await Promise.all(orderItemPromises)

      toast.success(`Order ${orderNumber} placed successfully!`)
      form.reset()
      setOpen(false)
      onSuccess()
      onClose()
    } catch (error) {
      console.error("Error during checkout:", error)
      toast.error(`Checkout failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    if (cart.length === 0) {
      setOpen(false)
    }
  }, [cart])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          className="w-full h-12 text-white font-semibold"
          disabled={cart.length === 0}
          onClick={() => setOpen(true)}
        >
          <IconCreditCard className="h-4 w-4 mr-2" />
          Checkout ({totalItems} items)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Checkout</DialogTitle>
          <DialogDescription>
            Complete your order details below
          </DialogDescription>
        </DialogHeader>

        {/* Order Summary */}
        <div className="bg-muted/50 p-4 rounded-lg space-y-3">
          <h4 className="font-semibold">Order Summary</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {cart.map((item) => (
              <div key={item.menuItem.id} className="flex justify-between text-sm">
                <span>{item.menuItem.name} x{item.quantity}</span>
                <span>{formatPrice(item.menuItem.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatPrice(totalPrice)}</span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div> */}

            <FormField
              control={form.control}
              name="floor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Floor</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter floor number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any special requests or notes..."
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Placing Order..." : `Place Order (${formatPrice(totalPrice)})`}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

const Page = () => {
    const [menuItems, setMenuItems] = React.useState<MenuItem[]>([])
    const [categories, setCategories] = React.useState<Category[]>([])
    const [loading, setLoading] = React.useState(true)
    const [selectedCategory, setSelectedCategory] = React.useState<string>("all")
    const [searchQuery, setSearchQuery] = React.useState("")
    const [cart, setCart] = React.useState<CartItem[]>([])
    const [showCart, setShowCart] = React.useState(false)

    const fetchData = React.useCallback(async () => {
        try {
            setLoading(true)

            const [categoriesResult, menuItemsResult] = await Promise.all([
                client.models.Category.list(),
                client.models.MenuItem.list()
            ])

            if (categoriesResult.data) {
                setCategories(categoriesResult.data.filter(cat => cat.isActive))
            }

            if (menuItemsResult.data) {
                setMenuItems(menuItemsResult.data.filter(item => item.isAvailable))
            }
        } catch (error) {
            console.error("Error fetching data:", error)
            toast.error("Failed to fetch menu data")
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchData()
    }, [fetchData])

    const filteredMenuItems = React.useMemo(() => {
        return menuItems.filter(item => {
            const matchesCategory = selectedCategory === "all" || item.categoryId === selectedCategory
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
            return matchesCategory && matchesSearch
        })
    }, [menuItems, selectedCategory, searchQuery])

    const addToCart = (menuItem: MenuItem) => {
        setCart(prev => {
            const existingItem = prev.find(item => item.menuItem.id === menuItem.id)
            if (existingItem) {
                return prev.map(item =>
                    item.menuItem.id === menuItem.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                )
            }
            return [...prev, { menuItem, quantity: 1 }]
        })
        toast.success(`Added ${menuItem.name} to cart`)
    }

    const removeFromCart = (menuItemId: string) => {
        setCart(prev => prev.filter(item => item.menuItem.id !== menuItemId))
    }

    const updateCartQuantity = (menuItemId: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(menuItemId)
            return
        }
        setCart(prev =>
            prev.map(item =>
                item.menuItem.id === menuItemId
                    ? { ...item, quantity }
                    : item
            )
        )
    }

    const getTotalPrice = () => {
        return cart.reduce((total, item) => total + (item.menuItem.price * item.quantity), 0)
    }

    const getTotalItems = () => {
        return cart.reduce((total, item) => total + item.quantity, 0)
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(price)
    }

    if (loading) {
        return (
            <ProtectedRoute requireAuth={true} allowedRoles={['USER']}>
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
                        <div className="flex items-center justify-center h-screen">
                            <div className="text-center">
                                <IconCoffee className="mx-auto h-12 w-12 text-muted-foreground animate-pulse" />
                                <p className="mt-2 text-muted-foreground">Loading menu...</p>
                            </div>
                        </div>
                    </SidebarInset>
                </SidebarProvider>
            </ProtectedRoute>
        )
    }
    return (
        <ProtectedRoute requireAuth={true} allowedRoles={['USER']}>
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
                                {/* Header */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h1 className="text-3xl font-bold">Menu</h1>
                                        <p className="text-muted-foreground">
                                            Browse our delicious menu items
                                        </p>
                                    </div>
                                    <Button
                                        onClick={() => setShowCart(!showCart)}
                                        className="relative"
                                        variant={showCart ? "default" : "outline"}
                                    >
                                        <IconShoppingCart className="mr-2 h-4 w-4" />
                                        Cart
                                        {getTotalItems() > 0 && (
                                            <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs">
                                                {getTotalItems()}
                                            </Badge>
                                        )}
                                    </Button>
                                </div>

                                <div className="flex gap-6">
                                    {/* Main Menu Area */}
                                    <div className="flex-1">
                                        {/* Search Bar */}
                                        <div className="relative mb-6">
                                            <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Search for coffee, food, drinks..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="pl-10 h-12"
                                            />
                                        </div>

                                        {/* Category Filters */}
                                        <div className="flex gap-2 mb-6 flex-wrap">
                                            <Button
                                                variant={selectedCategory === "all" ? "default" : "outline"}
                                                onClick={() => setSelectedCategory("all")}
                                                size="sm"
                                                className="rounded-full"
                                            >
                                                All Items
                                            </Button>
                                            {categories.map((category) => (
                                                <Button
                                                    key={category.id}
                                                    variant={selectedCategory === category.id ? "default" : "outline"}
                                                    onClick={() => setSelectedCategory(category.id)}
                                                    size="sm"
                                                    className="rounded-full"
                                                >
                                                    {category.name}
                                                </Button>
                                            ))}
                                        </div>

                                        {/* Menu Items Grid - Shopee Style */}
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                            {filteredMenuItems.map((item) => (
                                                <Card key={item.id} className="group hover:shadow-lg transition-all duration-200 border hover:border-orange-200 cursor-pointer">
                                                    <CardContent className="p-3">
                                                        {/* Product Image */}
                                                        <MenuItemImage item={item} />

                                                        {/* Product Info */}
                                                        <div className="space-y-2">
                                                            <h3 className="font-medium text-sm line-clamp-2 min-h-[2.5rem]">{item.name}</h3>

                                                            {/* Description */}
                                                            {item.description && (
                                                                <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">
                                                                    {item.description}
                                                                </p>
                                                            )}

                                                            {/* Price */}
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-orange-600 font-bold text-lg">
                                                                    {formatPrice(item.price)}
                                                                </span>
                                                            </div>

                                                            {/* Rating (Mock) */}
                                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                <div className="flex">
                                                                    {[...Array(5)].map((_, i) => (
                                                                        <span key={i} className="text-yellow-400">★</span>
                                                                    ))}
                                                                </div>

                                                            </div>

                                                            {/* Add to Cart Button */}
                                                            <Button
                                                                size="sm"
                                                                onClick={() => addToCart(item)}
                                                                className="w-full h-8   text-white"
                                                            >
                                                                <IconPlus className="h-3 w-3 mr-1" />
                                                                Add to Cart
                                                            </Button>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>

                                        {/* No Items Found */}
                                        {filteredMenuItems.length === 0 && (
                                            <div className="text-center py-16">
                                                <IconCoffee className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                                                <h3 className="text-xl font-semibold mb-2">No items found</h3>
                                                <p className="text-muted-foreground">
                                                    {searchQuery ? "Try adjusting your search terms" : "No items available in this category"}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Cart Sidebar - Shopee Style */}
                                    {showCart && (
                                        <Card className="w-80 h-fit sticky top-6 ">
                                            <CardHeader>
                                                <CardTitle className="flex items-center justify-between ">
                                                    <span className="flex items-center gap-2">
                                                        <IconShoppingCart className="h-5 w-5" />
                                                        Your Cart
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setShowCart(false)}
                                                        
                                                    >
                                                        <IconX className="h-4 w-4" />
                                                    </Button>
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-4">
                                                {cart.length === 0 ? (
                                                    <div className="text-center py-8">
                                                        <IconShoppingCart className="mx-auto h-12 w-12 mb-4" />
                                                        <p className="text-muted-foreground">Your cart is empty</p>
                                                        <p className="text-sm text-muted-foreground">Add some delicious items!</p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="space-y-4 max-h-96 overflow-y-auto">
                                                            {cart.map((item) => (
                                                                <div key={item.menuItem.id} className="flex items-center gap-3 p-2 rounded-lg bg-orange-50">
                                                                    <div className="flex-1">
                                                                        <h4 className="font-medium text-sm">{item.menuItem.name}</h4>
                                                                        <p className="text-sm font-semibold">
                                                                            {formatPrice(item.menuItem.price)}
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() => updateCartQuantity(item.menuItem.id, item.quantity - 1)}
                                                                            className="h-6 w-6 p-0 "
                                                                        >
                                                                            <IconMinus className="h-3 w-3" />
                                                                        </Button>
                                                                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() => updateCartQuantity(item.menuItem.id, item.quantity + 1)}
                                                                            className="h-6 w-6 p-0 "
                                                                        >
                                                                            <IconPlus className="h-3 w-3" />
                                                                        </Button>
                                                                    </div>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        onClick={() => removeFromCart(item.menuItem.id)}
                                                                        className="h-6 w-6 p-0 "
                                                                    >
                                                                        <IconX className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        <Separator className="my-4" />

                                                        <div className="space-y-3">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-sm text-muted-foreground">Subtotal:</span>
                                                                <span className="font-medium">{formatPrice(getTotalPrice())}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-lg font-bold ">
                                                                <span>Total:</span>
                                                                <span>{formatPrice(getTotalPrice())}</span>
                                                            </div>
                                                            <CheckoutDialog
                                                                cart={cart}
                                                                totalPrice={getTotalPrice()}
                                                                totalItems={getTotalItems()}
                                                                onSuccess={() => {
                                                                    // Clear cart after successful order
                                                                    setCart([])
                                                                    toast.success("Order placed successfully!")
                                                                }}
                                                                onClose={() => {
                                                                    // Optional: handle dialog close
                                                                }}
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </ProtectedRoute>
    )
}

export default Page
