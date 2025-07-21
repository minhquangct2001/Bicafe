"use client"

import * as React from "react"
import { generateClient } from "aws-amplify/data"
import { type Schema } from "@/amplify/data/resource"
import { AppSidebar } from '@/components/app-sidebar'
import { ProtectedRoute } from '@/components/protected-route'
import { SiteHeader } from '@/components/site-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  IconUser,
  IconMail,
  IconPhone,
  IconCalendar,
  IconSettings,
  IconEdit,
  IconShield,
  IconCreditCard,
  IconBell,
  IconKey,
  IconHistory,
  IconLoader2
} from "@tabler/icons-react"
import { useAuthStore } from "@/lib/auth-store"
import { toast } from "sonner"

const client = generateClient<Schema>()

type UserProfile = Schema["UserProfile"]["type"]

const AccountPage = () => {
  const { user } = useAuthStore()
  const [isEditing, setIsEditing] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null)
  const [orderStats, setOrderStats] = React.useState({
    totalOrders: 0,
    totalSpent: 0,
    favoriteItems: 0,
    memberLevel: "Bronze"
  })
  const [userInfo, setUserInfo] = React.useState({
    name: "",
    email: user?.signInDetails?.loginId || "",
    phone: "",
    role: "USER" as "ADMIN" | "USER",
    joinDate: "Unknown",
    avatar: "/avatars/user.jpg"
  })

  // Fetch user's order statistics
  const fetchOrderStats = React.useCallback(async () => {
    if (!user?.userId) return

    try {
      console.log("Fetching order statistics for:", user.userId)
      
      // Fetch user's orders
      const { data: orders } = await client.models.Order.list({
        filter: { userId: { eq: user.userId } }
      })

      if (orders) {
        const totalOrders = orders.length
        const completedOrders = orders.filter(order => order.status === 'COMPLETED')
        const totalSpent = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0)
        
        // Determine member level based on total spent
        let memberLevel = "Bronze"
        if (totalSpent >= 5000000) memberLevel = "Platinum" // 5M VND
        else if (totalSpent >= 2000000) memberLevel = "Gold" // 2M VND  
        else if (totalSpent >= 500000) memberLevel = "Silver" // 500k VND

        setOrderStats({
          totalOrders,
          totalSpent,
          favoriteItems: Math.min(totalOrders, 8), // Mock favorite items
          memberLevel
        })

        console.log("Order statistics:", { totalOrders, totalSpent, memberLevel })
      }
    } catch (error) {
      console.error("Error fetching order statistics:", error)
    }
  }, [user?.userId])

  // Fetch user profile from database
  const fetchUserProfile = React.useCallback(async () => {
    if (!user?.userId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      console.log("Fetching user profile for:", user.userId)

      // Try to get existing user profile
      const { data: profiles } = await client.models.UserProfile.list({
        filter: { userId: { eq: user.userId } }
      })

      if (profiles && profiles.length > 0) {
        const profile = profiles[0]
        setUserProfile(profile)
        setUserInfo({
          name: profile.name || "",
          email: profile.email || user?.signInDetails?.loginId || "",
          phone: profile.phone || "",
          role: (profile.role as "ADMIN" | "USER") || "USER",
          joinDate: profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long' 
          }) : "Unknown",
          avatar: "/avatars/user.jpg"
        })
        console.log("User profile found:", profile)
      } else {
        // Create new user profile if doesn't exist
        console.log("No user profile found, creating new one")
        const { data: newProfile, errors } = await client.models.UserProfile.create({
          userId: user.userId,
          email: user?.signInDetails?.loginId || "",
          name: user?.signInDetails?.loginId?.split('@')[0] || "User",
          role: "USER"
        })

        if (errors) {
          console.error("Error creating user profile:", errors)
          toast.error("Failed to create user profile")
        } else if (newProfile) {
          setUserProfile(newProfile)
          setUserInfo({
            name: newProfile.name || "",
            email: newProfile.email || "",
            phone: newProfile.phone || "",
            role: (newProfile.role as "ADMIN" | "USER") || "USER",
            joinDate: newProfile.createdAt ? new Date(newProfile.createdAt).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long' 
            }) : "Unknown",
            avatar: "/avatars/user.jpg"
          })
          console.log("New user profile created:", newProfile)
        }
      }
    } catch (error) {
      console.error("Error fetching user profile:", error)
      toast.error("Failed to load user profile")
    } finally {
      setLoading(false)
    }
  }, [user?.userId, user?.signInDetails?.loginId])

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!userProfile || !user?.userId) {
      toast.error("No user profile to update")
      return
    }

    // Validation
    if (!userInfo.name.trim()) {
      toast.error("Full name is required")
      return
    }

    if (userInfo.phone && !/^[\+]?[0-9\s\-\(\)]*$/.test(userInfo.phone)) {
      toast.error("Please enter a valid phone number")
      return
    }

    try {
      setSaving(true)
      console.log("Saving user profile:", userInfo)

      const { data: updatedProfile, errors } = await client.models.UserProfile.update({
        id: userProfile.id,
        name: userInfo.name.trim(),
        phone: userInfo.phone.trim() || null,
        role: userInfo.role,
        email: userInfo.email.trim(),
      })

      if (errors) {
        console.error("Error updating user profile:", errors)
        const errorMessage = errors[0]?.message || 'Unknown error'
        if (errorMessage.includes('authorization') || errorMessage.includes('unauthorized')) {
          toast.error("You don't have permission to update this profile")
        } else if (errorMessage.includes('validation')) {
          toast.error("Invalid data provided. Please check your inputs.")
        } else {
          toast.error(`Failed to update profile: ${errorMessage}`)
        }
        return
      }

      if (updatedProfile) {
        setUserProfile(updatedProfile)
        setIsEditing(false)
        toast.success("Profile updated successfully!")
        console.log("Profile updated successfully:", updatedProfile)
        
        // Refresh order stats in case role changed
        fetchOrderStats()
      }
    } catch (error) {
      console.error("Exception during profile update:", error)
      if (error instanceof Error) {
        if (error.message.includes('Network')) {
          toast.error("Network error. Please check your connection and try again.")
        } else if (error.message.includes('authorization')) {
          toast.error("You don't have permission to perform this action.")
        } else {
          toast.error(`Failed to update profile: ${error.message}`)
        }
      } else {
        toast.error("Failed to update profile. Please try again.")
      }
    } finally {
      setSaving(false)
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  React.useEffect(() => {
    fetchUserProfile()
    fetchOrderStats()
  }, [fetchUserProfile, fetchOrderStats])

  if (loading) {
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
            <div className="flex flex-1 flex-col items-center justify-center">
              <div className="flex items-center gap-2">
                <IconLoader2 className="h-6 w-6 animate-spin" />
                <span>Loading profile...</span>
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </ProtectedRoute>
    )
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
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold">Account Settings</h1>
                    <p className="text-muted-foreground">
                      Manage your account information and preferences
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        fetchUserProfile()
                        fetchOrderStats()
                        toast.success("Profile refreshed!")
                      }}
                      disabled={loading}
                    >
                      <IconLoader2 className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {/* Profile Information Card */}
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <IconUser className="h-5 w-5" />
                            Profile Information
                          </CardTitle>
                          <CardDescription>
                            Update your personal details and contact information
                          </CardDescription>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditing(!isEditing)}
                        >
                          <IconEdit className="h-4 w-4 mr-2" />
                          {isEditing ? "Cancel" : "Edit"}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Avatar Section */}
                      <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20">
                          <AvatarImage src={userInfo.avatar} alt={userInfo.name} />
                          <AvatarFallback className="text-lg">
                            {getInitials(userInfo.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <h3 className="text-lg font-semibold">{userInfo.name || "User"}</h3>
                          <Badge variant="secondary" className="text-xs">
                            <IconShield className="h-3 w-3 mr-1" />
                            {userInfo.role === "ADMIN" ? "Administrator" : "User"}
                          </Badge>
                          <p className="text-sm text-muted-foreground">
                            Member since {userInfo.joinDate}
                          </p>
                        </div>
                      </div>

                      <Separator />

                      {/* Form Fields */}
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name *</Label>
                          <Input
                            id="name"
                            value={userInfo.name}
                            onChange={(e) => setUserInfo(prev => ({ ...prev, name: e.target.value }))}
                            disabled={!isEditing}
                            placeholder="Enter your full name"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            id="email"
                            type="email"
                            value={userInfo.email}
                            disabled
                            className="bg-muted"
                            title="Email cannot be changed"
                          />
                          <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input
                            id="phone"
                            value={userInfo.phone}
                            onChange={(e) => setUserInfo(prev => ({ ...prev, phone: e.target.value }))}
                            disabled={!isEditing}
                            placeholder="Enter your phone number (e.g., +84 123 456 789)"
                          />
                          {isEditing && (
                            <p className="text-xs text-muted-foreground">
                              Optional: Used for order notifications and contact
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="role">Role</Label>
                          {isEditing ? (
                            <>
                              <Select 
                                value={userInfo.role} 
                                onValueChange={(value: "ADMIN" | "USER") => 
                                  setUserInfo(prev => ({ ...prev, role: value }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="USER">
                                    <div className="flex items-center gap-2">
                                      <IconUser className="h-4 w-4" />
                                      <span>User</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="ADMIN">
                                    <div className="flex items-center gap-2">
                                      <IconShield className="h-4 w-4" />
                                      <span>Admin</span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">
                                Admin role provides access to management features
                              </p>
                            </>
                          ) : (
                            <Input
                              id="role"
                              value={userInfo.role === "ADMIN" ? "Admin" : "User"}
                              disabled
                              className="bg-muted"
                            />
                          )}
                        </div>
                      </div>

                      {isEditing && (
                        <div className="flex gap-2 pt-4">
                          <Button 
                            onClick={handleSaveProfile}
                            disabled={saving || !userInfo.name.trim()}
                          >
                            {saving ? (
                              <>
                                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              "Save Changes"
                            )}
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setIsEditing(false)
                              // Reset form to original values
                              fetchUserProfile()
                            }}
                            disabled={saving}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Quick Stats Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <IconHistory className="h-5 w-5" />
                        Account Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Total Orders</span>
                          <Badge variant="outline">{orderStats.totalOrders}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Total Spent</span>
                          <Badge variant="outline">
                            {new Intl.NumberFormat('vi-VN', {
                              style: 'currency',
                              currency: 'VND'
                            }).format(orderStats.totalSpent)}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Favorite Items</span>
                          <Badge variant="outline">{orderStats.favoriteItems}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Member Level</span>
                          <Badge className={`${
                            orderStats.memberLevel === "Platinum" ? "bg-gradient-to-r from-gray-400 to-gray-600" :
                            orderStats.memberLevel === "Gold" ? "bg-gradient-to-r from-amber-500 to-orange-500" :
                            orderStats.memberLevel === "Silver" ? "bg-gradient-to-r from-gray-300 to-gray-500" :
                            "bg-gradient-to-r from-amber-700 to-amber-900"
                          }`}>
                            {orderStats.memberLevel}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Security Settings Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <IconKey className="h-5 w-5" />
                        Security
                      </CardTitle>
                      <CardDescription>
                        Manage your account security settings
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button variant="outline" className="w-full justify-start">
                        <IconKey className="h-4 w-4 mr-2" />
                        Change Password
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <IconShield className="h-4 w-4 mr-2" />
                        Two-Factor Auth
                      </Button>
                      <div className="pt-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Last Login</span>
                          <span>Today, 2:30 PM</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Preferences Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <IconSettings className="h-5 w-5" />
                        Preferences
                      </CardTitle>
                      <CardDescription>
                        Customize your experience
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button variant="outline" className="w-full justify-start">
                        <IconBell className="h-4 w-4 mr-2" />
                        Notifications
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <IconMail className="h-4 w-4 mr-2" />
                        Email Settings
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <IconCreditCard className="h-4 w-4 mr-2" />
                        Payment Methods
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Contact Information Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <IconPhone className="h-5 w-5" />
                        Contact Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3">
                        <IconMail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{userInfo.email}</p>
                          <p className="text-xs text-muted-foreground">Primary email</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <IconPhone className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{userInfo.phone}</p>
                          <p className="text-xs text-muted-foreground">Mobile number</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <IconCalendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Member since</p>
                          <p className="text-xs text-muted-foreground">{userInfo.joinDate}</p>
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

export default AccountPage
