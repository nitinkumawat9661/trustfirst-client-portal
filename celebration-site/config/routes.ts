export const routes = {
  home: "/",
  policies: "/policies",
  track: "/track",
  admin: "/admin",
  api: {
    orders: "/api/orders",
    tracking: "/api/track",
    trackingLookup: "/api/track/lookup",
    approvePacking: "/api/orders/approve",
    reportIssue: "/api/orders/issue",
    adminLogin: "/api/admin/login",
    adminLogout: "/api/admin/logout",
    adminOrders: "/api/admin/orders",
    packingVideoPresign: "/api/packing-video/presign",
    adminOrderStatus: (publicId: string) => `/api/admin/orders/${encodeURIComponent(publicId)}/status`,
    adminOrderShipping: (publicId: string) => `/api/admin/orders/${encodeURIComponent(publicId)}/shipping`,
    adminOrderPackingVideo: (publicId: string) => `/api/admin/orders/${encodeURIComponent(publicId)}/packing-video`
  }
} as const
