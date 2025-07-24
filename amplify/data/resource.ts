import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  UserProfile: a
    .model({
      userId: a.string().required(),
      email: a.string().required(),
      name: a.string().required(),
      phone: a.string(),
      role: a.enum(["ADMIN", "USER"]),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
      orders: a.hasMany("Order", "userId"),
    })
    .authorization((allow) => [
      allow.ownerDefinedIn("userId"),
      allow.groups(["ADMIN"]).to(["read", "update", "delete", "create"]),
    ]),

  Category: a
    .model({
      name: a.string().required(),
      description: a.string(),
      isActive: a.boolean().default(true),
      displayOrder: a.integer().default(0),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
      menuItems: a.hasMany("MenuItem", "categoryId"),
    })
    .authorization((allow) => [
      allow.authenticated().to(["read"]),
      allow.groups(["ADMIN"]).to(["create", "update", "delete"]),
    ]),

  MenuItem: a
    .model({
      name: a.string().required(),
      description: a.string(),
      price: a.float().required(),
      categoryId: a.id().required(),
      category: a.belongsTo("Category", "categoryId"),
      imageUrl: a.string(),
      isAvailable: a.boolean().default(true),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
      orderItems: a.hasMany("OrderItem", "menuItemId"),
    })
    .authorization((allow) => [
      allow.authenticated().to(["read"]),
      allow.groups(["ADMIN"]).to(["create", "update", "delete"]),
    ]),

  Order: a
    .model({
      orderNumber: a.string().required(),
      userId: a.string().required(),
      userProfile: a.belongsTo("UserProfile", "userId"),
      status: a.enum(["PENDING", "DONE"]),
      totalAmount: a.float().required(),
      floor: a.string(),
      customerName: a.string(),
      customerPhone: a.string(),
      notes: a.string(),
      estimatedCompletionTime: a.datetime(),
      completedAt: a.datetime(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
      orderItems: a.hasMany("OrderItem", "orderId"),
    })
    .authorization((allow) => [
      allow.ownerDefinedIn("userId").to(["read", "create"]),
      allow.groups(["USER"]).to(["read", "create"]),
      allow.groups(["ADMIN"]).to(["read", "update", "delete", "create"]),
    ]),

  OrderItem: a
    .model({
      orderId: a.id().required(),
      order: a.belongsTo("Order", "orderId"),
      menuItemId: a.id().required(),
      menuItem: a.belongsTo("MenuItem", "menuItemId"),
      quantity: a.integer().required(),
      unitPrice: a.float().required(),
      totalPrice: a.float().required(),
      customizations: a.string(),
      createdAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.authenticated().to(["read", "create"]),
      allow.groups(["ADMIN"]).to(["read", "update", "delete", "create"]),
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
