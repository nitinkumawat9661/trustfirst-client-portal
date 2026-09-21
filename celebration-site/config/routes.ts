export const routes = {
  home: "/",
  policies: "/policies",
  track: "/track",
  account: "/account",
  admin: "/admin",
  api: {
    orders: "/api/orders",
    tracking: "/api/track",
    trackingLookup: "/api/track/lookup",
    approvePacking: "/api/orders/approve",
    reportIssue: "/api/orders/issue",
    customerSignup: "/api/account/signup",
    customerLogin: "/api/account/login",
    customerLogout: "/api/account/logout",
    customerMe: "/api/account/me",
    customerOrders: "/api/account/orders",
    customerOrderApprove: (publicId: string) => `/api/account/orders/${encodeURIComponent(publicId)}/approve`,
    adminLogin: "/api/admin/login",
    adminLogout: "/api/admin/logout",
    adminOrders: "/api/admin/orders",
    packingVideoPresign: "/api/packing-video/presign",
    adminOrderStatus: (publicId: string) => `/api/admin/orders/${encodeURIComponent(publicId)}/status`,
    adminOrderShipping: (publicId: string) => `/api/admin/orders/${encodeURIComponent(publicId)}/shipping`,
    adminOrderPackingVideo: (publicId: string) => `/api/admin/orders/${encodeURIComponent(publicId)}/packing-video`
  }
} as const
