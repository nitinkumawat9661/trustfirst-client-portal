export type TenantStatus = "ACTIVE" | "TRIAL" | "SUSPENDED" | "ARCHIVED";

export type TenantMembershipStatus = "ACTIVE" | "INVITED" | "SUSPENDED" | "REMOVED";

export type TenantBranding = {
  accentColor?: string;
  logoUrl?: string;
  primaryColor?: string;
};

export type TenantSettings = {
  locale?: string;
  timezone?: string;
};

export type TenantEntity = {
  id: string;
  branding: TenantBranding;
  name: string;
  primaryDomain: string | null;
  settings: TenantSettings;
  slug: string;
  status: TenantStatus;
};

export type TenantMembershipEntity = {
  id: string;
  roleId: string;
  roleKey: string;
  status: TenantMembershipStatus;
  tenant: TenantEntity;
  userId: string;
};

export type TenantInvitationEntity = {
  email: string;
  expiresAt: Date;
  id: string;
  roleId: string;
  status: string;
  tenantId: string;
};

export type TenantRequestContext = {
  activeTenant: TenantEntity;
  memberships: TenantMembershipEntity[];
};

