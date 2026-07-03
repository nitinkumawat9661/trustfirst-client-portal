import {
  Bell,
  Building2,
  CreditCard,
  FileStack,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  PackageSearch,
  Search,
  Settings,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

export const adminNavigation = [
  {
    href: "/admin",
    label: "Dashboard",
    description: "Admin overview foundation",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/settings",
    label: "Settings",
    description: "Tenant and platform settings shell",
    icon: Settings,
  },
  {
    href: "/admin/documents",
    label: "Documents",
    description: "Commercial document engine",
    icon: FileStack,
  },
  {
    href: "/admin/requirements/intake",
    label: "Requirement intake",
    description: "Public submission queue",
    icon: FileText,
  },
  {
    href: "/admin/billing",
    label: "Billing",
    description: "Invoice and payment foundation",
    icon: CreditCard,
  },
  {
    href: "/admin/plugins/hardware-erp",
    label: "Hardware ERP",
    description: "Plugin foundation",
    icon: PackageSearch,
  },
  {
    href: "/admin/hardware/demo",
    label: "Hardware demo QA",
    description: "Demo readiness checklist",
    icon: ShieldCheck,
  },
  {
    href: "/admin/release-checklist",
    label: "Release checklist",
    description: "Preview deployment gate",
    icon: FileText,
  },
  {
    href: "/client",
    label: "Client shell",
    description: "Preview client-facing workspace",
    icon: UsersRound,
  },
] as const;

export const adminQuickActions = [
  {
    label: "Search clients",
    description: "Open global search UI",
    icon: Search,
  },
  {
    label: "Review notifications",
    description: "Open notification center",
    icon: Bell,
  },
  {
    label: "Security settings",
    description: "Open future security controls",
    icon: ShieldCheck,
  },
  {
    label: "Documentation",
    description: "Open future admin documentation",
    icon: FileText,
  },
  {
    label: "Tenant profile",
    description: "Open future tenant profile",
    icon: Building2,
  },
  {
    label: "Support",
    description: "Open future support workspace",
    icon: LifeBuoy,
  },
] as const;
