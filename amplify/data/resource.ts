import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
/*== BICAFE SCHEMA (Rút gọn) ==============================================
Schema cho hệ thống quản lý quán cà phê (Bicafe)
- Admin: Quản lý menu, đơn hàng, thống kê, kho, nhân viên
- User: Đặt món, theo dõi đơn hàng
=========================================================================*/

const schema = a.schema({
  // Người dùng với phân quyền ADMIN và USER
  UserProfile: a.model({
    userId: a.string().required(),
    email: a.string().required(),
    name: a.string().required(),
    phone: a.string(),
    role: a.enum(["ADMIN", "USER"]),
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
    orders: a.hasMany('Order', 'userId'),
  }).authorization(allow => [
    allow.owner(),
    allow.group("admins").to(["read", "update", "delete"])
  ]),

  // Danh mục món ăn
  Category: a.model({
    name: a.string().required(),
    description: a.string(),
    isActive: a.boolean().default(true),
    displayOrder: a.integer().default(0),
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
    menuItems: a.hasMany('MenuItem', 'categoryId'),
  }).authorization(allow => [
    allow.authenticated().to(["read", "create", "update", "delete"])
  ]),

  // Món ăn / đồ uống
  MenuItem: a.model({
    name: a.string().required(),
    description: a.string(),
    price: a.float().required(),
    categoryId: a.id().required(),
    category: a.belongsTo("Category", "categoryId"),
    imageUrl: a.string(),
    isAvailable: a.boolean().default(true),
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
    orderItems: a.hasMany('OrderItem', 'menuItemId'),
  }).authorization(allow => [
    allow.authenticated().to(["read", "create", "update", "delete"])
  ]),

  // Đơn hàng
  Order: a.model({
    orderNumber: a.string().required(),
    userId: a.string().required(),
    userProfile: a.belongsTo("UserProfile", "userId"),
    status: a.enum(["PENDING", "CONFIRMED", "PREPARING", "READY", "COMPLETED", "CANCELLED"]),
    totalAmount: a.float().required(),
    paymentStatus: a.enum(["PENDING", "PAID", "FAILED", "REFUNDED"]),
    paymentMethod: a.enum(["CASH", "CARD", "MOBILE_PAYMENT"]),
    orderType: a.enum(["DINE_IN", "TAKEAWAY", "DELIVERY"]),
    tableNumber: a.string(),
    customerName: a.string(),
    customerPhone: a.string(),
    notes: a.string(),
    estimatedCompletionTime: a.datetime(),
    completedAt: a.datetime(),
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
    orderItems: a.hasMany('OrderItem', 'orderId'),
  }).authorization(allow => [
    allow.authenticated().to(["read", "create"]),
    allow.owner().to(["read", "update"]),
    allow.group("admins").to(["read", "update", "delete"])
  ]),

  // Món trong đơn hàng
  OrderItem: a.model({
    orderId: a.id().required(),
    order: a.belongsTo("Order", "orderId"),
    menuItemId: a.id().required(),
    menuItem: a.belongsTo("MenuItem", "menuItemId"),
    quantity: a.integer().required(),
    unitPrice: a.float().required(),
    totalPrice: a.float().required(),
    customizations: a.string(),
    createdAt: a.datetime(),
  }).authorization(allow => [
    allow.authenticated().to(["read", "create"]),
    allow.owner().to(["read", "update"]),
    allow.group("admins").to(["read", "update", "delete"])
  ]),

  // Thống kê doanh thu theo ngày
  DailySales: a.model({
    date: a.date().required(),
    totalOrders: a.integer().default(0),
    totalRevenue: a.float().default(0),
    totalItems: a.integer().default(0),
    averageOrderValue: a.float().default(0),
    paymentMethodBreakdown: a.string(),
    statusBreakdown: a.string(),
    topSellingItems: a.string(),
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
  }).authorization(allow => [
    allow.group("admins").to(["create", "read", "update", "delete"])
  ]),

  // Thống kê doanh thu theo tháng
  MonthlySales: a.model({
    year: a.integer().required(),
    month: a.integer().required(),
    totalOrders: a.integer().default(0),
    totalRevenue: a.float().default(0),
    totalItems: a.integer().default(0),
    averageOrderValue: a.float().default(0),
    growthRate: a.float(),
    topCategories: a.string(),
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
  }).authorization(allow => [
    allow.group("admins").to(["create", "read", "update", "delete"])
  ]),

  // Quản lý tồn kho
  Inventory: a.model({
    itemName: a.string().required(),
    currentStock: a.integer().required(),
    minStockLevel: a.integer().default(10),
    maxStockLevel: a.integer().default(100),
    unit: a.string().required(),
    costPerUnit: a.float(),
    supplier: a.string(),
    lastRestocked: a.datetime(),
    expiryDate: a.datetime(),
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
  }).authorization(allow => [
    allow.group("admins").to(["create", "read", "update", "delete"])
  ]),

  // Quản lý nhân viên (KHÔNG có phân chức vụ)
  Staff: a.model({
    employeeId: a.string().required(),
    name: a.string().required(),
    email: a.string().required(),
    phone: a.string(),
    shiftSchedule: a.string(),
    hourlyRate: a.float(),
    hireDate: a.date(),
    isActive: a.boolean().default(true),
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
  }).authorization(allow => [
    allow.group("admins").to(["create", "read", "update", "delete"])
  ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
