import {
  Boxes,
  ChartNoAxesCombined,
  IndianRupee,
  ListOrdered,
  ClipboardList,
  FileCheck2,
  LayoutDashboard,
  PackageOpen,
  Settings,
  ShoppingCart,
  Truck,
  UsersRound,
} from "lucide-react";

export const adminNavigation = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard", permission: "hardware.inventory.read" },
  { href: "/admin/hardware/products", icon: PackageOpen, label: "Products", permission: "hardware.catalog.read" },
  { href: "/admin/hardware/inventory", icon: Boxes, label: "Inventory", permission: "hardware.inventory.read" },
  { href: "/admin/hardware/purchases", icon: Truck, label: "Purchases", permission: "hardware.purchase.read" },
  { href: "/admin/hardware/sales", icon: ShoppingCart, label: "Sales / Billing", permission: "hardware.sales.read" },
  { href: "/admin/hardware/quotations", icon: FileCheck2, label: "Quotations", permission: "hardware.sales.read" },
  { href: "/admin/hardware/suppliers", icon: ClipboardList, label: "Suppliers", permission: "hardware.purchase.read" },
  { href: "/admin/hardware/customers", icon: UsersRound, label: "Customers", permission: "hardware.sales.read" },
  { href: "/admin/hardware/outstanding", icon: IndianRupee, label: "Outstanding", permission: "billing.read" },
  { href: "/admin/hardware/ledger", icon: ListOrdered, label: "Ledger", permission: "billing.read" },
  { href: "/admin/hardware/reports", icon: ChartNoAxesCombined, label: "Reports", permission: "hardware.sales.read" },
  { href: "/admin/settings", icon: Settings, label: "Settings", permission: "hardware.settings.read" },
] as const;

export function permittedAdminNavigation(permissions: readonly string[]) {
  if (permissions.includes("*")) return adminNavigation;
  return adminNavigation.filter((item) => permissions.includes(item.permission));
}
